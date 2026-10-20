import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { serverEnv } from "@/server/env";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const SIGNATURES: ReadonlyArray<{ type: string; extension: string; bytes: number[]; offset?: number }> = [
  { type: "application/pdf", extension: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { type: "image/jpeg", extension: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/png", extension: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: "image/webp", extension: "webp", bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
];

export type UploadKind = "document" | "image";

export class UploadRejectedError extends Error {}

const globalForStorage = globalThis as unknown as { wceS3?: S3Client };

function client(): S3Client {
  if (!globalForStorage.wceS3) {
    const env = serverEnv();
    globalForStorage.wceS3 = new S3Client({
      region: env.STORAGE_REGION,
      endpoint: env.STORAGE_ENDPOINT || undefined,
      forcePathStyle: env.STORAGE_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId: env.STORAGE_ACCESS_KEY_ID, secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY },
    });
  }
  return globalForStorage.wceS3;
}

function detectType(buffer: Buffer): (typeof SIGNATURES)[number] | undefined {
  return SIGNATURES.find((signature) => {
    const offset = signature.offset ?? 0;
    return signature.bytes.every((byte, index) => buffer[offset + index] === byte);
  });
}

function safeFileName(name: string): string {
  const cleaned = name.normalize("NFKC").replace(/[^\w.\- ]+/g, "").trim().slice(0, 120);
  return cleaned || "document";
}

export type StoredFile = { storageKey: string; fileName: string; contentType: string; sizeBytes: number };

export async function storeUpload(file: File, prefix: string, kind: UploadKind): Promise<StoredFile> {
  if (!(file instanceof File) || file.size === 0) {
    throw new UploadRejectedError("Choose a file to upload.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadRejectedError("Files must be 10 MB or smaller.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectType(buffer);
  const allowed = kind === "image" ? detected && detected.type !== "application/pdf" : detected;
  if (!detected || !allowed) {
    throw new UploadRejectedError(kind === "image" ? "Upload a JPG, PNG or WebP photo." : "Upload a PDF, JPG, PNG or WebP file.");
  }

  const storageKey = `${prefix}/${randomUUID()}.${detected.extension}`;
  await client().send(
    new PutObjectCommand({
      Bucket: serverEnv().STORAGE_BUCKET,
      Key: storageKey,
      Body: buffer,
      ContentType: detected.type,
      ContentLength: buffer.length,
    }),
  );
  return { storageKey, fileName: safeFileName(file.name), contentType: detected.type, sizeBytes: buffer.length };
}

export async function signedDownloadUrl(storageKey: string, fileName: string, disposition: "inline" | "attachment" = "inline"): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: serverEnv().STORAGE_BUCKET,
      Key: storageKey,
      ResponseContentDisposition: `${disposition}; filename="${fileName.replace(/"/g, "")}"`,
    }),
    { expiresIn: 60 },
  );
}

export async function deleteStoredObject(storageKey: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: serverEnv().STORAGE_BUCKET, Key: storageKey }));
}
