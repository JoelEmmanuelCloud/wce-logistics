import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { recordAudit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth/dal";
import { EXPORT_DATASETS, exportRows, parseRange, periodFor, type ExportDataset } from "@/server/reports";

export async function GET(request: NextRequest, context: RouteContext<"/admin/reports/export/[dataset]">) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Sign in required", { status: 401 });
  }
  if (user.role !== "admin" || user.status !== "active") {
    return new NextResponse("Not found", { status: 404 });
  }
  const { dataset } = await context.params;
  if (!EXPORT_DATASETS.includes(dataset as ExportDataset)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const range = parseRange(request.nextUrl.searchParams.get("range") ?? undefined);
  const period = periodFor(range);
  const { headers, rows } = await exportRows(dataset as ExportDataset, period);
  await recordAudit({ actorId: user.id, action: "report.exported", entityType: "report", metadata: { dataset, range, rows: rows.length } });

  const fileName = `wce-${dataset}-${period.fromDate ?? "start"}-to-${period.toDate}.csv`;
  return new NextResponse(`﻿${toCsv(headers, rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
