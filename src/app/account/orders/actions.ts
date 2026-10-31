"use server";

import { after } from "next/server";
import { refresh } from "next/cache";
import { z } from "zod";
import { errorState, successState, type FormState } from "@/lib/form-state";
import { requireRole } from "@/server/auth/dal";
import { notifyOrder } from "@/server/notifications";
import { cancelOrder, OrderError } from "@/server/orders";

export async function cancelOrderAction(orderId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("customer");
  const reason = z.string().trim().min(3, "Tell the seller why.").max(500).safeParse(formData.get("reason"));
  if (!reason.success) {
    return errorState(reason.error.issues[0].message);
  }
  try {
    const order = await cancelOrder(user.id, z.uuid().parse(orderId), reason.data);
    after(() => notifyOrder("order.cancelled", order));
  } catch (error) {
    if (error instanceof OrderError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Order cancelled.");
}
