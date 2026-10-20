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

export const site = {
  name: "WCE Logistics",
  tagline: "Move more. Build more.",
  description:
    "Book verified trucks for interstate freight across Nigeria. Heavy equipment, trucks, buses and on-demand logistics from WCE Logistics.",
  get contactEmail() {
    return readContactEmail();
  },
};
