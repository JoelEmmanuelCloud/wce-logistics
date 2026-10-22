import "server-only";
import { and, desc, eq, gte, inArray, lt, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { addDays, lagosToday } from "@/lib/dates";
import { koboToNaira, type CsvValue } from "@/lib/csv";
import { db, schema } from "@/server/db";

export const REPORT_RANGES = {
  "7d": { label: "Last 7 days" },
  "30d": { label: "Last 30 days" },
  "90d": { label: "Last 90 days" },
  month: { label: "This month" },
  year: { label: "This year" },
  all: { label: "All time" },
} as const;

export type ReportRange = keyof typeof REPORT_RANGES;

export type Period = { range: ReportRange; from: Date | null; to: Date; bucket: "day" | "week" | "month"; fromDate: string | null; toDate: string };

function lagosMidnight(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00+01:00`);
}

export function parseRange(value: string | string[] | undefined): ReportRange {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && candidate in REPORT_RANGES ? (candidate as ReportRange) : "30d";
}

export function periodFor(range: ReportRange, now = Date.now()): Period {
  const today = lagosToday(now);
  const to = new Date(now);
  const start = {
    "7d": addDays(today, -6),
    "30d": addDays(today, -29),
    "90d": addDays(today, -89),
    month: `${today.slice(0, 8)}01`,
    year: `${today.slice(0, 5)}01-01`,
    all: null,
  }[range];
  const bucket = range === "7d" || range === "30d" || range === "month" ? "day" : range === "90d" ? "week" : "month";
  return { range, from: start ? lagosMidnight(start) : null, to, bucket, fromDate: start, toDate: today };
}

function within(column: AnyPgColumn, period: Period): SQL | undefined {
  return period.from ? and(gte(column, period.from), lt(column, period.to)) : lt(column, period.to);
}

const PAID_STATUSES = ["successful", "partially_refunded", "refunded"] as const;
const OUTSTANDING_PAYOUTS = ["on_hold", "eligible", "processing"] as const;
const num = (value: unknown) => Number(value ?? 0);

export async function marketplaceReport(period: Period) {
  const database = db();
  const paidInPeriod = and(inArray(schema.payments.status, [...PAID_STATUSES]), within(schema.payments.paidAt, period));

  const [money, bookings, completed, disputes, outstanding, paidOut, snapshot, rating] = await Promise.all([
    database
      .select({
        gross: sql<string>`coalesce(sum(${schema.payments.amountKobo}), 0)`,
        revenue: sql<string>`coalesce(sum(${schema.payments.platformFeeKobo}) filter (where ${schema.payments.status} = 'successful'), 0)`,
        refunds: sql<string>`coalesce(sum(${schema.payments.refundedKobo}), 0)`,
        payments: sql<number>`count(*)::int`,
      })
      .from(schema.payments)
      .where(paidInPeriod),
    database
      .select({
        requested: sql<number>`count(*)::int`,
        cancelled: sql<number>`count(*) filter (where ${schema.bookings.status} = 'cancelled')::int`,
        declined: sql<number>`count(*) filter (where ${schema.bookings.status} in ('rejected', 'expired'))::int`,
      })
      .from(schema.bookings)
      .where(within(schema.bookings.createdAt, period)),
    database.select({ count: sql<number>`count(*)::int` }).from(schema.bookings).where(within(schema.bookings.completedAt, period)),
    database.select({ count: sql<number>`count(*)::int` }).from(schema.disputes).where(within(schema.disputes.createdAt, period)),
    database
      .select({ total: sql<string>`coalesce(sum(${schema.payouts.amountKobo}), 0)` })
      .from(schema.payouts)
      .where(inArray(schema.payouts.status, [...OUTSTANDING_PAYOUTS])),
    database
      .select({ total: sql<string>`coalesce(sum(${schema.payouts.amountKobo}), 0)` })
      .from(schema.payouts)
      .where(and(eq(schema.payouts.status, "paid"), within(schema.payouts.paidAt, period))),
    database.execute<{ vendors: number; trucks: number; drivers: number }>(sql`
      select
        (select count(*)::int from vendor_profiles where verification_status = 'verified') as vendors,
        (select count(*)::int from trucks where listing_status = 'active' and archived_at is null) as trucks,
        (select count(*)::int from drivers where status = 'active') as drivers`),
    database
      .select({ average: sql<string | null>`avg(${schema.reviews.rating})`, count: sql<number>`count(*)::int` })
      .from(schema.reviews)
      .where(eq(schema.reviews.status, "published")),
  ]);

  const requested = bookings[0]?.requested ?? 0;
  const completedCount = completed[0]?.count ?? 0;
  const disputeCount = disputes[0]?.count ?? 0;
  return {
    grossKobo: num(money[0]?.gross),
    revenueKobo: num(money[0]?.revenue),
    refundsKobo: num(money[0]?.refunds),
    paidBookings: money[0]?.payments ?? 0,
    requested,
    cancelled: bookings[0]?.cancelled ?? 0,
    declined: bookings[0]?.declined ?? 0,
    cancellationRate: requested ? (bookings[0]?.cancelled ?? 0) / requested : null,
    completed: completedCount,
    disputes: disputeCount,
    disputeRate: completedCount ? disputeCount / completedCount : null,
    outstandingKobo: num(outstanding[0]?.total),
    paidOutKobo: num(paidOut[0]?.total),
    verifiedVendors: num(snapshot[0]?.vendors),
    activeTrucks: num(snapshot[0]?.trucks),
    activeDrivers: num(snapshot[0]?.drivers),
    averageRating: rating[0]?.average ? Math.round(Number(rating[0].average) * 10) / 10 : null,
    ratingCount: rating[0]?.count ?? 0,
  };
}

export type ReportPoint = { start: string; grossKobo: number; bookings: number };

export async function grossBookingSeries(period: Period): Promise<ReportPoint[]> {
  const unit = sql.raw(`'${period.bucket}'`);
  const step = sql.raw(`'1 ${period.bucket}'`);
  const lagos = sql.raw(`'Africa/Lagos'`);
  const fromExpression = period.from
    ? sql`date_trunc(${unit}, ${period.from.toISOString()}::timestamptz at time zone ${lagos})`
    : sql`coalesce(date_trunc(${unit}, (select min(paid_at) from payments where status in ('successful', 'partially_refunded', 'refunded')) at time zone ${lagos}), date_trunc(${unit}, now() at time zone ${lagos}))`;
  const rows = await db().execute<{ start: string; gross: string; bookings: number }>(sql`
    with buckets as (
      select generate_series(${fromExpression}, date_trunc(${unit}, ${period.to.toISOString()}::timestamptz at time zone ${lagos}), ${step}::interval) as start
    ),
    paid as (
      select date_trunc(${unit}, paid_at at time zone ${lagos}) as start, sum(amount_kobo) as gross, count(*) as bookings
      from payments
      where status in ('successful', 'partially_refunded', 'refunded') and paid_at < ${period.to.toISOString()}::timestamptz
      group by 1
    )
    select to_char(b.start, 'YYYY-MM-DD') as start, coalesce(p.gross, 0) as gross, coalesce(p.bookings, 0)::int as bookings
    from buckets b left join paid p on p.start = b.start
    order by b.start
    limit 400`);
  return rows.map((row) => ({ start: row.start, grossKobo: num(row.gross), bookings: num(row.bookings) }));
}

export async function topRoutes(period: Period) {
  return db()
    .select({
      originState: schema.shipments.originState,
      destinationState: schema.shipments.destinationState,
      bookings: sql<number>`count(*)::int`,
      grossKobo: sql<string>`sum(${schema.payments.amountKobo})`,
    })
    .from(schema.payments)
    .innerJoin(schema.bookings, eq(schema.bookings.id, schema.payments.bookingId))
    .innerJoin(schema.shipments, eq(schema.shipments.id, schema.bookings.shipmentId))
    .where(and(inArray(schema.payments.status, [...PAID_STATUSES]), within(schema.payments.paidAt, period)))
    .groupBy(schema.shipments.originState, schema.shipments.destinationState)
    .orderBy(desc(sql`sum(${schema.payments.amountKobo})`))
    .limit(5);
}

export async function topVendors(period: Period) {
  return db()
    .select({
      vendorId: schema.bookings.vendorId,
      vendorName: sql<string>`coalesce(${schema.vendorProfiles.businessName}, ${schema.vendorProfiles.legalName})`,
      bookings: sql<number>`count(*)::int`,
      grossKobo: sql<string>`sum(${schema.payments.amountKobo})`,
    })
    .from(schema.payments)
    .innerJoin(schema.bookings, eq(schema.bookings.id, schema.payments.bookingId))
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.bookings.vendorId))
    .where(and(inArray(schema.payments.status, [...PAID_STATUSES]), within(schema.payments.paidAt, period)))
    .groupBy(schema.bookings.vendorId, schema.vendorProfiles.businessName, schema.vendorProfiles.legalName)
    .orderBy(desc(sql`sum(${schema.payments.amountKobo})`))
    .limit(5);
}

export const EXPORT_DATASETS = ["payments", "payouts", "bookings"] as const;
export type ExportDataset = (typeof EXPORT_DATASETS)[number];

const EXPORT_LIMIT = 50_000;

function lagosTimestamp(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return new Date(value.getTime() + 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);
}

export async function exportRows(dataset: ExportDataset, period: Period): Promise<{ headers: string[]; rows: CsvValue[][] }> {
  const vendorName = sql<string>`coalesce(${schema.vendorProfiles.businessName}, ${schema.vendorProfiles.legalName})`;
  if (dataset === "payments") {
    const rows = await db()
      .select({ payment: schema.payments, bookingReference: schema.bookings.reference, vendorName })
      .from(schema.payments)
      .innerJoin(schema.bookings, eq(schema.bookings.id, schema.payments.bookingId))
      .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.bookings.vendorId))
      .where(and(inArray(schema.payments.status, [...PAID_STATUSES]), within(schema.payments.paidAt, period)))
      .orderBy(schema.payments.paidAt)
      .limit(EXPORT_LIMIT);
    return {
      headers: ["Paid at (Lagos)", "Booking", "Payment reference", "Vendor", "Method", "Channel", "Status", "Amount (NGN)", "Commission (NGN)", "Vendor share (NGN)", "Refunded (NGN)"],
      rows: rows.map(({ payment, bookingReference, vendorName: vendor }) => [
        lagosTimestamp(payment.paidAt),
        bookingReference,
        payment.reference,
        vendor,
        payment.provider,
        payment.channel,
        payment.status,
        koboToNaira(payment.amountKobo),
        koboToNaira(payment.platformFeeKobo),
        koboToNaira(payment.vendorPayableKobo),
        koboToNaira(payment.refundedKobo),
      ]),
    };
  }
  if (dataset === "payouts") {
    const rows = await db()
      .select({ payout: schema.payouts, bookingReference: schema.bookings.reference, vendorName })
      .from(schema.payouts)
      .innerJoin(schema.bookings, eq(schema.bookings.id, schema.payouts.bookingId))
      .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.payouts.vendorId))
      .where(within(schema.payouts.createdAt, period))
      .orderBy(schema.payouts.createdAt)
      .limit(EXPORT_LIMIT);
    return {
      headers: ["Created (Lagos)", "Booking", "Vendor", "Amount (NGN)", "Status", "Paid at (Lagos)", "Transfer reference", "Paid to"],
      rows: rows.map(({ payout, bookingReference, vendorName: vendor }) => [
        lagosTimestamp(payout.createdAt),
        bookingReference,
        vendor,
        koboToNaira(payout.amountKobo),
        payout.status,
        lagosTimestamp(payout.paidAt),
        payout.transferReference,
        payout.destination,
      ]),
    };
  }
  const rows = await db()
    .select({ booking: schema.bookings, shipment: schema.shipments, vendorName, customerName: schema.users.fullName })
    .from(schema.bookings)
    .innerJoin(schema.shipments, eq(schema.shipments.id, schema.bookings.shipmentId))
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.bookings.vendorId))
    .innerJoin(schema.users, eq(schema.users.id, schema.bookings.customerId))
    .where(within(schema.bookings.createdAt, period))
    .orderBy(schema.bookings.createdAt)
    .limit(EXPORT_LIMIT);
  return {
    headers: ["Requested (Lagos)", "Booking", "Status", "Shipper", "Vendor", "From", "To", "Cargo", "Weight (kg)", "Type", "Total (NGN)", "Completed (Lagos)"],
    rows: rows.map(({ booking, shipment, vendorName: vendor, customerName }) => [
      lagosTimestamp(booking.createdAt),
      booking.reference,
      booking.status,
      customerName,
      vendor,
      `${shipment.originCity}, ${shipment.originState}`,
      `${shipment.destinationCity}, ${shipment.destinationState}`,
      shipment.cargoType,
      shipment.weightKg,
      booking.type,
      koboToNaira(booking.totalKobo),
      lagosTimestamp(booking.completedAt),
    ]),
  };
}
