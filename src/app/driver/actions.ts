"use server";

import { z } from "zod";
import { errorState, type FormState } from "@/lib/form-state";
import { requireRole } from "@/server/auth/dal";
import { applyDeliveryUpdate } from "@/server/delivery-form";
import { activeDriverFor } from "@/server/drivers";

export async function driverDeliveryUpdateAction(bookingId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("driver");
  const session = await activeDriverFor(user.id);
  if (!session) {
    return errorState("Your driver account is not active.");
  }
  if (!z.uuid().safeParse(bookingId).success) {
    return errorState("Delivery not found.");
  }
  return applyDeliveryUpdate({ userId: user.id, role: "driver", driverId: session.driver.id }, bookingId, formData);
}
