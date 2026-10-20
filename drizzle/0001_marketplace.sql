CREATE TYPE "public"."booking_status" AS ENUM('pending_vendor_acceptance', 'awaiting_payment', 'confirmed', 'pickup_scheduled', 'goods_collected', 'in_transit', 'delivery_attempted', 'delivered', 'completed', 'rejected', 'cancelled', 'expired', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."booking_type" AS ENUM('shared', 'dedicated');--> statement-breakpoint
CREATE TYPE "public"."route_status" AS ENUM('active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('open', 'booked', 'cancelled');--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"status" "booking_status" NOT NULL,
	"actor_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"shipment_id" uuid NOT NULL,
	"route_id" uuid NOT NULL,
	"truck_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" "booking_type" NOT NULL,
	"status" "booking_status" DEFAULT 'pending_vendor_acceptance' NOT NULL,
	"reserved_kg" integer NOT NULL,
	"chargeable_weight_kg" integer NOT NULL,
	"rate_per_kg_kobo" integer NOT NULL,
	"line_items" jsonb NOT NULL,
	"total_kobo" integer NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"response_due_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"status_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_total_positive" CHECK ("bookings"."total_kobo" > 0)
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"truck_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"origin_state" text NOT NULL,
	"origin_city" text NOT NULL,
	"destination_state" text NOT NULL,
	"destination_city" text NOT NULL,
	"departure_date" date NOT NULL,
	"transit_hours" integer NOT NULL,
	"capacity_kg" integer NOT NULL,
	"reserved_kg" integer DEFAULT 0 NOT NULL,
	"allows_shared" boolean DEFAULT true NOT NULL,
	"rate_per_kg_kobo" integer NOT NULL,
	"minimum_charge_kobo" integer DEFAULT 0 NOT NULL,
	"dedicated_price_kobo" integer,
	"status" "route_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routes_capacity_positive" CHECK ("routes"."capacity_kg" > 0),
	CONSTRAINT "routes_reserved_within_capacity" CHECK ("routes"."reserved_kg" between 0 and "routes"."capacity_kg"),
	CONSTRAINT "routes_rate_positive" CHECK ("routes"."rate_per_kg_kobo" > 0),
	CONSTRAINT "routes_transit_positive" CHECK ("routes"."transit_hours" between 1 and 240)
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"origin_state" text NOT NULL,
	"origin_city" text NOT NULL,
	"origin_address" text NOT NULL,
	"destination_state" text NOT NULL,
	"destination_city" text NOT NULL,
	"destination_address" text NOT NULL,
	"cargo_type" text NOT NULL,
	"description" text NOT NULL,
	"weight_kg" integer NOT NULL,
	"package_count" integer NOT NULL,
	"declared_value_kobo" integer,
	"pickup_date" date NOT NULL,
	"handling_notes" text,
	"booking_type" "booking_type" NOT NULL,
	"status" "shipment_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_minimum_weight" CHECK ("shipments"."weight_kg" >= 50),
	CONSTRAINT "shipments_packages_positive" CHECK ("shipments"."package_count" > 0)
);
--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vendor_id_vendor_profiles_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_truck_id_trucks_id_fk" FOREIGN KEY ("truck_id") REFERENCES "public"."trucks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_vendor_id_vendor_profiles_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_events_booking_idx" ON "booking_events" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "bookings_customer_idx" ON "bookings" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "bookings_vendor_idx" ON "bookings" USING btree ("vendor_id","status");--> statement-breakpoint
CREATE INDEX "bookings_route_idx" ON "bookings" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "bookings_status_due_idx" ON "bookings" USING btree ("status","response_due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_one_active_per_shipment_key" ON "bookings" USING btree ("shipment_id") WHERE "bookings"."status" not in ('rejected', 'cancelled', 'expired');--> statement-breakpoint
CREATE INDEX "routes_search_idx" ON "routes" USING btree ("origin_state","destination_state","departure_date","status");--> statement-breakpoint
CREATE INDEX "routes_truck_idx" ON "routes" USING btree ("truck_id","departure_date");--> statement-breakpoint
CREATE INDEX "routes_vendor_idx" ON "routes" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "shipments_customer_idx" ON "shipments" USING btree ("customer_id","created_at");