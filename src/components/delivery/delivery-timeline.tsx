import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DELIVERY_EVENT, formatDateTime } from "@/lib/labels";
import type { listDeliveryEvents } from "@/server/delivery";

type Row = Awaited<ReturnType<typeof listDeliveryEvents>>[number];

const ROLE_NAMES: Record<string, string> = { driver: "Driver", vendor: "Vendor", customer: "Shipper", admin: "WCE Logistics" };

export function DeliveryTimeline({ rows, title = "Delivery progress" }: { rows: Row[]; title?: string }) {
  return (
    <Card>
      <CardHeader title={title} />
      {rows.length === 0 ? (
        <p className="text-[15px] text-navy/70">No delivery updates yet.</p>
      ) : (
        <ol className="grid gap-4">
          {rows.map(({ event, actorName, actorRole }) => (
            <li key={event.id} className="relative border-l-2 border-navy/10 pl-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={event.kind} map={DELIVERY_EVENT} />
                <span className="text-[13px] text-navy/70">{formatDateTime(event.createdAt)}</span>
              </div>
              {actorRole && (
                <p className="mt-1 text-[13px] text-navy/70">
                  {ROLE_NAMES[actorRole] ?? "User"}
                  {actorName ? `: ${actorName}` : ""}
                </p>
              )}
              {event.recipientName && <p className="mt-1 text-[14px] font-semibold text-navy">Received by {event.recipientName}</p>}
              {event.note && <p className="mt-1 text-[14px] text-navy/80">{event.note}</p>}
              {event.photoStorageKey && (
                <a
                  href={`/files/delivery-photos/${event.id}`}
                  target="_blank"
                  rel="noopener"
                  className="mt-2 inline-flex text-[14px] font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4"
                >
                  View photo
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
