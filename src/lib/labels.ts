export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const VERIFICATION_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "Submitted", tone: "info" },
  under_review: { label: "Under review", tone: "info" },
  info_required: { label: "Information required", tone: "warning" },
  verified: { label: "Verified", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};

export const TRUCK_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  pending_verification: { label: "Pending verification", tone: "info" },
  active: { label: "Active", tone: "success" },
  unavailable: { label: "Unavailable", tone: "neutral" },
  suspended: { label: "Suspended", tone: "danger" },
  expired_documentation: { label: "Documents expired", tone: "warning" },
  archived: { label: "Archived", tone: "neutral" },
};

export const DOCUMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pending review", tone: "info" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

export const VENDOR_CATEGORIES = [
  { value: "individual_owner", label: "Individual truck owner" },
  { value: "logistics_company", label: "Registered logistics company" },
  { value: "fleet_operator", label: "Fleet manager or authorised operator" },
] as const;

export const ID_DOCUMENT_TYPES = [
  { value: "nin", label: "National Identification Number (NIN)" },
  { value: "drivers_licence", label: "Driver's licence" },
  { value: "international_passport", label: "International passport" },
  { value: "voters_card", label: "Permanent voter's card" },
] as const;

export const VENDOR_DOCUMENT_TYPES = [
  { value: "government_id", label: "Government-issued ID", requiredFor: "all" },
  { value: "cac_certificate", label: "CAC certificate", requiredFor: "business" },
  { value: "proof_of_address", label: "Proof of business address", requiredFor: "none" },
  { value: "operating_authority", label: "Operating authority letter", requiredFor: "fleet_operator" },
] as const;

export const TRUCK_CATEGORIES = [
  { value: "light_duty", label: "Light-duty truck" },
  { value: "medium_duty", label: "Medium-duty truck" },
  { value: "heavy_duty", label: "Heavy-duty truck" },
  { value: "flatbed", label: "Flatbed truck" },
  { value: "box", label: "Enclosed box truck" },
  { value: "articulated", label: "Articulated truck" },
  { value: "tipper", label: "Tipper truck" },
  { value: "refrigerated", label: "Refrigerated truck" },
  { value: "low_loader", label: "Low-loader" },
  { value: "other", label: "Other approved type" },
] as const;

export const BODY_TYPES = [
  { value: "open", label: "Open body" },
  { value: "enclosed", label: "Enclosed" },
  { value: "flatbed", label: "Flatbed" },
  { value: "curtain_side", label: "Curtain side" },
  { value: "tanker", label: "Tanker" },
  { value: "refrigerated", label: "Refrigerated" },
  { value: "tipper", label: "Tipper" },
  { value: "low_bed", label: "Low bed" },
] as const;

export const TRUCK_DOCUMENT_TYPES = [
  { value: "vehicle_registration", label: "Vehicle registration", required: true, expires: false },
  { value: "proof_of_ownership", label: "Proof of ownership or lease", required: true, expires: false },
  { value: "vehicle_licence", label: "Vehicle licence", required: false, expires: true },
  { value: "roadworthiness", label: "Roadworthiness certificate", required: true, expires: true },
  { value: "insurance", label: "Insurance certificate", required: true, expires: true },
  { value: "other_permit", label: "Other permit", required: false, expires: true },
] as const;

export function labelFor(options: ReadonlyArray<{ value: string; label: string }>, value: string | null | undefined): string {
  return options.find((option) => option.value === value)?.label ?? (value ? value.replaceAll("_", " ") : "");
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return "";
  }
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function formatDateTime(value: Date | null | undefined): string {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(value);
}

export function formatKg(value: number): string {
  return `${new Intl.NumberFormat("en-NG").format(value)} kg`;
}

