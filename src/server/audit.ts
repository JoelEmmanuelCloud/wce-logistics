import "server-only";
import type { Database } from "@/server/db";
import { db, schema } from "@/server/db";
import { requestMeta } from "@/server/request";

type AuditEntry = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

type Executor = Pick<Database, "insert">;

export async function recordAudit(entry: AuditEntry, executor: Executor = db()): Promise<void> {
  const ipAddress = entry.actorId === null ? null : (await requestMeta()).ipAddress;
  await executor.insert(schema.auditLogs).values({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    metadata: entry.metadata ?? {},
    ipAddress,
  });
}
