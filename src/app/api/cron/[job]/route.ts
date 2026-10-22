import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { serverEnv } from "@/server/env";
import { JOB_NAMES, runJob, type JobName } from "@/server/jobs";

export const maxDuration = 300;

function authorized(header: string | null, secret: string): boolean {
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  const provided = createHash("sha256").update(header ?? "").digest();
  return timingSafeEqual(expected, provided);
}

export async function GET(request: Request, context: RouteContext<"/api/cron/[job]">) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "scheduled jobs are not configured" }, { status: 503 });
  }
  if (!authorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { job } = await context.params;
  if (!JOB_NAMES.includes(job as JobName)) {
    return NextResponse.json({ error: "unknown job" }, { status: 404 });
  }
  const summary = await runJob(job as JobName);
  console.log(`[cron] ${job}: ${summary}`);
  return NextResponse.json({ job, summary }, { headers: { "Cache-Control": "no-store" } });
}
