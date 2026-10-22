export type EmailContent = {
  subject: string;
  heading: string;
  paragraphs: string[];
  preview?: string;
  code?: string;
  action?: { label: string; url: string };
  footnote?: string;
};

export type EmailBrand = { siteUrl: string; supportEmail: string };

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";
const NAVY = "#0B2545";
const INK = "#1F2A37";
const MUTED = "#5B6675";
const RULE = "#E6E8EC";
const ORANGE = "#FF6B00";
const CANVAS = "#F4F5F7";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function previewText(content: EmailContent): string {
  return content.preview ?? content.paragraphs[0] ?? content.heading;
}

function siteHost(siteUrl: string): string {
  return new URL(siteUrl).host;
}

export function renderText(content: EmailContent, brand: EmailBrand): string {
  return [
    content.heading,
    "",
    ...content.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(content.code ? [`Your code: ${content.code}`, ""] : []),
    ...(content.action ? [`${content.action.label}:`, content.action.url, ""] : []),
    ...(content.footnote ? [content.footnote, ""] : []),
    "--",
    "WCE Logistics, interstate truck booking across Nigeria",
    `Questions? Email ${brand.supportEmail}`,
    brand.siteUrl,
  ].join("\n");
}

function button(action: NonNullable<EmailContent["action"]>): string {
  const url = escapeHtml(action.url);
  const label = escapeHtml(action.label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
<tr><td bgcolor="${ORANGE}" style="border-radius:8px;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${url}" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="${ORANGE}"><center style="color:${NAVY};font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${label}</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${url}" target="_blank" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:${NAVY};text-decoration:none;border-radius:8px;background:${ORANGE};">${label}</a><!--<![endif]-->
</td></tr></table>
<p style="margin:0 0 4px;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">If the button does not work, copy this link into your browser:</p>
<p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;word-break:break-all;"><a href="${url}" target="_blank" style="color:${NAVY};text-decoration:underline;">${url}</a></p>`;
}

function codeBlock(code: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 24px;">
<tr><td align="center" style="background:${CANVAS};border:1px solid ${RULE};border-radius:10px;padding:20px 12px;">
<span style="font-family:${MONO};font-size:32px;font-weight:700;letter-spacing:10px;color:${NAVY};">${escapeHtml(code)}</span>
</td></tr></table>`;
}

export function renderHtml(content: EmailContent, brand: EmailBrand): string {
  const paragraphs = content.paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${INK};">${escapeHtml(paragraph)}</p>`)
    .join("\n");
  const footnote = content.footnote
    ? `<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid ${RULE};font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(content.footnote)}</p>`
    : "";
  const siteUrl = escapeHtml(brand.siteUrl);
  const supportEmail = escapeHtml(brand.supportEmail);

  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(previewText(content))}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS};">
<tr><td align="center" style="padding:32px 16px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="padding:0 4px 20px;">
<a href="${siteUrl}" target="_blank" style="text-decoration:none;font-family:${FONT};font-size:18px;font-weight:800;letter-spacing:0.5px;color:${NAVY};">WCE<span style="color:${ORANGE};padding:0 8px;font-weight:400;">|</span>LOGISTICS</a>
</td></tr>
<tr><td style="background:#FFFFFF;border:1px solid ${RULE};border-radius:12px;padding:36px 32px;">
<h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${NAVY};">${escapeHtml(content.heading)}</h1>
${paragraphs}
${content.code ? codeBlock(content.code) : ""}
${content.action ? button(content.action) : ""}
${footnote}
</td></tr>
<tr><td style="padding:24px 4px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">
<p style="margin:0 0 6px;">You are receiving this email because you have an account with WCE Logistics, the interstate truck booking marketplace for Nigeria.</p>
<p style="margin:0;">Questions? Email <a href="mailto:${supportEmail}" style="color:${MUTED};text-decoration:underline;">${supportEmail}</a> or visit <a href="${siteUrl}" target="_blank" style="color:${MUTED};text-decoration:underline;">${escapeHtml(siteHost(brand.siteUrl))}</a>.</p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>`;
}
