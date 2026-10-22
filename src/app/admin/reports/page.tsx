import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ColumnChart } from "@/components/admin/column-chart";
import { DataTable, FilterTabs } from "@/components/admin/list-controls";
import { buttonClasses } from "@/components/ui/button-classes";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { formatNaira } from "@/lib/pricing";
import { requireRole } from "@/server/auth/dal";
import { grossBookingSeries, marketplaceReport, parseRange, periodFor, REPORT_RANGES, topRoutes, topVendors, type Period } from "@/server/reports";

export const metadata: Metadata = { title: "Reports" };

const count = new Intl.NumberFormat("en-NG");

function percent(value: number | null): string {
  return value === null ? "No data" : `${(value * 100).toFixed(1)}%`;
}

function Stat({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="rounded-[20px] border border-navy/10 bg-white p-5">
      <p className="text-[13px] font-semibold text-navy/70">{label}</p>
      <p className="mt-2 text-[26px] font-semibold leading-none text-navy">{value}</p>
      {note && <p className="mt-2 text-[12px] text-navy/60">{note}</p>}
    </div>
  );
}

function tickLabel(start: string, bucket: Period["bucket"]): { tick: string; title: string } {
  const date = new Date(`${start}T00:00:00`);
  const day = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short" }).format(date);
  if (bucket === "month") {
    const month = new Intl.DateTimeFormat("en-NG", { month: "short", year: "2-digit" }).format(date);
    return { tick: month, title: new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" }).format(date) };
  }
  return { tick: day, title: bucket === "week" ? `Week of ${day}` : new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "numeric", month: "short" }).format(date) };
}

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireRole("admin");
  const range = parseRange((await searchParams).range);
  const period = periodFor(range);
  const [report, series, routes, vendors] = await Promise.all([marketplaceReport(period), grossBookingSeries(period), topRoutes(period), topVendors(period)]);
  const bucketName = { day: "day", week: "week", month: "month" }[period.bucket];

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Reports"
        description="How the marketplace is performing. Money is counted when payments are confirmed; Lagos time."
        action={
          <div className="flex flex-wrap gap-2">
            {(["payments", "payouts", "bookings"] as const).map((dataset) => (
              <a key={dataset} href={`/admin/reports/export/${dataset}?range=${range}`} className={buttonClasses("outline", "sm")} download>
                Export {dataset} (CSV)
              </a>
            ))}
          </div>
        }
      />
      <div className="mb-6">
        <FilterTabs base="/admin/reports" filters={REPORT_RANGES} active={range} query="" param="range" />
      </div>

      <section aria-labelledby="money-title" className="grid gap-4">
        <h2 id="money-title" className="sr-only">
          Money
        </h2>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
          <div className="rounded-[24px] bg-navy p-6 text-white">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/70">Gross booking value</p>
            <p className="mt-3 text-[clamp(40px,5vw,56px)] font-semibold leading-none">{formatNaira(report.grossKobo)}</p>
            <p className="mt-3 text-[14px] text-white/70">
              {count.format(report.paidBookings)} paid booking{report.paidBookings === 1 ? "" : "s"}, {REPORT_RANGES[range].label.toLowerCase()}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Platform revenue" value={formatNaira(report.revenueKobo)} note="Commission on payments not refunded" />
            <Stat label="Refunds" value={formatNaira(report.refundsKobo)} note="On payments made in this period" />
            <Stat label="Paid out to vendors" value={formatNaira(report.paidOutKobo)} note="Payouts sent in this period" />
            <Stat label="Owed to vendors now" value={formatNaira(report.outstandingKobo)} note="On hold, ready or being transferred" />
          </div>
        </div>
      </section>

      <Card className="mt-6">
        <CardHeader title={`Gross booking value by ${bucketName}`} description="Hover or tap a column for the amount and number of paid bookings." />
        <ColumnChart
          unit="naira"
          caption={`Gross booking value by ${bucketName}`}
          points={series.map((point) => {
            const { tick, title } = tickLabel(point.start, period.bucket);
            return {
              key: point.start,
              tick,
              title,
              value: point.grossKobo,
              valueLabel: formatNaira(point.grossKobo),
              detail: `${count.format(point.bookings)} paid booking${point.bookings === 1 ? "" : "s"}`,
            };
          })}
        />
      </Card>

      <section aria-labelledby="operations-title" className="mt-6 grid gap-4">
        <h2 id="operations-title" className="text-[19px] font-semibold text-navy">
          Operations
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Booking requests" value={count.format(report.requested)} />
          <Stat label="Cancellation rate" value={percent(report.cancellationRate)} note={`${count.format(report.cancelled)} cancelled`} />
          <Stat label="Declined or expired" value={count.format(report.declined)} />
          <Stat label="Completed deliveries" value={count.format(report.completed)} />
          <Stat label="Dispute rate" value={percent(report.disputeRate)} note={`${count.format(report.disputes)} opened, per completed delivery`} />
        </div>
      </section>

      <section aria-labelledby="network-title" className="mt-6 grid gap-4">
        <h2 id="network-title" className="text-[19px] font-semibold text-navy">
          Network today
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Verified vendors" value={count.format(report.verifiedVendors)} />
          <Stat label="Active trucks" value={count.format(report.activeTrucks)} />
          <Stat label="Active drivers" value={count.format(report.activeDrivers)} />
          <Stat
            label="Average rating"
            value={report.averageRating === null ? "No reviews" : `${report.averageRating.toFixed(1)} / 5`}
            note={`${count.format(report.ratingCount)} published review${report.ratingCount === 1 ? "" : "s"}`}
          />
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="routes-title" className="grid content-start gap-3">
          <h2 id="routes-title" className="text-[19px] font-semibold text-navy">
            Top routes
          </h2>
          <DataTable caption="Top routes by gross booking value" headers={["Route", "Bookings", "Value"]} compact>
            {routes.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-navy/70">
                  No paid bookings in this period.
                </td>
              </tr>
            ) : (
              routes.map((route) => (
                <tr key={`${route.originState}-${route.destinationState}`}>
                  <td className="px-4 py-3 font-semibold text-navy">
                    {route.originState} to {route.destinationState}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-navy/80">{count.format(route.bookings)}</td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums text-navy">{formatNaira(Number(route.grossKobo))}</td>
                </tr>
              ))
            )}
          </DataTable>
        </section>
        <section aria-labelledby="vendors-title" className="grid content-start gap-3">
          <h2 id="vendors-title" className="text-[19px] font-semibold text-navy">
            Top vendors
          </h2>
          <DataTable caption="Top vendors by gross booking value" headers={["Vendor", "Bookings", "Value"]} compact>
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-navy/70">
                  No paid bookings in this period.
                </td>
              </tr>
            ) : (
              vendors.map((vendor) => (
                <tr key={vendor.vendorId}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/vendors/${vendor.vendorId}`} className="font-semibold text-navy underline-offset-4 hover:underline">
                      {vendor.vendorName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-navy/80">{count.format(vendor.bookings)}</td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums text-navy">{formatNaira(Number(vendor.grossKobo))}</td>
                </tr>
              ))
            )}
          </DataTable>
        </section>
      </div>
    </>
  );
}
