"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { errorState, validationErrorState, withValues, type FormState } from "@/lib/form-state";
import { routeSchema } from "@/lib/validation/marketplace";
import { requireRole } from "@/server/auth/dal";
import { createRoute, MarketplaceError, setRouteStatus } from "@/server/marketplace";
import { getPlatformSettings } from "@/server/settings";
import { findVendorProfileByUser } from "@/server/vendors";

async function requireVerifiedVendor() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  return { user, profile };
}

export async function createRouteAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await requireVerifiedVendor();
  if (profile.verificationStatus !== "verified") {
    return errorState("Your vendor account must be verified before you can schedule trips.");
  }

  const settings = await getPlatformSettings();
  const parsed = routeSchema(settings.minShipmentKg).safeParse({
    truckId: formData.get("truckId") ?? "",
    originState: formData.get("originState") ?? "",
    originCity: formData.get("originCity") ?? "",
    destinationState: formData.get("destinationState") ?? "",
    destinationCity: formData.get("destinationCity") ?? "",
    departureDate: formData.get("departureDate") ?? "",
    transitHours: formData.get("transitHours") ?? "",
    capacityKg: formData.get("capacityKg") ?? "",
    allowsShared: formData.get("allowsShared") ?? undefined,
    ratePerKgKobo: formData.get("ratePerKgKobo") ?? "",
    minimumChargeKobo: formData.get("minimumChargeKobo") ?? "",
    dedicatedPriceKobo: formData.get("dedicatedPriceKobo") ?? "",
  });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }

  try {
    await createRoute(profile.id, user.id, parsed.data);
  } catch (error) {
    if (error instanceof MarketplaceError) {
      return withValues(errorState(error.message), formData);
    }
    throw error;
  }
  redirect("/vendor/routes");
}

const statusSchema = z.object({ routeId: z.uuid(), status: z.enum(["active", "paused", "cancelled"]) });

export async function setRouteStatusAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await requireVerifiedVendor();
  const parsed = statusSchema.safeParse({ routeId: formData.get("routeId"), status: formData.get("status") });
  if (!parsed.success) {
    return errorState("Choose an action.");
  }
  try {
    await setRouteStatus(profile.id, user.id, parsed.data.routeId, parsed.data.status);
  } catch (error) {
    if (error instanceof MarketplaceError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return { status: "idle" };
}
