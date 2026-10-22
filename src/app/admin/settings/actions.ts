"use server";

import { refresh } from "next/cache";
import { errorState, successState, validationErrorState, withValues, type FormState } from "@/lib/form-state";
import { cargoLabelSchema, settingsSchema } from "@/lib/validation/settings";
import { requireRole } from "@/server/auth/dal";
import { addCargoCategory, SettingsError, updateCargoCategory, updatePlatformSettings } from "@/server/settings";

export async function saveSettingsAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const parsed = settingsSchema.safeParse({
    commissionPercent: formData.get("commissionPercent") ?? "",
    minShipmentKg: formData.get("minShipmentKg") ?? "",
    responseWindowHours: formData.get("responseWindowHours") ?? "",
    autoCompleteHours: formData.get("autoCompleteHours") ?? "",
    disputeWindowDays: formData.get("disputeWindowDays") ?? "",
    enabledTruckCategories: formData.getAll("enabledTruckCategories").map(String),
  });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }
  await updatePlatformSettings(admin.id, parsed.data);
  refresh();
  return successState("Settings saved. They apply from now on; existing bookings and payments keep the terms they started with.");
}

export async function addCargoCategoryAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const label = cargoLabelSchema.safeParse(formData.get("label") ?? "");
  if (!label.success) {
    return withValues(errorState(label.error.issues[0].message, { label: [label.error.issues[0].message] }), formData);
  }
  try {
    await addCargoCategory(admin.id, label.data);
  } catch (error) {
    if (error instanceof SettingsError) {
      return withValues(errorState(error.message, { label: [error.message] }), formData);
    }
    throw error;
  }
  refresh();
  return successState(`Added "${label.data}".`);
}

export async function renameCargoCategoryAction(value: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const label = cargoLabelSchema.safeParse(formData.get("label") ?? "");
  if (!label.success) {
    return errorState(label.error.issues[0].message, { label: [label.error.issues[0].message] });
  }
  try {
    await updateCargoCategory(admin.id, value, { label: label.data });
  } catch (error) {
    if (error instanceof SettingsError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Name saved.");
}

export async function setCargoCategoryActiveAction(value: string, active: boolean): Promise<FormState> {
  const admin = await requireRole("admin");
  try {
    await updateCargoCategory(admin.id, value, { active });
  } catch (error) {
    if (error instanceof SettingsError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState(active ? "Category restored." : "Category retired. Existing shipments and trucks keep it.");
}
