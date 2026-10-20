import "server-only";
import { serverEnv } from "@/server/env";

export class EmailDeliveryError extends Error {}

export type EmailMessage = {
  to: string;
  subject: string;
  heading: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  footnote?: string;
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function renderText(message: EmailMessage): string {
  return [
    message.heading,
    "",
    ...message.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(message.action ? [`${message.action.label}: ${message.action.url}`, ""] : []),
    ...(message.footnote ? [message.footnote, ""] : []),
    "WCE Logistics. Move more. Build more.",
  ].join("\n");
}

export function renderHtml(message: EmailMessage): string {
  const paragraphs = message.paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#0B2545;">${escapeHtml(paragraph)}</p>`)
    .join("");
  const action = message.action
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(message.action.url)}" style="display:inline-block;background:#FF6B00;color:#0B2545;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:999px;">${escapeHtml(message.action.label)}</a></p>`
    : "";
  const footnote = message.footnote ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#4a5b70;">${escapeHtml(message.footnote)}</p>` : "";
  return `<!doctype html><html lang="en"><body style="margin:0;padding:0;background:#F4F1EC;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EC;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;">
<tr><td style="background:#0B2545;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:800;letter-spacing:1px;">WCE <span style="color:#FF6B00;">|</span> LOGISTICS</td></tr>
<tr><td style="padding:32px 28px;">
<h1 style="margin:0 0 20px;font-size:24px;line-height:1.25;color:#0B2545;">${escapeHtml(message.heading)}</h1>
${paragraphs}${action}${footnote}
</td></tr>
<tr><td style="padding:18px 28px;background:#F4F1EC;font-size:12px;color:#4a5b70;">WCE Logistics. Move more. Build more.</td></tr>
</table></td></tr></table></body></html>`;
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
