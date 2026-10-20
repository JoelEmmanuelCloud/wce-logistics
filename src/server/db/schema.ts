import { sql } from "drizzle-orm";
import {
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
    phone: text("phone").notNull(),
    fullName: text("full_name"),
    email: text("email"),
    role: userRole("role"),
    status: userStatus("status").notNull().default("active"),
    lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_phone_key").on(table.phone),
    uniqueIndex("users_email_key").on(sql`lower(${table.email})`),
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
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    ipAddress: inet("ip_address"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("otp_challenges_phone_created_idx").on(table.phone, table.createdAt),
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

export type User = typeof users.$inferSelect;
export type UserRole = (typeof userRole.enumValues)[number];
export type VendorProfile = typeof vendorProfiles.$inferSelect;
export type VendorDocument = typeof vendorDocuments.$inferSelect;
export type Truck = typeof trucks.$inferSelect;
export type TruckDocument = typeof truckDocuments.$inferSelect;
export type TruckPhoto = typeof truckPhotos.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
