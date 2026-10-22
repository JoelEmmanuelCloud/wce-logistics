import { formatPhone } from "@/lib/phone";

const LINK = "font-medium underline decoration-navy/30 underline-offset-4 hover:decoration-navy";

export function PhoneLink({ phone }: { phone: string | null | undefined }) {
  if (!phone) {
    return <span className="text-navy/70">Not provided</span>;
  }
  return (
    <a href={`tel:${phone}`} className={`whitespace-nowrap ${LINK}`}>
      {formatPhone(phone)}
    </a>
  );
}

export function EmailLink({ email }: { email: string | null | undefined }) {
  if (!email) {
    return <span className="text-navy/70">Not provided</span>;
  }
  return (
    <a href={`mailto:${email}`} className={`[overflow-wrap:anywhere] ${LINK}`}>
      {email}
    </a>
  );
}
