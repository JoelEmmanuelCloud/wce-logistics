"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { errorState, successState, type FormState } from "@/lib/form-state";
import { requireRole } from "@/server/auth/dal";
import { CatalogError, setProductVisibility } from "@/server/catalog";

export async function hideProductAction(productId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const reason = z.string().trim().min(3, "Tell the seller why.").max(500).safeParse(formData.get("reason"));
  if (!reason.success) {
    return errorState(reason.error.issues[0].message);
  }
  try {
    await setProductVisibility(admin.id, z.uuid().parse(productId), false, reason.data);
  } catch (error) {
    if (error instanceof CatalogError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Product hidden from the shop.");
}

export async function restoreProductAction(productId: string): Promise<FormState> {
  const admin = await requireRole("admin");
  try {
    await setProductVisibility(admin.id, z.uuid().parse(productId), true, null);
  } catch (error) {
    if (error instanceof CatalogError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Product restored. The seller can put it back on sale.");
}
