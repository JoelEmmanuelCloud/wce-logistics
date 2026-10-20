import "server-only";
import { maskPhone } from "@/lib/phone";
import { serverEnv } from "@/server/env";

export class SmsDeliveryError extends Error {}

type TermiiResponse = { message_id?: string; message?: string; code?: string };

async function sendWithTermii(to: string, message: string): Promise<void> {
  const env = serverEnv();
  const response = await fetch(new URL("/api/sms/send", env.TERMII_BASE_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      api_key: env.TERMII_API_KEY,
      to: to.replace(/^\+/, ""),
      from: env.TERMII_SENDER_ID,
      sms: message,
      type: "plain",
      channel: "dnd",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = (await response.json().catch(() => ({}))) as TermiiResponse;
  if (!response.ok || !payload.message_id) {
    throw new SmsDeliveryError(`Termii rejected the message with status ${response.status}: ${payload.message ?? "unknown error"}`);
  }
}

function sendWithLog(to: string, message: string): void {
  if (serverEnv().NODE_ENV === "production") {
    throw new SmsDeliveryError("The log SMS provider is disabled in production");
  }
  console.info(`[sms:log] to=${maskPhone(to)} message="${message}"`);
}

export async function sendSms(to: string, message: string): Promise<void> {
  const provider = serverEnv().SMS_PROVIDER;
  if (provider === "termii") {
    await sendWithTermii(to, message);
    return;
  }
  sendWithLog(to, message);
}
