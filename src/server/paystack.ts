import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/server/env";

export class PaystackError extends Error {}

type Envelope<T> = { status: boolean; message: string; data: T };

export type PaystackTransaction = {
  id: number;
  status: "success" | "failed" | "abandoned" | "ongoing" | "pending" | "processing" | "queued" | "reversed";
  reference: string;
  amount: number;
  currency: string;
  channel: string | null;
  paid_at: string | null;
  gateway_response: string | null;
};

export function paystackConfigured(): boolean {
  return Boolean(serverEnv().PAYSTACK_SECRET_KEY);
}

function secret(): string {
  const key = serverEnv().PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new PaystackError("Online payments are not configured.");
  }
  return key;
}

async function call<T>(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<T> {
  const response = await fetch(new URL(path, serverEnv().PAYSTACK_BASE_URL), {
    method: init.method,
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json", Accept: "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || !payload?.status) {
    throw new PaystackError(`Paystack ${init.method} ${path} failed with status ${response.status}: ${payload?.message ?? "no response body"}`);
  }
  return payload.data;
}

export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<{ authorizationUrl: string }> {
  const data = await call<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: {
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    },
  });
  return { authorizationUrl: data.authorization_url };
}

export async function verifyTransaction(reference: string): Promise<PaystackTransaction> {
  return call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });
}

export async function refundTransaction(reference: string, amountKobo: number): Promise<{ id: number; status: string }> {
  return call<{ id: number; status: string }>("/refund", { method: "POST", body: { transaction: reference, amount: amountKobo } });
}

export function validWebhookSignature(rawBody: string, signature: string | null): boolean {
  const key = serverEnv().PAYSTACK_SECRET_KEY;
  if (!key || !signature || !/^[0-9a-f]{128}$/i.test(signature)) {
    return false;
  }
  const expected = createHmac("sha512", key).update(rawBody).digest();
  const provided = Buffer.from(signature, "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
