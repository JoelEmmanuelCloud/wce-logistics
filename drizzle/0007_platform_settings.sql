CREATE TABLE "cargo_categories" (
	"value" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"commission_bps" integer NOT NULL,
	"min_shipment_kg" integer NOT NULL,
	"response_window_hours" integer NOT NULL,
	"auto_complete_hours" integer NOT NULL,
	"dispute_window_days" integer NOT NULL,
	"disabled_truck_categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_singleton" CHECK ("platform_settings"."id" = 1),
	CONSTRAINT "platform_settings_commission_range" CHECK ("platform_settings"."commission_bps" between 0 and 5000),
	CONSTRAINT "platform_settings_min_weight_range" CHECK ("platform_settings"."min_shipment_kg" between 1 and 10000),
	CONSTRAINT "platform_settings_response_range" CHECK ("platform_settings"."response_window_hours" between 1 and 168),
	CONSTRAINT "platform_settings_auto_complete_range" CHECK ("platform_settings"."auto_complete_hours" between 24 and 720),
	CONSTRAINT "platform_settings_dispute_range" CHECK ("platform_settings"."dispute_window_days" between 1 and 90)
);
--> statement-breakpoint
ALTER TABLE "shipments" DROP CONSTRAINT "shipments_minimum_weight";--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cargo_categories_position_idx" ON "cargo_categories" USING btree ("position");--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_weight_positive" CHECK ("shipments"."weight_kg" > 0);--> statement-breakpoint
INSERT INTO "cargo_categories" ("value", "label", "position") VALUES
	('general_goods', 'General goods', 1),
	('construction_materials', 'Construction materials', 2),
	('agricultural_produce', 'Agricultural produce', 3),
	('packaged_food', 'Packaged food and drinks', 4),
	('machinery', 'Machinery and equipment', 5),
	('electronics', 'Electronics', 6),
	('furniture', 'Furniture', 7),
	('chilled_goods', 'Chilled or frozen goods', 8)
ON CONFLICT ("value") DO NOTHING;
