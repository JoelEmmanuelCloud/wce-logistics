import type { BookingStatus, DeliveryEventKind } from "@/server/db/schema";

export type DeliveryUpdateKind = Extract<
  DeliveryEventKind,
  "arrived_at_pickup" | "goods_collected" | "departed" | "arrived_at_destination" | "delivery_attempted" | "delivered" | "incident_reported"
>;

type Step = { from: readonly BookingStatus[]; to: BookingStatus | null; once: boolean };

const IN_PROGRESS: readonly BookingStatus[] = ["pickup_scheduled", "goods_collected", "in_transit", "delivery_attempted"];

export const DELIVERY_STEPS: Record<DeliveryUpdateKind, Step> = {
  arrived_at_pickup: { from: ["pickup_scheduled"], to: null, once: true },
  goods_collected: { from: ["pickup_scheduled"], to: "goods_collected", once: true },
  departed: { from: ["goods_collected"], to: "in_transit", once: true },
  arrived_at_destination: { from: ["in_transit"], to: null, once: true },
  delivery_attempted: { from: ["in_transit", "delivery_attempted"], to: "delivery_attempted", once: false },
  delivered: { from: ["in_transit", "delivery_attempted"], to: "delivered", once: true },
  incident_reported: { from: IN_PROGRESS, to: null, once: false },
};

export const DELIVERY_UPDATE_KINDS = Object.keys(DELIVERY_STEPS) as DeliveryUpdateKind[];

export const ASSIGNABLE_STATUSES: readonly BookingStatus[] = ["confirmed", "pickup_scheduled"];
export const DELIVERY_IN_PROGRESS = IN_PROGRESS;
export const AUTO_COMPLETE_HOURS = 72;
export const DISPUTE_WINDOW_DAYS = 14;
export const DISPUTABLE_STATUSES: readonly BookingStatus[] = [
  "confirmed",
  "pickup_scheduled",
  "goods_collected",
  "in_transit",
  "delivery_attempted",
  "delivered",
  "completed",
  "cancelled",
];

export function canRecord(kind: DeliveryUpdateKind, status: BookingStatus, recorded: readonly DeliveryEventKind[]): boolean {
  const step = DELIVERY_STEPS[kind];
  return step.from.includes(status) && !(step.once && recorded.includes(kind));
}

export function nextStatus(kind: DeliveryUpdateKind, status: BookingStatus): BookingStatus {
  return DELIVERY_STEPS[kind].to ?? status;
}

export function availableUpdates(status: BookingStatus, recorded: readonly DeliveryEventKind[]): DeliveryUpdateKind[] {
  return DELIVERY_UPDATE_KINDS.filter((kind) => canRecord(kind, status, recorded));
}

const LICENCE_COVERAGE: Record<string, readonly string[]> = {
  C: ["light_duty"],
  E: ["light_duty", "medium_duty", "heavy_duty", "flatbed", "box", "tipper", "refrigerated", "other"],
  G: ["light_duty", "medium_duty", "heavy_duty", "flatbed", "box", "tipper", "refrigerated", "other", "articulated", "low_loader"],
};

export function licenceCoversTruck(licenceClass: string, truckCategory: string): boolean {
  return LICENCE_COVERAGE[licenceClass]?.includes(truckCategory) ?? false;
}

export function withinDisputeWindow(status: BookingStatus, closedAt: Date | null, now = Date.now()): boolean {
  if (!DISPUTABLE_STATUSES.includes(status)) {
    return false;
  }
  if (status !== "completed" && status !== "cancelled") {
    return true;
  }
  return closedAt !== null && now - closedAt.getTime() <= DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}
