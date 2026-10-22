import "server-only";
import { site } from "@/lib/site";
import { renderHtml as renderTemplateHtml, renderText as renderTemplateText, type EmailBrand, type EmailContent } from "@/server/email/template";
import { serverEnv } from "@/server/env";

export class EmailDeliveryError extends Error {}

export type EmailMessage = EmailContent & { to: string };

function brand(): EmailBrand {
  return { siteUrl: site.url.toString().replace(/\/$/, ""), supportEmail: site.contactEmail };
}

export function renderText(message: EmailMessage): string {
  return renderTemplateText(message, brand());
}

export function renderHtml(message: EmailMessage): string {
  return renderTemplateHtml(message, brand());
}

async function sendWithResend(message: EmailMessage): Promise<void> {
  const env = serverEnv();
  const response = await fetch(new URL("/emails", env.RESEND_BASE_URL), {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: renderText(message),
      html: renderHtml(message),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok || !payload.id) {
    throw new EmailDeliveryError(`Resend rejected the email with status ${response.status}: ${payload.message ?? "unknown error"}`);
  }
}

function sendWithLog(message: EmailMessage): void {
  if (serverEnv().NODE_ENV === "production") {
    throw new EmailDeliveryError("The log email provider is disabled in production");
  }
  console.info(`[email:log] to=${message.to} subject="${message.subject}"\n${renderText(message)}`);
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  if (serverEnv().EMAIL_PROVIDER === "resend") {
    await sendWithResend(message);
    return;
  }
  sendWithLog(message);
}
