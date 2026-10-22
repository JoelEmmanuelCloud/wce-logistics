ALTER TYPE "public"."payout_status" ADD VALUE 'processing' BEFORE 'paid';--> statement-breakpoint
CREATE TABLE "payout_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"bank_code" text NOT NULL,
	"bank_name" text NOT NULL,
	"account_number_encrypted" text NOT NULL,
	"account_number_last4" text NOT NULL,
	"account_name" text NOT NULL,
	"recipient_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "provider_reference" text;--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "destination" text;--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_vendor_id_vendor_profiles_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payout_accounts_vendor_key" ON "payout_accounts" USING btree ("vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payouts_provider_reference_key" ON "payouts" USING btree ("provider_reference");