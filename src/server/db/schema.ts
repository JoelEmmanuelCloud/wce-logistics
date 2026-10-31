import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  inet,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["customer", "vendor", "driver", "admin"]);
export const userStatus = pgEnum("user_status", ["active", "suspended"]);
export const vendorCategory = pgEnum("vendor_category", ["individual_owner", "logistics_company", "fleet_operator"]);
export const verificationStatus = pgEnum("verification_status", [
  "draft",
  "submitted",
  "under_review",
  "info_required",
  "verified",
  "rejected",
  "suspended",
]);
export const idDocumentType = pgEnum("id_document_type", ["nin", "drivers_licence", "international_passport", "voters_card"]);
export const documentStatus = pgEnum("document_status", ["pending", "approved", "rejected"]);
export const vendorDocumentType = pgEnum("vendor_document_type", [
  "government_id",
  "cac_certificate",
  "proof_of_address",
  "operating_authority",
]);
export const truckCategory = pgEnum("truck_category", [
  "light_duty",
  "medium_duty",
  "heavy_duty",
  "flatbed",
  "box",
  "articulated",
  "tipper",
  "refrigerated",
  "low_loader",
  "other",
]);
export const cargoBodyType = pgEnum("cargo_body_type", [
  "open",
  "enclosed",
  "flatbed",
  "curtain_side",
  "tanker",
  "refrigerated",
  "tipper",
  "low_bed",
]);
export const truckDocumentType = pgEnum("truck_document_type", [
  "vehicle_registration",
  "proof_of_ownership",
  "vehicle_licence",
  "roadworthiness",
  "insurance",
  "other_permit",
]);
export const truckListingStatus = pgEnum("truck_listing_status", [
  "draft",
  "pending_verification",
  "active",
  "unavailable",
  "suspended",
  "expired_documentation",
  "archived",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    phone: text("phone"),
    fullName: text("full_name"),
    role: userRole("role"),
    status: userStatus("status").notNull().default("active"),
    lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_key").on(sql`lower(${table.email})`),
    index("users_phone_idx").on(table.phone),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    ipAddress: inet("ip_address"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_key").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
  ],
);

export const otpChallenges = pgTable(
  "otp_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    ipAddress: inet("ip_address"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("otp_challenges_email_created_idx").on(table.email, table.createdAt),
    index("otp_challenges_ip_created_idx").on(table.ipAddress, table.createdAt),
  ],
);

export const vendorProfiles = pgTable(
  "vendor_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    category: vendorCategory("category").notNull(),
    legalName: text("legal_name").notNull(),
    businessName: text("business_name"),
    email: text("email").notNull(),
    addressLine: text("address_line").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    operatingStates: text("operating_states").array().notNull(),
    idDocumentType: idDocumentType("id_document_type"),
    idDocumentReferenceEncrypted: text("id_document_reference_encrypted"),
    idDocumentReferenceLast4: text("id_document_reference_last4"),
    cacNumber: text("cac_number"),
    verificationStatus: verificationStatus("verification_status").notNull().default("draft"),
    reviewNote: text("review_note"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("vendor_profiles_user_id_key").on(table.userId),
    index("vendor_profiles_status_idx").on(table.verificationStatus, table.submittedAt),
    uniqueIndex("vendor_profiles_cac_number_key").on(sql`upper(${table.cacNumber})`),
  ],
);

