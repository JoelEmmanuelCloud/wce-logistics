import "server-only";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { isNigerianState } from "@/data/nigeria-states";
import { CART_COOKIE, DELIVER_TO_COOKIE, orderTotals, parseCart, serializeCart, type CartLine } from "@/lib/shop";
import { db, schema } from "@/server/db";
import { serverEnv } from "@/server/env";
import { listDeliveryRates } from "@/server/catalog";

const CART_DAYS = 30;

export async function readCart(): Promise<CartLine[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

export async function writeCart(lines: readonly CartLine[]): Promise<void> {
  const store = await cookies();
  if (lines.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, serializeCart(lines), {
    httpOnly: true,
    secure: serverEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CART_DAYS * 24 * 60 * 60,
  });
}

export async function readDeliverTo(): Promise<string> {
  const value = (await cookies()).get(DELIVER_TO_COOKIE)?.value ?? "";
  return isNigerianState(value) ? value : "";
}

export async function writeDeliverTo(state: string): Promise<void> {
  const store = await cookies();
  if (!state) {
    store.delete(DELIVER_TO_COOKIE);
    return;
  }
  store.set(DELIVER_TO_COOKIE, state, { httpOnly: true, secure: serverEnv().NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 180 * 24 * 60 * 60 });
}

export async function cartVendorId(lines: readonly CartLine[]): Promise<string | null> {
  if (lines.length === 0) {
    return null;
  }
  const [row] = await db()
    .select({ vendorId: schema.products.vendorId })
    .from(schema.products)
    .where(eq(schema.products.id, lines[0].productId))
    .limit(1);
  return row?.vendorId ?? null;
}

export function cartLineProblem(product: { status: string; stockUnits: number; minOrderUnits: number; verified: boolean }, quantity: number): string | null {
  if (product.status !== "active" || !product.verified) {
    return "No longer on sale";
  }
  if (product.stockUnits === 0) {
    return "Out of stock";
  }
  if (quantity > product.stockUnits) {
    return `Only ${product.stockUnits.toLocaleString("en-NG")} left`;
  }
  if (quantity < product.minOrderUnits) {
    return `Minimum order is ${product.minOrderUnits.toLocaleString("en-NG")}`;
  }
  return null;
}

export async function loadCart() {
  const stored = await readCart();
  if (stored.length === 0) {
    return { lines: [], seller: null, rates: [], totals: orderTotals([], null), ready: false };
  }
  const rows = await db()
    .select({
      product: schema.products,
      verified: sql<boolean>`${schema.vendorProfiles.verificationStatus} = 'verified'`,
      sellerName: sql<string>`coalesce(${schema.vendorProfiles.businessName}, ${schema.vendorProfiles.legalName})`,
      sellerCity: schema.vendorProfiles.city,
      sellerState: schema.vendorProfiles.state,
      photoId: sql<string | null>`(
        select ${schema.productPhotos.id} from ${schema.productPhotos}
        where ${schema.productPhotos.productId} = ${schema.products.id}
        order by ${schema.productPhotos.uploadedAt} asc limit 1
      )`,
    })
    .from(schema.products)
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.products.vendorId))
    .where(and(inArray(schema.products.id, stored.map((line) => line.productId)), ne(schema.products.status, "archived")));

  const quantities = new Map(stored.map((line) => [line.productId, line.quantity]));
  const lines = rows.map((row) => {
    const quantity = quantities.get(row.product.id) ?? 0;
    return { ...row, quantity, problem: cartLineProblem({ ...row.product, verified: row.verified }, quantity) };
  });
  const first = rows[0];
  const seller = first ? { id: first.product.vendorId, name: first.sellerName, city: first.sellerCity, state: first.sellerState } : null;
  const rates = seller ? await listDeliveryRates(seller.id) : [];
  const totals = orderTotals(
    lines.map((line) => ({ unitPriceKobo: line.product.priceKobo, unitWeightKg: line.product.unitWeightKg, quantity: line.quantity })),
    null,
  );
  return { lines, seller, rates, totals, ready: lines.length > 0 && lines.every((line) => !line.problem) };
}

export type CartView = Awaited<ReturnType<typeof loadCart>>;
