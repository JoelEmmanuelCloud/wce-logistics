import type { Metadata } from "next";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { formatDateTime, labelFor, TRUCK_CATEGORIES } from "@/lib/labels";
import { requireRole } from "@/server/auth/dal";
import { getPlatformSettings, listCargoCategories, settingsHistory } from "@/server/settings";
import { AddCargoCategoryForm, CargoCategoryRow, SettingsForm } from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

const FIELD_NAMES: Record<string, string> = {
  commissionBps: "Commission",
  minShipmentKg: "Minimum weight",
  responseWindowHours: "Response window",
  autoCompleteHours: "Automatic completion",
  disputeWindowDays: "Dispute window",
  disabledTruckCategories: "Disabled truck categories",
};

function describeChange(action: string, metadata: Record<string, unknown>): string {
  if (action === "settings.updated") {
    const changes = Object.entries(metadata as Record<string, { from: unknown; to: unknown }>);
    if (changes.length === 0) {
      return "Saved without changes";
    }
    return changes
      .map(([key, change]) => {
        const format = (value: unknown) =>
          key === "commissionBps"
            ? `${Number(value) / 100}%`
            : Array.isArray(value)
              ? value.map((item) => labelFor(TRUCK_CATEGORIES, String(item))).join(", ") || "none"
              : String(value);
        return `${FIELD_NAMES[key] ?? key}: ${format(change.from)} to ${format(change.to)}`;
      })
      .join("; ");
  }
  if (action === "cargo_category.added") {
    return `Added cargo category "${String(metadata.label)}"`;
  }
  const to = metadata.to as { label?: string; active?: boolean } | undefined;
  const from = metadata.from as { label?: string } | undefined;
  if (to?.label) {
    return `Renamed cargo category "${from?.label}" to "${to.label}"`;
  }
  return `${to?.active ? "Restored" : "Retired"} cargo category "${from?.label}"`;
}

export default async function AdminSettingsPage() {
  await requireRole("admin");
  const [settings, categories, history] = await Promise.all([getPlatformSettings(), listCargoCategories(), settingsHistory()]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Marketplace rules and categories. Every change is recorded with who made it, and applies to new bookings and payments only."
      />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Marketplace rules" />
            <SettingsForm
              truckCategories={TRUCK_CATEGORIES}
              defaults={{
                commissionPercent: String(settings.commissionBps / 100),
                minShipmentKg: String(settings.minShipmentKg),
                responseWindowHours: String(settings.responseWindowHours),
                autoCompleteHours: String(settings.autoCompleteHours),
                disputeWindowDays: String(settings.disputeWindowDays),
                enabledTruckCategories: TRUCK_CATEGORIES.map((option) => option.value).filter((value) => !settings.disabledTruckCategories.includes(value)),
              }}
            />
          </Card>
          <Card>
            <CardHeader
              title="Cargo categories"
              description="Shippers choose one for each shipment and vendors choose which their trucks carry. Retired categories disappear from forms but stay on existing records."
            />
            <ul className="grid gap-3">
              {categories.map((category) => (
                <CargoCategoryRow key={category.value} category={category} />
              ))}
            </ul>
            <div className="mt-6 border-t border-navy/10 pt-6">
              <AddCargoCategoryForm />
            </div>
          </Card>
        </div>
        <Card className="self-start">
          <CardHeader title="Recent changes" />
          {history.length === 0 ? (
            <p className="text-[15px] text-navy/70">No changes yet.</p>
          ) : (
            <ol className="grid gap-4">
              {history.map(({ log, actorName }) => (
                <li key={log.id} className="border-l-2 border-navy/10 pl-4">
                  <p className="text-[14px] text-navy">{describeChange(log.action, log.metadata)}</p>
                  <p className="mt-1 text-[12px] text-navy/70">
                    {actorName ?? "System"}, {formatDateTime(log.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