export const vendorDocuments = pgTable(
  "vendor_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorProfiles.id, { onDelete: "cascade" }),
    type: vendorDocumentType("type").notNull(),
    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    status: documentStatus("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("vendor_documents_vendor_idx").on(table.vendorId, table.type)],
);

export const trucks = pgTable(
  "trucks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorProfiles.id, { onDelete: "restrict" }),
    registrationNumber: text("registration_number").notNull(),
    registrationNormalized: text("registration_normalized").notNull(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year"),
    category: truckCategory("category").notNull(),
    tyreCount: integer("tyre_count").notNull(),
    maxPayloadKg: integer("max_payload_kg").notNull(),
    bodyType: cargoBodyType("body_type").notNull(),
    bodyLengthM: numeric("body_length_m", { precision: 5, scale: 2 }),
    bodyWidthM: numeric("body_width_m", { precision: 5, scale: 2 }),
    bodyHeightM: numeric("body_height_m", { precision: 5, scale: 2 }),
    cargoTypes: text("cargo_types").array().notNull(),
    baseState: text("base_state").notNull(),
    baseCity: text("base_city").notNull(),
    listingStatus: truckListingStatus("listing_status").notNull().default("draft"),
    reviewNote: text("review_note"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("trucks_registration_active_key")
      .on(table.registrationNormalized)
      .where(sql`${table.archivedAt} is null`),
    index("trucks_vendor_idx").on(table.vendorId),
    index("trucks_status_idx").on(table.listingStatus, table.submittedAt),
    check("trucks_payload_positive", sql`${table.maxPayloadKg} > 0`),
    check("trucks_tyres_range", sql`${table.tyreCount} between 4 and 40`),
  ],
);

export const truckDocuments = pgTable(
  "truck_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    truckId: uuid("truck_id")
      .notNull()
      .references(() => trucks.id, { onDelete: "cascade" }),
    type: truckDocumentType("type").notNull(),
    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    issueDate: date("issue_date"),
    expiryDate: date("expiry_date"),
    status: documentStatus("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("truck_documents_truck_idx").on(table.truckId, table.type),
    index("truck_documents_expiry_idx").on(table.expiryDate),
  ],
);

export const truckPhotos = pgTable(
  "truck_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    truckId: uuid("truck_id")
      .notNull()
      .references(() => trucks.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("truck_photos_truck_idx").on(table.truckId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ipAddress: inet("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_idx").on(table.createdAt),
  ],
);

export const routeStatus = pgEnum("route_status", ["active", "paused", "completed", "cancelled"]);
export const shipmentStatus = pgEnum("shipment_status", ["open", "booked", "cancelled"]);
export const bookingType = pgEnum("booking_type", ["shared", "dedicated"]);
export const bookingStatus = pgEnum("booking_status", [
  "pending_vendor_acceptance",
  "awaiting_payment",
  "confirmed",
  "pickup_scheduled",
  "goods_collected",
  "in_transit",
  "delivery_attempted",
  "delivered",
  "completed",
  "rejected",
  "cancelled",
  "expired",
  "disputed",
]);

export const routes = pgTable(
  "routes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    truckId: uuid("truck_id")
      .notNull()
      .references(() => trucks.id, { onDelete: "restrict" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorProfiles.id, { onDelete: "restrict" }),
    originState: text("origin_state").notNull(),
    originCity: text("origin_city").notNull(),
    destinationState: text("destination_state").notNull(),
    destinationCity: text("destination_city").notNull(),
    departureDate: date("departure_date").notNull(),
    transitHours: integer("transit_hours").notNull(),
    capacityKg: integer("capacity_kg").notNull(),
    reservedKg: integer("reserved_kg").notNull().default(0),
    allowsShared: boolean("allows_shared").notNull().default(true),
    ratePerTonneKobo: integer("rate_per_tonne_kobo").notNull(),
    minimumChargeKobo: integer("minimum_charge_kobo").notNull().default(0),
    dedicatedPriceKobo: integer("dedicated_price_kobo"),
    loadingChargeKobo: integer("loading_charge_kobo").notNull().default(0),
    offloadingChargeKobo: integer("offloading_charge_kobo").notNull().default(0),
    tollChargeKobo: integer("toll_charge_kobo").notNull().default(0),
    status: routeStatus("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    index("routes_search_idx").on(table.originState, table.destinationState, table.departureDate, table.status),
    index("routes_truck_idx").on(table.truckId, table.departureDate),
    index("routes_vendor_idx").on(table.vendorId),
    check("routes_capacity_positive", sql`${table.capacityKg} > 0`),
    check("routes_reserved_within_capacity", sql`${table.reservedKg} between 0 and ${table.capacityKg}`),
    check("routes_rate_positive", sql`${table.ratePerTonneKobo} > 0`),
    check("routes_extra_charges_non_negative", sql`${table.loadingChargeKobo} >= 0 and ${table.offloadingChargeKobo} >= 0 and ${table.tollChargeKobo} >= 0`),
    check("routes_transit_positive", sql`${table.transitHours} between 1 and 240`),
  ],
);

export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    originState: text("origin_state").notNull(),
    originCity: text("origin_city").notNull(),
    originAddress: text("origin_address").notNull(),
    destinationState: text("destination_state").notNull(),
    destinationCity: text("destination_city").notNull(),
    destinationAddress: text("destination_address").notNull(),
    cargoType: text("cargo_type").notNull(),
    description: text("description").notNull(),
    weightKg: integer("weight_kg").notNull(),
    packageCount: integer("package_count").notNull(),
    declaredValueKobo: integer("declared_value_kobo"),
    pickupDate: date("pickup_date").notNull(),
    handlingNotes: text("handling_notes"),
    bookingType: bookingType("booking_type").notNull(),
    status: shipmentStatus("status").notNull().default("open"),
    ...timestamps,
  },
  (table) => [
    index("shipments_customer_idx").on(table.customerId, table.createdAt),
    check("shipments_weight_positive", sql`${table.weightKg} > 0`),
    check("shipments_packages_positive", sql`${table.packageCount} > 0`),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "restrict" }),
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "restrict" }),
    truckId: uuid("truck_id")
      .notNull()
      .references(() => trucks.id, { onDelete: "restrict" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorProfiles.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: bookingType("type").notNull(),
    status: bookingStatus("status").notNull().default("pending_vendor_acceptance"),
    reservedKg: integer("reserved_kg").notNull(),
    chargeableWeightKg: integer("chargeable_weight_kg").notNull(),
    ratePerTonneKobo: integer("rate_per_tonne_kobo").notNull(),
    lineItems: jsonb("line_items").$type<Array<{ label: string; amountKobo: number }>>().notNull(),
    totalKobo: integer("total_kobo").notNull(),
    currency: text("currency").notNull().default("NGN"),
    responseDueAt: timestamp("response_due_at", { withTimezone: true }).notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    statusNote: text("status_note"),
    driverId: uuid("driver_id").references((): AnyPgColumn => drivers.id, { onDelete: "restrict" }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("bookings_reference_key").on(table.reference),
    index("bookings_driver_idx").on(table.driverId, table.status),
    index("bookings_delivered_idx").on(table.status, table.deliveredAt),
    index("bookings_customer_idx").on(table.customerId, table.createdAt),
    index("bookings_vendor_idx").on(table.vendorId, table.status),
    index("bookings_route_idx").on(table.routeId),
    index("bookings_status_due_idx").on(table.status, table.responseDueAt),
    uniqueIndex("bookings_one_active_per_shipment_key")
      .on(table.shipmentId)
      .where(sql`${table.status} not in ('rejected', 'cancelled', 'expired')`),
    check("bookings_total_positive", sql`${table.totalKobo} > 0`),
  ],
);

export const bookingEvents = pgTable(
  "booking_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    status: bookingStatus("status").notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("booking_events_booking_idx").on(table.bookingId, table.createdAt)],
);

export const paymentProvider = pgEnum("payment_provider", ["paystack", "offline"]);
export const paymentStatus = pgEnum("payment_status", ["pending", "successful", "failed", "refunded", "partially_refunded"]);
export const payoutStatus = pgEnum("payout_status", ["on_hold", "eligible", "processing", "paid", "cancelled"]);
export const notificationStatus = pgEnum("notification_status", ["sent", "failed"]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    provider: paymentProvider("provider").notNull(),
    reference: text("reference").notNull(),
    providerTransactionId: text("provider_transaction_id"),
    amountKobo: integer("amount_kobo").notNull(),
    currency: text("currency").notNull().default("NGN"),
    status: paymentStatus("status").notNull().default("pending"),
    channel: text("channel"),
    platformFeeKobo: integer("platform_fee_kobo"),
    vendorPayableKobo: integer("vendor_payable_kobo"),
    refundedKobo: integer("refunded_kobo").notNull().default(0),
    failureReason: text("failure_reason"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("payments_reference_key").on(table.reference),
    index("payments_booking_idx").on(table.bookingId, table.createdAt),
    uniqueIndex("payments_one_successful_per_booking_key")
      .on(table.bookingId)
      .where(sql`${table.status} in ('successful', 'partially_refunded')`),
    check("payments_amount_positive", sql`${table.amountKobo} > 0`),
  ],
);

export const payouts = pgTable(
  "payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorProfiles.id, { onDelete: "restrict" }),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "restrict" }),
    amountKobo: integer("amount_kobo").notNull(),
    status: payoutStatus("status").notNull().default("on_hold"),
    transferReference: text("transfer_reference"),
    providerReference: text("provider_reference"),
    destination: text("destination"),
    failureReason: text("failure_reason"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paidBy: uuid("paid_by").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("payouts_payment_key").on(table.paymentId),
    uniqueIndex("payouts_provider_reference_key").on(table.providerReference),
    index("payouts_vendor_idx").on(table.vendorId, table.status),
    check("payouts_amount_non_negative", sql`${table.amountKobo} >= 0`),
  ],
);

export const payoutAccounts = pgTable(
  "payout_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorProfiles.id, { onDelete: "restrict" }),
    bankCode: text("bank_code").notNull(),
    bankName: text("bank_name").notNull(),
    accountNumberEncrypted: text("account_number_encrypted").notNull(),
    accountNumberLast4: text("account_number_last4").notNull(),
    accountName: text("account_name").notNull(),
    recipientCode: text("recipient_code").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("payout_accounts_vendor_key").on(table.vendorId)],
);

