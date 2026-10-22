"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { errorState, successState, validationErrorState, withValues, type FormState } from "@/lib/form-state";
import { driverSchema, driverUpdateSchema } from "@/lib/validation/delivery";
import { requireRole } from "@/server/auth/dal";
import { createDriver, DriverError, setDriverStatus, updateDriver } from "@/server/drivers";
import { notifyDriverInvited } from "@/server/notifications";
import { findVendorProfileByUser } from "@/server/vendors";

const id = z.uuid();

async function verifiedVendor() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  return { user, profile };
}

export async function createDriverAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await verifiedVendor();
  if (profile.verificationStatus !== "verified") {
    return errorState("Your vendor account must be verified before you can add drivers.");
  }
  const parsed = driverSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    licenceNumber: formData.get("licenceNumber") ?? "",
    licenceClass: formData.get("licenceClass") ?? "",
    licenceExpiresOn: formData.get("licenceExpiresOn") ?? "",
  });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }
  let driverId: string;
  try {
    const driver = await createDriver(profile.id, user.id, parsed.data);
    driverId = driver.id;
    after(() => notifyDriverInvited(driver.userId, profile.businessName ?? profile.legalName));
  } catch (error) {
    if (error instanceof DriverError) {
      return withValues(errorState(error.message), formData);
    }
    throw error;
  }
  redirect(`/vendor/drivers/${driverId}`);
}

export async function updateDriverAction(driverId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await verifiedVendor();
  if (!id.safeParse(driverId).success) {
    return errorState("Driver not found.");
  }
  const parsed = driverUpdateSchema.safeParse({
    phone: formData.get("phone") ?? "",
    licenceClass: formData.get("licenceClass") ?? "",
    licenceExpiresOn: formData.get("licenceExpiresOn") ?? "",
  });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }
  try {
    await updateDriver(profile.id, user.id, driverId, parsed.data);
  } catch (error) {
    if (error instanceof DriverError) {
      return withValues(errorState(error.message), formData);
    }
    throw error;
  }
  refresh();
  return successState("Driver details saved.");
}

export async function setDriverStatusAction(driverId: string, status: "active" | "inactive"): Promise<FormState> {
  const { user, profile } = await verifiedVendor();
  if (!id.safeParse(driverId).success) {
    return errorState("Driver not found.");
  }
  try {
    await setDriverStatus(profile.id, user.id, driverId, status);
  } catch (error) {
    if (error instanceof DriverError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState(status === "active" ? "Driver reactivated." : "Driver deactivated. They can no longer see deliveries.");
}
