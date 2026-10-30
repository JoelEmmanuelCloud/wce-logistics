import { normalizePhone } from "@/lib/phone";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readContactEmail(): string {
  const value = process.env.CONTACT_EMAIL?.trim();
  if (!value) {
    throw new Error("CONTACT_EMAIL environment variable is required");
  }
  if (!EMAIL_PATTERN.test(value)) {
    throw new Error("CONTACT_EMAIL environment variable must be a valid email address");
  }
  return value;
}

function readContactWhatsApp(): string {
  const value = process.env.CONTACT_WHATSAPP?.trim();
  if (!value) {
    throw new Error("CONTACT_WHATSAPP environment variable is required");
  }
  const phone = normalizePhone(value);
  if (!phone) {
    throw new Error("CONTACT_WHATSAPP environment variable must be a valid Nigerian mobile number");
  }
  return phone;
}

function readSiteUrl(): URL {
  const value = process.env.SITE_URL?.trim();
  if (!value) {
    throw new Error("SITE_URL environment variable is required");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("SITE_URL environment variable must be an absolute URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("SITE_URL environment variable must use http or https");
  }
  return url;
}

export const site = {
  name: "WCE Logistics",
  tagline: "Move more. Build more.",
  description:
    "Book verified trucks for interstate freight across Nigeria. Heavy equipment, trucks, buses and on-demand logistics from WCE Logistics.",
  keywords: [
    "interstate logistics Nigeria",
    "truck booking Nigeria",
    "haulage Lagos",
    "heavy equipment haulage",
    "freight marketplace",
    "bus charter Nigeria",
  ],
  get contactEmail() {
    return readContactEmail();
  },
  get contactWhatsApp() {
    return readContactWhatsApp();
  },
  get whatsappUrl() {
    return `https://wa.me/${readContactWhatsApp().slice(1)}`;
  },
  get url() {
    return readSiteUrl();
  },
};