export const platformSettings = pgTable(
  "platform_settings",
  {
    id: integer("id").primaryKey(),
    commissionBps: integer("commission_bps").notNull(),
    minShipmentKg: integer("min_shipment_kg").notNull(),
    responseWindowHours: integer("response_window_hours").notNull(),
    autoCompleteHours: integer("auto_complete_hours").notNull(),
    disputeWindowDays: integer("dispute_window_days").notNull(),
    disabledTruckCategories: text("disabled_truck_categories").array().notNull().default(sql`'{}'::text[]`),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("platform_settings_singleton", sql`${table.id} = 1`),
    check("platform_settings_commission_range", sql`${table.commissionBps} between 0 and 5000`),
    check("platform_settings_min_weight_range", sql`${table.minShipmentKg} between 1 and 10000`),
    check("platform_settings_response_range", sql`${table.responseWindowHours} between 1 and 168`),
    check("platform_settings_auto_complete_range", sql`${table.autoCompleteHours} between 24 and 720`),
    check("platform_settings_dispute_range", sql`${table.disputeWindowDays} between 1 and 90`),
  ],
);

export const cargoCategories = pgTable(
  "cargo_categories",
  {
    value: text("value").primaryKey(),
    label: text("label").notNull(),
    active: boolean("active").notNull().default(true),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("cargo_categories_position_idx").on(table.position)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    channel: text("channel").notNull(),
    recipient: text("recipient").notNull(),
    template: text("template").notNull(),
    body: text("body").notNull(),
    status: notificationStatus("status").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notifications_user_idx").on(table.userId, table.createdAt)],
);

export const driverStatus = pgEnum("driver_status", ["active", "inactive"]);
export const deliveryEventKind = pgEnum("delivery_event_kind", [
  "driver_assigned",
  "arrived_at_pickup",
  "goods_collected",
  "departed",
  "arrived_at_destination",
  "delivery_attempted",
  "delivered",
  "incident_reported",
  "receipt_confirmed",
]);
export const reviewStatus = pgEnum("review_status", ["published", "hidden"]);
export const disputeCategory = pgEnum("dispute_category", [
  "non_delivery",
  "late_delivery",
  "damaged_goods",
  "missing_goods",
  "unexpected_charges",
  "incorrect_details",
  "cancellation",
  "payment_or_refund",
  "other",
]);
export const disputeStatus = pgEnum("dispute_status", ["open", "under_review", "awaiting_information", "resolved", "closed"]);

export const drivers = pgTable(
  "drivers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorProfiles.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    licenceNumberEncrypted: text("licence_number_encrypted").notNull(),
    licenceNumberHash: text("licence_number_hash").notNull(),
    licenceNumberLast4: text("licence_number_last4").notNull(),
    licenceClass: text("licence_class").notNull(),
    licenceExpiresOn: date("licence_expires_on").notNull(),
    status: driverStatus("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("drivers_user_id_key").on(table.userId),
    uniqueIndex("drivers_licence_hash_key").on(table.licenceNumberHash),
    index("drivers_vendor_idx").on(table.vendorId, table.status),
  ],
);

export const deliveryEvents = pgTable(
  "delivery_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    kind: deliveryEventKind("kind").notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    recipientName: text("recipient_name"),
    photoStorageKey: text("photo_storage_key"),
    photoContentType: text("photo_content_type"),
    photoSizeBytes: integer("photo_size_bytes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("delivery_events_booking_idx").on(table.bookingId, table.createdAt)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorProfiles.id, { onDelete: "restrict" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    status: reviewStatus("status").notNull().default("published"),
    moderationNote: text("moderation_note"),
    moderatedBy: uuid("moderated_by").references(() => users.id, { onDelete: "set null" }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("reviews_booking_key").on(table.bookingId),
    index("reviews_vendor_idx").on(table.vendorId, table.status),
    check("reviews_rating_range", sql`${table.rating} between 1 and 5`),
  ],
);

export const disputes = pgTable(
  "disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    openedBy: uuid("opened_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    openedByRole: userRole("opened_by_role").notNull(),
    category: disputeCategory("category").notNull(),
    description: text("description").notNull(),
    status: disputeStatus("status").notNull().default("open"),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    resolution: text("resolution"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("disputes_booking_idx").on(table.bookingId),
    index("disputes_status_idx").on(table.status, table.createdAt),
    uniqueIndex("disputes_one_active_per_booking_key")
      .on(table.bookingId)
      .where(sql`${table.status} not in ('resolved', 'closed')`),
  ],
);

export const disputeMessages = pgTable(
  "dispute_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    disputeId: uuid("dispute_id")
      .notNull()
      .references(() => disputes.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    authorRole: userRole("author_role").notNull(),
    body: text("body").notNull(),
    attachmentStorageKey: text("attachment_storage_key"),
    attachmentFileName: text("attachment_file_name"),
    attachmentContentType: text("attachment_content_type"),
    attachmentSizeBytes: integer("attachment_size_bytes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("dispute_messages_dispute_idx").on(table.disputeId, table.createdAt)],
);

export const productStatus = pgEnum("product_status", ["active", "paused", "hidden", "archived"]);
export const orderStatus = pgEnum("order_status", ["awaiting_seller", "accepted", "declined", "cancelled", "expired"]);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorProfiles.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    unitLabel: text("unit_label").notNull(),
    unitWeightKg: integer("unit_weight_kg").notNull(),
    priceKobo: integer("price_kobo").notNull(),
    stockUnits: integer("stock_units").notNull().default(0),
    minOrderUnits: integer("min_order_units").notNull().default(1),
    status: productStatus("status").notNull().default("active"),
    statusNote: text("status_note"),
    ...timestamps,
  },
  (table) => [
    index("products_catalog_idx").on(table.status, table.category, table.createdAt),
    index("products_vendor_idx").on(table.vendorId, table.status),
    check("products_price_positive", sql`${table.priceKobo} > 0`),
    check("products_unit_weight_positive", sql`${table.unitWeightKg} > 0`),
    check("products_stock_non_negative", sql`${table.stockUnits} >= 0`),
    check("products_min_order_positive", sql`${table.minOrderUnits} > 0`),
  ],
);

export const productPhotos = pgTable(
  "product_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("product_photos_product_idx").on(table.productId, table.uploadedAt)],
);

export const deliveryRates = pgTable(
  "delivery_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorProfiles.id, { onDelete: "cascade" }),
    destinationState: text("destination_state").notNull(),
    ratePerTonneKobo: integer("rate_per_tonne_kobo").notNull(),
    minimumChargeKobo: integer("minimum_charge_kobo").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("delivery_rates_vendor_state_key").on(table.vendorId, table.destinationState),
    index("delivery_rates_state_idx").on(table.destinationState),
    check("delivery_rates_rate_positive", sql`${table.ratePerTonneKobo} > 0`),
    check("delivery_rates_minimum_non_negative", sql`${table.minimumChargeKobo} >= 0`),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendorProfiles.id, { onDelete: "restrict" }),
    status: orderStatus("status").notNull().default("awaiting_seller"),
    destinationState: text("destination_state").notNull(),
    destinationCity: text("destination_city").notNull(),
    destinationAddress: text("destination_address").notNull(),
    deliveryNotes: text("delivery_notes"),
    weightKg: integer("weight_kg").notNull(),
    ratePerTonneKobo: integer("rate_per_tonne_kobo").notNull(),
    goodsKobo: integer("goods_kobo").notNull(),
    deliveryKobo: integer("delivery_kobo").notNull(),
    totalKobo: integer("total_kobo").notNull(),
    responseDueAt: timestamp("response_due_at", { withTimezone: true }).notNull(),
    statusNote: text("status_note"),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("orders_reference_key").on(table.reference),
    uniqueIndex("orders_booking_key").on(table.bookingId),
    index("orders_customer_idx").on(table.customerId, table.createdAt),
    index("orders_vendor_idx").on(table.vendorId, table.status),
    index("orders_status_due_idx").on(table.status, table.responseDueAt),
    check("orders_total_positive", sql`${table.totalKobo} > 0`),
    check("orders_weight_positive", sql`${table.weightKg} > 0`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    unitLabel: text("unit_label").notNull(),
    unitWeightKg: integer("unit_weight_kg").notNull(),
    unitPriceKobo: integer("unit_price_kobo").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalKobo: integer("line_total_kobo").notNull(),
  },
  (table) => [
    index("order_items_order_idx").on(table.orderId),
    index("order_items_product_idx").on(table.productId),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);

export type User = typeof users.$inferSelect;
export type UserRole = (typeof userRole.enumValues)[number];
export type VendorProfile = typeof vendorProfiles.$inferSelect;
export type VendorDocument = typeof vendorDocuments.$inferSelect;
export type Truck = typeof trucks.$inferSelect;
export type TruckDocument = typeof truckDocuments.$inferSelect;
export type TruckPhoto = typeof truckPhotos.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Route = typeof routes.$inferSelect;
export type Shipment = typeof shipments.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingEvent = typeof bookingEvents.$inferSelect;
export type BookingStatus = (typeof bookingStatus.enumValues)[number];
export type Payment = typeof payments.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type DeliveryEvent = typeof deliveryEvents.$inferSelect;
export type DeliveryEventKind = (typeof deliveryEventKind.enumValues)[number];
export type Review = typeof reviews.$inferSelect;
export type Dispute = typeof disputes.$inferSelect;
export type DisputeStatus = (typeof disputeStatus.enumValues)[number];
export type DisputeMessage = typeof disputeMessages.$inferSelect;
export type PayoutAccount = typeof payoutAccounts.$inferSelect;
export type PlatformSettings = typeof platformSettings.$inferSelect;
export type CargoCategory = typeof cargoCategories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductPhoto = typeof productPhotos.$inferSelect;
export type DeliveryRate = typeof deliveryRates.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatus = (typeof orderStatus.enumValues)[number];
