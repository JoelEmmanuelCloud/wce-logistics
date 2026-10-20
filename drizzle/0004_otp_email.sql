ALTER TABLE "otp_challenges" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
CREATE INDEX "otp_challenges_email_created_idx" ON "otp_challenges" USING btree ("email","created_at");