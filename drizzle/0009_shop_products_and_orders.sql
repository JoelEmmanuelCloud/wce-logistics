CREATE TYPE "public"."order_status" AS ENUM('awaiting_seller', 'accepted', 'declined', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'paused', 'hidden', 'archived');--> statement-breakpoint
CREATE TABLE "delivery_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"destination_state" text NOT NULL,
	"rate_per_tonne_kobo" integer NOT NULL,
	"minimum_charge_kobo" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_rates_rate_positive" CHECK ("delivery_rates"."rate_per_tonne_kobo" > 0),
	CONSTRAINT "delivery_rates_minimum_non_negative" CHECK ("delivery_rates"."minimum_charge_kobo" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"title" text NOT NULL,
	"unit_label" text NOT NULL,
	"unit_weight_kg" integer NOT NULL,
	"unit_price_kobo" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_kobo" integer NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'awaiting_seller' NOT NULL,
	"destination_state" text NOT NULL,
	"destination_city" text NOT NULL,
	"destination_address" text NOT NULL,
	"delivery_notes" text,
	"weight_kg" integer NOT NULL,
	"rate_per_tonne_kobo" integer NOT NULL,
	"goods_kobo" integer NOT NULL,
	"delivery_kobo" integer NOT NULL,
	"total_kobo" integer NOT NULL,
	"response_due_at" timestamp with time zone NOT NULL,
	"status_note" text,
	"booking_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_total_positive" CHECK ("orders"."total_kobo" > 0),
	CONSTRAINT "orders_weight_positive" CHECK ("orders"."weight_kg" > 0)
);
--> statement-breakpoint
CREATE TABLE "product_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"unit_label" text NOT NULL,
	"unit_weight_kg" integer NOT NULL,
	"price_kobo" integer NOT NULL,
	"stock_units" integer DEFAULT 0 NOT NULL,
	"min_order_units" integer DEFAULT 1 NOT NULL,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"status_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_positive" CHECK ("products"."price_kobo" > 0),
	CONSTRAINT "products_unit_weight_positive" CHECK ("products"."unit_weight_kg" > 0),
	CONSTRAINT "products_stock_non_negative" CHECK ("products"."stock_units" >= 0),
	CONSTRAINT "products_min_order_positive" CHECK ("products"."min_order_units" > 0)
);
--> statement-breakpoint
ALTER TABLE "delivery_rates" ADD CONSTRAINT "delivery_rates_vendor_id_vendor_profiles_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_vendor_id_vendor_profiles_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_photos" ADD CONSTRAINT "product_photos_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_vendor_profiles_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_rates_vendor_state_key" ON "delivery_rates" USING btree ("vendor_id","destination_state");--> statement-breakpoint
CREATE INDEX "delivery_rates_state_idx" ON "delivery_rates" USING btree ("destination_state");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_reference_key" ON "orders" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_booking_key" ON "orders" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_vendor_idx" ON "orders" USING btree ("vendor_id","status");--> statement-breakpoint
CREATE INDEX "orders_status_due_idx" ON "orders" USING btree ("status","response_due_at");--> statement-breakpoint
CREATE INDEX "product_photos_product_idx" ON "product_photos" USING btree ("product_id","uploaded_at");--> statement-breakpoint
CREATE INDEX "products_catalog_idx" ON "products" USING btree ("status","category","created_at");--> statement-breakpoint
CREATE INDEX "products_vendor_idx" ON "products" USING btree ("vendor_id","status");