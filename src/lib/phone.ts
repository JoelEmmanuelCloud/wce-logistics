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

export function formatPhone(e164: string | null | undefined): string {
  if (!e164) {
    return "Not provided";
  }
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}
