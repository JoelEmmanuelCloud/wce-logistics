import { formatDateTime } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import type { AuditLog } from "@/server/db/schema";

type Entry = { log: AuditLog; actorName: string | null; actorPhone: string | null; actorRole: string | null };

export function describeAction(action: string): string {
  const [subject, verb] = action.split(".");
  const subjectLabel = subject.replaceAll("_", " ");
  return `${subjectLabel.charAt(0).toUpperCase()}${subjectLabel.slice(1)} ${(verb ?? "").replaceAll("_", " ")}`.trim();
}

export function actorLabel(entry: Pick<Entry, "actorName" | "actorPhone" | "actorRole">): string {
  if (!entry.actorName && !entry.actorPhone) {
    return "System";
  }
  const who = entry.actorName ?? formatPhone(entry.actorPhone ?? "");
  return entry.actorRole === "admin" ? `${who} (admin)` : who;
}

export function AuditTimeline({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return <p className="text-[15px] text-navy/60">No recorded activity.</p>;
  }
  return (
    <ol className="grid gap-4">
      {entries.map((entry) => {
        const note = typeof entry.log.metadata.note === "string" ? entry.log.metadata.note : typeof entry.log.metadata.reason === "string" ? entry.log.metadata.reason : null;
        return (
          <li key={entry.log.id} className="relative border-l-2 border-navy/10 pl-4">
            <p className="text-[14px] font-semibold text-navy">{describeAction(entry.log.action)}</p>
            <p className="text-[13px] text-navy/60">
              {actorLabel(entry)}, {formatDateTime(entry.log.createdAt)}
            </p>
            {note && <p className="mt-1 text-[14px] text-navy/80">{note}</p>}
          </li>
        );
      })}
    </ol>
  );
}
