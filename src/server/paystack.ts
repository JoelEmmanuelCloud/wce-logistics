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

export type Bank = { name: string; code: string };

const globalForBanks = globalThis as unknown as { wcePaystackBanks?: { banks: Bank[]; fetchedAt: number } };
const BANK_LIST_TTL_MS = 6 * 60 * 60 * 1000;

export async function listBanks(): Promise<Bank[]> {
  const cached = globalForBanks.wcePaystackBanks;
  if (cached && Date.now() - cached.fetchedAt < BANK_LIST_TTL_MS) {
    return cached.banks;
  }
  const data = await call<Array<{ name: string; code: string; active: boolean; is_deleted: boolean | null; type: string }>>(
    "/bank?country=nigeria&currency=NGN&perPage=200",
    { method: "GET" },
  );
  const banks = data
    .filter((bank) => bank.active && !bank.is_deleted && bank.type === "nuban")
    .map((bank) => ({ name: bank.name, code: bank.code }))
    .sort((a, b) => a.name.localeCompare(b.name));
  globalForBanks.wcePaystackBanks = { banks, fetchedAt: Date.now() };
  return banks;
}

export async function resolveAccount(accountNumber: string, bankCode: string): Promise<{ accountName: string }> {
  const data = await call<{ account_number: string; account_name: string }>(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    { method: "GET" },
  );
  return { accountName: data.account_name };
}

export async function createTransferRecipient(input: { name: string; accountNumber: string; bankCode: string }): Promise<{ recipientCode: string }> {
  const data = await call<{ recipient_code: string }>("/transferrecipient", {
    method: "POST",
    body: { type: "nuban", name: input.name, account_number: input.accountNumber, bank_code: input.bankCode, currency: "NGN" },
  });
  return { recipientCode: data.recipient_code };
}

export type PaystackTransfer = { reference: string; transfer_code: string; status: string; amount: number; reason?: string | null };

export async function initiateTransfer(input: { amountKobo: number; recipientCode: string; reference: string; reason: string }): Promise<PaystackTransfer> {
  return call<PaystackTransfer>("/transfer", {
    method: "POST",
    body: { source: "balance", amount: input.amountKobo, recipient: input.recipientCode, reference: input.reference, reason: input.reason, currency: "NGN" },
  });
}

export async function verifyTransfer(reference: string): Promise<PaystackTransfer> {
  return call<PaystackTransfer>(`/transfer/verify/${encodeURIComponent(reference)}`, { method: "GET" });
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
