import "server-only";
import { and, asc, eq, gte, isNull, sql } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { db, schema } from "@/server/db";
import type { RouteLane } from "@/lib/pricing";
import { getPlatformSettings } from "@/server/settings";

export type LaneRates = { minShipmentKg: number; lanes: RouteLane[] };

const MAX_OFFERS = 1000;

export async function openLaneRates(today: string): Promise<LaneRates> {
  "use cache";
  cacheLife("minutes");

  const { minShipmentKg } = await getPlatformSettings();
  const remainingKg = sql<number>`${schema.routes.capacityKg} - ${schema.routes.reservedKg}`;
  const rows = await db()
    .select({
      origin: schema.routes.originState,
      destination: schema.routes.destinationState,
      ratePerKgKobo: schema.routes.ratePerKgKobo,
      minimumChargeKobo: schema.routes.minimumChargeKobo,
      remainingKg,
    })
    .from(schema.routes)
    .innerJoin(schema.trucks, eq(schema.trucks.id, schema.routes.truckId))
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.routes.vendorId))
    .where(
      and(
        eq(schema.routes.status, "active"),
        eq(schema.routes.allowsShared, true),
        gte(schema.routes.departureDate, today),
        gte(remainingKg, minShipmentKg),
        eq(schema.trucks.listingStatus, "active"),
        isNull(schema.trucks.archivedAt),
        eq(schema.vendorProfiles.verificationStatus, "verified"),
      ),
    )
    .orderBy(asc(schema.routes.originState), asc(schema.routes.destinationState), asc(schema.routes.ratePerKgKobo))
    .limit(MAX_OFFERS);

  const lanes = new Map<string, RouteLane>();
  for (const row of rows) {
    const key = `${row.origin}|${row.destination}`;
    const lane = lanes.get(key) ?? { origin: row.origin, destination: row.destination, offers: [] };
    lane.offers.push({ ratePerKgKobo: row.ratePerKgKobo, minimumChargeKobo: row.minimumChargeKobo, remainingKg: Number(row.remainingKg) });
    lanes.set(key, lane);
  }
  return { minShipmentKg, lanes: [...lanes.values()] };
}
