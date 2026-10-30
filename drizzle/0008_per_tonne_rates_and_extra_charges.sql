ALTER TABLE "routes" DROP CONSTRAINT "routes_rate_positive";--> statement-breakpoint
ALTER TABLE "routes" RENAME COLUMN "rate_per_kg_kobo" TO "rate_per_tonne_kobo";--> statement-breakpoint
UPDATE "routes" SET "rate_per_tonne_kobo" = "rate_per_tonne_kobo" * 1000;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_rate_positive" CHECK ("routes"."rate_per_tonne_kobo" > 0);--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "loading_charge_kobo" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "offloading_charge_kobo" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "toll_charge_kobo" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_extra_charges_non_negative" CHECK ("routes"."loading_charge_kobo" >= 0 and "routes"."offloading_charge_kobo" >= 0 and "routes"."toll_charge_kobo" >= 0);--> statement-breakpoint
ALTER TABLE "bookings" RENAME COLUMN "rate_per_kg_kobo" TO "rate_per_tonne_kobo";--> statement-breakpoint
UPDATE "bookings" SET "rate_per_tonne_kobo" = "rate_per_tonne_kobo" * 1000;
