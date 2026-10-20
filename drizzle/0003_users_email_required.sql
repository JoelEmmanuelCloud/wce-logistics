DROP INDEX "otp_challenges_phone_created_idx";--> statement-breakpoint
DROP INDEX "users_phone_key";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
UPDATE "users" SET "email" = 'account-' || "id" || '@invalid.invalid' WHERE "email" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "users_phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
DELETE FROM "otp_challenges";--> statement-breakpoint
ALTER TABLE "otp_challenges" DROP COLUMN "phone";