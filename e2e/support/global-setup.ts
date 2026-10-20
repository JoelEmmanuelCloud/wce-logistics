import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { adminDatabaseUrl, testEnv } from "./env";

async function ensureDatabase() {
  const admin = postgres(adminDatabaseUrl, { max: 1, onnotice: () => {} });
  try {
    const name = new URL(testEnv.DATABASE_URL).pathname.slice(1);
    const existing = await admin`select 1 from pg_database where datname = ${name}`;
    if (existing.length === 0) {
      await admin.unsafe(`create database "${name}"`);
    }
  } finally {
    await admin.end();
  }

  const client = postgres(testEnv.DATABASE_URL, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    await client.unsafe(
      "truncate table notifications, payouts, payments, booking_events, bookings, shipments, routes, audit_logs, truck_photos, truck_documents, trucks, vendor_documents, vendor_profiles, otp_challenges, sessions, users restart identity cascade",
    );
  } finally {
    await client.end();
  }
}

async function ensureBucket() {
  const client = new S3Client({
    region: process.env.STORAGE_REGION ?? "us-east-1",
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "",
    },
  });
  try {
    await client.send(new HeadBucketCommand({ Bucket: testEnv.STORAGE_BUCKET }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: testEnv.STORAGE_BUCKET }));
  }
}

export default async function globalSetup() {
  await ensureDatabase();
  await ensureBucket();
}
