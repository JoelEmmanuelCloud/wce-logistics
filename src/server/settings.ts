import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { recordAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { TRUCK_CATEGORIES } from "@/lib/labels";
import type { CargoCategory, PlatformSettings } from "@/server/db/schema";
import { serverEnv } from "@/server/env";

export class SettingsError extends Error {}

export type SettingsInput = Pick<PlatformSettings, "commissionBps" | "minShipmentKg" | "responseWindowHours" | "autoCompleteHours" | "disputeWindowDays" | "disabledTruckCategories">;

const DEFAULTS = { minShipmentKg: 50, responseWindowHours: 24, autoCompleteHours: 72, disputeWindowDays: 14 };

async function loadSettings(): Promise<PlatformSettings> {
  const [existing] = await db().select().from(schema.platformSettings).where(eq(schema.platformSettings.id, 1)).limit(1);
  if (existing) {
    return existing;
  }
  await db()
    .insert(schema.platformSettings)
    .values({ id: 1, commissionBps: serverEnv().PLATFORM_COMMISSION_BPS, ...DEFAULTS })
    .onConflictDoNothing();
  const [created] = await db().select().from(schema.platformSettings).where(eq(schema.platformSettings.id, 1)).limit(1);
  return created;
}

export const getPlatformSettings = cache(loadSettings);

export async function updatePlatformSettings(adminId: string, input: SettingsInput): Promise<PlatformSettings> {
  const before = await loadSettings();
  return db().transaction(async (tx) => {
    const [updated] = await tx
      .update(schema.platformSettings)
      .set({ ...input, updatedBy: adminId, updatedAt: sql`now()` })
      .where(eq(schema.platformSettings.id, 1))
      .returning();
    const changes = Object.fromEntries(
      (Object.keys(input) as Array<keyof SettingsInput>)
        .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(input[key]))
        .map((key) => [key, { from: before[key], to: input[key] }]),
    );
    await recordAudit({ actorId: adminId, action: "settings.updated", entityType: "platform_settings", metadata: changes }, tx);
    return updated;
  });
}

async function loadCargoCategories(): Promise<CargoCategory[]> {
  return db().select().from(schema.cargoCategories).orderBy(asc(schema.cargoCategories.position), asc(schema.cargoCategories.label));
}

export const listCargoCategories = cache(loadCargoCategories);

export async function activeCargoCategories(): Promise<Array<{ value: string; label: string }>> {
  return (await listCargoCategories()).filter((category) => category.active).map(({ value, label }) => ({ value, label }));
}

export async function cargoLabels(): Promise<Map<string, string>> {
  return new Map((await listCargoCategories()).map((category) => [category.value, category.label]));
}

export function cargoSlug(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export async function addCargoCategory(adminId: string, label: string): Promise<CargoCategory> {
  const value = cargoSlug(label);
  if (value.length < 2) {
    throw new SettingsError("Use letters or numbers in the category name.");
  }
  return db().transaction(async (tx) => {
    const [{ next }] = await tx.select({ next: sql<number>`coalesce(max(${schema.cargoCategories.position}), 0) + 1` }).from(schema.cargoCategories);
    const [category] = await tx.insert(schema.cargoCategories).values({ value, label, position: next }).onConflictDoNothing().returning();
    if (!category) {
      throw new SettingsError("A cargo category with this name already exists.");
    }
    await recordAudit({ actorId: adminId, action: "cargo_category.added", entityType: "cargo_category", metadata: { value, label } }, tx);
    return category;
  });
}

export async function updateCargoCategory(adminId: string, value: string, changes: { label?: string; active?: boolean }): Promise<void> {
  await db().transaction(async (tx) => {
    const [current] = await tx.select().from(schema.cargoCategories).where(eq(schema.cargoCategories.value, value)).limit(1).for("update");
    if (!current) {
      throw new SettingsError("Cargo category not found.");
    }
    if (changes.active === false) {
      const [{ remaining }] = await tx
        .select({ remaining: sql<number>`count(*)::int` })
        .from(schema.cargoCategories)
        .where(sql`${schema.cargoCategories.active} and ${schema.cargoCategories.value} <> ${value}`);
      if (remaining === 0) {
        throw new SettingsError("Keep at least one cargo category active.");
      }
    }
    await tx
      .update(schema.cargoCategories)
      .set({ ...changes, updatedAt: sql`now()` })
      .where(eq(schema.cargoCategories.value, value));
    await recordAudit(
      { actorId: adminId, action: "cargo_category.updated", entityType: "cargo_category", metadata: { value, from: { label: current.label, active: current.active }, to: changes } },
      tx,
    );
  });
}

export async function truckFormPolicy(current?: { category: string; cargoTypes: readonly string[] }) {
  const [settings, categories] = await Promise.all([getPlatformSettings(), listCargoCategories()]);
  const cargoOptions = categories
    .filter((category) => category.active || current?.cargoTypes.includes(category.value))
    .map(({ value, label }) => ({ value, label }));
  const categoryOptions = TRUCK_CATEGORIES.filter((option) => !settings.disabledTruckCategories.includes(option.value) || option.value === current?.category).map(
    ({ value, label }) => ({ value, label }),
  );
  return {
    cargoOptions,
    categoryOptions,
    policy: { cargoTypes: cargoOptions.map((option) => option.value), truckCategories: categoryOptions.map((option) => option.value) },
  };
}
