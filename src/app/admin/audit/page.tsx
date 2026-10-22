import type { Metadata } from "next";
import { actorLabel, describeAction } from "@/components/admin/audit-timeline";
import { DataTable, Pagination } from "@/components/admin/list-controls";
import { PageHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/labels";
import { listAuditLogs, parsePage } from "@/server/admin";
import { requireRole } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Audit log" };

function summarize(metadata: Record<string, unknown>): string {
  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key.replace(/([A-Z])/g, " $1").toLowerCase()}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join("; ");
}

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireRole("admin");
  const params = await searchParams;
  const page = parsePage(params.page);
  const result = await listAuditLogs({ page });

  return (
    <>
      <PageHeader title="Audit log" description="Every sign-in, submission and administrative decision, newest first." />
      <DataTable caption="Audit log" headers={["When", "Actor", "Action", "Entity", "Details"]}>
        {result.rows.map((entry) => (
          <tr key={entry.log.id} className="align-top hover:bg-navy/[0.02]">
            <td className="px-4 py-3 whitespace-nowrap text-navy/80">{formatDateTime(entry.log.createdAt)}</td>
            <td className="px-4 py-3 text-navy">{actorLabel(entry)}</td>
            <td className="px-4 py-3 font-semibold text-navy">{describeAction(entry.log.action)}</td>
            <td className="px-4 py-3 text-navy/70">
              {entry.log.entityType.replaceAll("_", " ")}
              {entry.log.entityId && <span className="block font-mono text-[12px] text-navy/70">{entry.log.entityId.slice(0, 8)}</span>}
            </td>
            <td className="max-w-[360px] px-4 py-3 text-[13px] text-navy/70">{summarize(entry.log.metadata)}</td>
          </tr>
        ))}
      </DataTable>
      <Pagination base="/admin/audit" page={result.page} pageCount={result.pageCount} total={result.total} params={{}} />
    </>
  );
}
