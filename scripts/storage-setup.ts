import { CreateBucketCommand, HeadBucketCommand, PutPublicAccessBlockCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "dotenv";

config({ path: ".env.local" });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  const bucket = required("STORAGE_BUCKET");
  const client = new S3Client({
    region: required("STORAGE_REGION"),
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId: required("STORAGE_ACCESS_KEY_ID"), secretAccessKey: required("STORAGE_SECRET_ACCESS_KEY") },
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`Bucket ${bucket} already exists`);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`Created bucket ${bucket}`);
  }

  if (!process.env.STORAGE_ENDPOINT) {
    await client.send(
      new PutPublicAccessBlockCommand({
        Bucket: bucket,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          IgnorePublicAcls: true,
          BlockPublicPolicy: true,
          RestrictPublicBuckets: true,
        },
      }),
    );
    console.log("Public access blocked");
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
