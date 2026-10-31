"use server";

import { after } from "next/server";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { errorState, successState, validationErrorState, type FormState } from "@/lib/form-state";
import { acceptOrderSchema } from "@/lib/validation/shop";
import { requireRole } from "@/server/auth/dal";
import { notifyOrder } from "@/server/notifications";
import { acceptOrder, declineOrder, OrderError } from "@/server/orders";
import { findVendorProfileByUser } from "@/server/vendors";

const idSchema = z.uuid();

async function requireSeller() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  return { user, profile };
}

export async function acceptOrderAction(orderId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await requireSeller();
  const parsed = acceptOrderSchema.safeParse({
    truckId: formData.get("truckId") ?? "",
    departureDate: formData.get("departureDate") ?? "",
    transitHours: formData.get("transitHours") ?? "",
  });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }
  try {
    const order = await acceptOrder(profile.id, user.id, idSchema.parse(orderId), parsed.data);
    after(() => notifyOrder("order.accepted", order));
  } catch (error) {
    if (error instanceof OrderError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Order accepted. The buyer can now pay.");
}

export async function declineOrderAction(orderId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await requireSeller();
  const reason = z.string().trim().min(3, "Tell the buyer why.").max(500).safeParse(formData.get("reason"));
  if (!reason.success) {
    return errorState(reason.error.issues[0].message);
  }
  try {
    const order = await declineOrder(profile.id, user.id, idSchema.parse(orderId), reason.data);
    after(() => notifyOrder("order.declined", order));
  } catch (error) {
    if (error instanceof OrderError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Order declined.");
}
