"use server";

import { and, count, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { errorState, successState, validationErrorState, withValues, type FormState } from "@/lib/form-state";
import { deliveryRateSchema, productSchema } from "@/lib/validation/shop";
import { requireRole } from "@/server/auth/dal";
import { archiveProduct, CatalogError, createProduct, findVendorProduct, MAX_PRODUCT_PHOTOS, removeDeliveryRate, saveDeliveryRate, updateProduct } from "@/server/catalog";
import { db, schema } from "@/server/db";
import { activeCargoCategories } from "@/server/settings";
import { deleteStoredObject, storeUpload, UploadRejectedError } from "@/server/storage";
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

function readProductForm(formData: FormData) {
  return {
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
    unitLabel: formData.get("unitLabel") ?? "",
    unitWeightKg: formData.get("unitWeightKg") ?? "",
    priceKobo: formData.get("priceKobo") ?? "",
    stockUnits: formData.get("stockUnits") ?? "",
    minOrderUnits: formData.get("minOrderUnits") ?? "",
    status: formData.get("status") ?? "",
  };
}

async function parseProduct(formData: FormData) {
  const categories = await activeCargoCategories();
  return productSchema(categories.map((category) => category.value)).safeParse(readProductForm(formData));
}

export async function createProductAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await requireSeller();
  const parsed = await parseProduct(formData);
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }
  const product = await createProduct(profile.id, user.id, parsed.data);
  redirect(`/vendor/products/${product.id}`);
}

export async function updateProductAction(productId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await requireSeller();
  const parsed = await parseProduct(formData);
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }
  try {
    await updateProduct(profile.id, user.id, idSchema.parse(productId), parsed.data);
  } catch (error) {
    if (error instanceof CatalogError) {
      return withValues(errorState(error.message), formData);
    }
    throw error;
  }
  refresh();
  return successState("Product saved.");
}

export async function archiveProductAction(productId: string): Promise<FormState> {
  const { user, profile } = await requireSeller();
  try {
    await archiveProduct(profile.id, user.id, idSchema.parse(productId));
  } catch (error) {
    if (error instanceof CatalogError) {
      return errorState(error.message);
    }
    throw error;
  }
  redirect("/vendor/products");
}

export async function uploadProductPhotoAction(productId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const { profile } = await requireSeller();
  const product = await findVendorProduct(profile.id, idSchema.parse(productId));
  if (!product) {
    return errorState("Product not found.");
  }
  const [{ value }] = await db().select({ value: count() }).from(schema.productPhotos).where(eq(schema.productPhotos.productId, product.id));
  if (value >= MAX_PRODUCT_PHOTOS) {
    return errorState(`A product can have up to ${MAX_PRODUCT_PHOTOS} photos. Remove one first.`);
  }
  try {
    const stored = await storeUpload(formData.get("file") as File, `products/${product.id}`, "image");
    await db().insert(schema.productPhotos).values({ productId: product.id, storageKey: stored.storageKey, contentType: stored.contentType, sizeBytes: stored.sizeBytes });
  } catch (error) {
    if (error instanceof UploadRejectedError) {
      return errorState(error.message, { file: [error.message] });
    }
    throw error;
  }
  refresh();
  return successState("Photo added.");
}

export async function removeProductPhotoAction(productId: string, photoId: string): Promise<FormState> {
  const { profile } = await requireSeller();
  const product = await findVendorProduct(profile.id, idSchema.parse(productId));
  if (!product) {
    return errorState("Product not found.");
  }
  const [removed] = await db()
    .delete(schema.productPhotos)
    .where(and(eq(schema.productPhotos.id, idSchema.parse(photoId)), eq(schema.productPhotos.productId, product.id)))
    .returning({ storageKey: schema.productPhotos.storageKey });
  if (removed) {
    await deleteStoredObject(removed.storageKey).catch((error) => console.error(error));
  }
  refresh();
  return successState("Photo removed.");
}

export async function saveDeliveryRateAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { user, profile } = await requireSeller();
  const parsed = deliveryRateSchema.safeParse({
    destinationState: formData.get("destinationState") ?? "",
    ratePerTonneKobo: formData.get("ratePerTonneKobo") ?? "",
    minimumChargeKobo: formData.get("minimumChargeKobo") ?? "",
  });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }
  await saveDeliveryRate(profile.id, user.id, parsed.data);
  refresh();
  return successState(`Delivery rate for ${parsed.data.destinationState} saved.`);
}

export async function removeDeliveryRateAction(rateId: string): Promise<FormState> {
  const { user, profile } = await requireSeller();
  await removeDeliveryRate(profile.id, user.id, idSchema.parse(rateId));
  refresh();
  return successState("Delivery rate removed.");
}
