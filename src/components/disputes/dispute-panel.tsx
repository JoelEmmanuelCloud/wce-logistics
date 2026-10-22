import type { ReactNode } from "react";
import { Card, CardHeader, DescriptionList } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DISPUTE_CATEGORIES, DISPUTE_STATUS, formatDateTime, labelFor } from "@/lib/labels";
import type { Dispute } from "@/server/db/schema";
import { disputeRole, type disputeThread } from "@/server/disputes";

type Thread = Awaited<ReturnType<typeof disputeThread>>;

export function DisputeSummary({ dispute, openedByName }: { dispute: Dispute; openedByName?: string | null }) {
  return (
    <Card>
      <CardHeader title="Dispute" action={<StatusBadge status={dispute.status} map={DISPUTE_STATUS} />} />
      <DescriptionList
        items={[
          { label: "Problem", value: labelFor(DISPUTE_CATEGORIES, dispute.category) },
          { label: "Opened", value: `${formatDateTime(dispute.createdAt)} by ${openedByName ?? disputeRole(dispute.openedByRole)}` },
          { label: "Description", value: dispute.description },
          ...(dispute.resolution ? [{ label: "Outcome", value: dispute.resolution }] : []),
        ]}
      />
    </Card>
  );
}

export function DisputeThread({ thread, reply }: { thread: Thread; reply?: ReactNode }) {
  return (
    <Card>
      <CardHeader title="Messages" description="Visible to the shipper, the vendor and the WCE Logistics team." />
      {thread.length === 0 ? (
        <p className="text-[15px] text-navy/70">No messages yet.</p>
      ) : (
        <ol className="grid gap-4">
          {thread.map(({ message, authorName }) => (
            <li
              key={message.id}
              className={`rounded-lg border p-4 ${message.authorRole === "admin" ? "border-orange/40 bg-orange/[0.06]" : "border-navy/10 bg-white"}`}
            >
              <p className="text-[13px] font-semibold text-navy">
                {disputeRole(message.authorRole)}
                {authorName && message.authorRole !== "admin" ? `: ${authorName}` : ""}
                <span className="font-normal text-navy/70"> {formatDateTime(message.createdAt)}</span>
              </p>
              <p className="mt-1 whitespace-pre-line text-[15px] text-navy/90">{message.body}</p>
              {message.attachmentStorageKey && (
                <a
                  href={`/files/dispute-files/${message.id}`}
                  target="_blank"
                  rel="noopener"
                  className="mt-2 inline-flex text-[14px] font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4"
                >
                  {message.attachmentFileName ?? "View attachment"}
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
      {reply && <div className="mt-6 border-t border-navy/10 pt-6">{reply}</div>}
    </Card>
  );
}