export const BOOKING_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending_vendor_acceptance: { label: "Awaiting vendor", tone: "info" },
  awaiting_payment: { label: "Awaiting payment", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "success" },
  pickup_scheduled: { label: "Pickup scheduled", tone: "success" },
  goods_collected: { label: "Goods collected", tone: "success" },
  in_transit: { label: "In transit", tone: "info" },
  delivery_attempted: { label: "Delivery attempted", tone: "warning" },
  delivered: { label: "Delivered", tone: "success" },
  completed: { label: "Completed", tone: "neutral" },
  rejected: { label: "Declined by vendor", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
  disputed: { label: "Disputed", tone: "danger" },
};

export const ROUTE_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Open for bookings", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const SHIPMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: "Looking for a truck", tone: "info" },
  booked: { label: "Booked", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function formatTransit(hours: number): string {
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return `${days} day${days === 1 ? "" : "s"}${rest ? ` ${rest} h` : ""}`;
}

export const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "info" },
  successful: { label: "Paid", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
  partially_refunded: { label: "Partly refunded", tone: "warning" },
};

export const PAYOUT_STATUS: Record<string, { label: string; tone: Tone }> = {
  on_hold: { label: "On hold", tone: "info" },
  eligible: { label: "Ready to pay", tone: "warning" },
  processing: { label: "Transfer in progress", tone: "info" },
  paid: { label: "Paid out", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const LICENCE_CLASSES = [
  { value: "C", label: "Class C: goods vehicles under 3 tonnes" },
  { value: "E", label: "Class E: heavy goods vehicles" },
  { value: "G", label: "Class G: articulated vehicles" },
] as const;

export const DRIVER_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "success" },
  inactive: { label: "Inactive", tone: "neutral" },
};

export const DELIVERY_EVENT: Record<string, { label: string; tone: Tone }> = {
  driver_assigned: { label: "Driver assigned", tone: "info" },
  arrived_at_pickup: { label: "Arrived at pickup", tone: "info" },
  goods_collected: { label: "Goods collected", tone: "success" },
  departed: { label: "On the road", tone: "info" },
  arrived_at_destination: { label: "Arrived at destination", tone: "info" },
  delivery_attempted: { label: "Delivery attempted", tone: "warning" },
  delivered: { label: "Delivered", tone: "success" },
  incident_reported: { label: "Incident reported", tone: "danger" },
  receipt_confirmed: { label: "Receipt confirmed", tone: "success" },
};

export const DISPUTE_CATEGORIES = [
  { value: "non_delivery", label: "Goods not delivered" },
  { value: "late_delivery", label: "Late delivery" },
  { value: "damaged_goods", label: "Damaged goods" },
  { value: "missing_goods", label: "Missing goods" },
  { value: "unexpected_charges", label: "Unexpected charges" },
  { value: "incorrect_details", label: "Incorrect booking details" },
  { value: "cancellation", label: "Cancellation" },
  { value: "payment_or_refund", label: "Payment or refund" },
  { value: "other", label: "Something else" },
] as const;

export const DISPUTE_STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "warning" },
  under_review: { label: "Under review", tone: "info" },
  awaiting_information: { label: "Awaiting information", tone: "warning" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

export const REVIEW_STATUS: Record<string, { label: string; tone: Tone }> = {
  published: { label: "Published", tone: "success" },
  hidden: { label: "Hidden", tone: "neutral" },
};

export const DELIVERY_ACTIONS: Record<string, { label: string; hint: string }> = {
  arrived_at_pickup: { label: "Arrived at pickup", hint: "The truck is at the pickup address." },
  goods_collected: { label: "Goods collected", hint: "Everything is loaded. Add a photo of the loaded cargo if you can." },
  departed: { label: "Departed for destination", hint: "The truck has left with the goods." },
  arrived_at_destination: { label: "Arrived at destination", hint: "The truck is at the delivery address." },
  delivery_attempted: { label: "Could not deliver", hint: "Explain why, for example the receiver was not available." },
  delivered: { label: "Delivered", hint: "Record who received the goods. A photo is strong proof of delivery." },
  incident_reported: { label: "Report an incident", hint: "Delays, breakdowns, accidents or anything the shipper should know." },
};
