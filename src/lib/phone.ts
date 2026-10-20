import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export function normalizePhone(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input.trim(), "NG");
  if (!parsed || !parsed.isValid()) {
    return null;
  }
  const type = parsed.getType();
  if (type !== undefined && type !== "MOBILE" && type !== "FIXED_LINE_OR_MOBILE") {
    return null;
  }
  return parsed.number;
}

export function maskPhone(e164: string): string {
  if (e164.length <= 7) {
    return e164;
  }
  return `${e164.slice(0, 4)}${"•".repeat(e164.length - 7)}${e164.slice(-3)}`;
}

export function formatPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}
