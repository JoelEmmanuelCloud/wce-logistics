"use server";

import { after } from "next/server";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isNigerianState } from "@/data/nigeria-states";
import { errorState, successState, validationErrorState, withValues, type FormState } from "@/lib/form-state";
import { MAX_CART_LINES, MAX_CART_QUANTITY, setCartLine } from "@/lib/shop";
import { checkoutSchema } from "@/lib/validation/shop";
import { requireRole } from "@/server/auth/dal";
import { cartVendorId, readCart, writeCart, writeDeliverTo } from "@/server/cart";
import { getCatalogProduct } from "@/server/catalog";
import { notifyOrder } from "@/server/notifications";
import { OrderError, placeOrder } from "@/server/orders";

const idSchema = z.uuid();
const quantitySchema = z.coerce.number({ message: "Enter a quantity." }).int("Enter a whole number.").min(1, "Enter a quantity.").max(MAX_CART_QUANTITY, "That is more than we can take in one order.");

export async function chooseDeliverToAction(formData: FormData): Promise<void> {
  const state = String(formData.get("deliverTo") ?? "");
  await writeDeliverTo(isNigerianState(state) ? state : "");
  refresh();
}

export async function addToCartAction(productId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const quantity = quantitySchema.safeParse(formData.get("quantity"));
  if (!quantity.success) {
    return errorState(quantity.error.issues[0].message);
  }
  const product = await getCatalogProduct(idSchema.parse(productId));
  if (!product) {
    return errorState("This product is no longer on sale.");
  }
  if (product.rates.length === 0) {
    return errorState("This seller is not taking orders right now.");
  }
  if (quantity.data < product.product.minOrderUnits) {
    return errorState(`The minimum order is ${product.product.minOrderUnits.toLocaleString("en-NG")}.`);
  }
  if (quantity.data > product.product.stockUnits) {
    return errorState(`Only ${product.product.stockUnits.toLocaleString("en-NG")} left in stock.`);
  }
  const lines = await readCart();
  const currentSeller = await cartVendorId(lines);
  if (currentSeller && currentSeller !== product.product.vendorId) {
    return errorState("Your cart has goods from another seller. Each order comes from one seller, so finish that order or empty your cart first.");
  }
  if (lines.length >= MAX_CART_LINES && !lines.some((line) => line.productId === product.product.id)) {
    return errorState("Your cart is full.");
  }
  await writeCart(setCartLine(lines, product.product.id, quantity.data));
  refresh();
  return successState("Added to your cart.");
}

export async function updateCartLineAction(productId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const quantity = quantitySchema.safeParse(formData.get("quantity"));
  if (!quantity.success) {
    return errorState(quantity.error.issues[0].message);
  }
  await writeCart(setCartLine(await readCart(), idSchema.parse(productId), quantity.data));
  refresh();
  return successState("Cart updated.");
}

export async function removeCartLineAction(productId: string): Promise<FormState> {
  await writeCart(setCartLine(await readCart(), idSchema.parse(productId), 0));
  refresh();
  return successState("Removed from your cart.");
}

export async function emptyCartAction(): Promise<FormState> {
  await writeCart([]);
  refresh();
  return successState("Your cart is empty.");
}

export async function placeOrderAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("customer");
  const parsed = checkoutSchema.safeParse({
    destinationState: formData.get("destinationState") ?? "",
    destinationCity: formData.get("destinationCity") ?? "",
    destinationAddress: formData.get("destinationAddress") ?? "",
    deliveryNotes: formData.get("deliveryNotes") ?? "",
  });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }
  let orderId: string;
  try {
    const order = await placeOrder(user.id, await readCart(), parsed.data);
    orderId = order.id;
    after(() => notifyOrder("order.placed", order));
  } catch (error) {
    if (error instanceof OrderError) {
      return withValues(errorState(error.message), formData);
    }
    throw error;
  }
  await writeCart([]);
  redirect(`/account/orders/${orderId}`);
}
