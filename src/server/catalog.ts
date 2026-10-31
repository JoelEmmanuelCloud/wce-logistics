import "server-only";
import { and, asc, count, desc, eq, exists, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import type { DeliveryRateFormInput, ProductInput } from "@/lib/validation/shop";
import { escapeLike, pageOf } from "@/server/admin";
import { recordAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import type { DeliveryRate, Product, ProductPhoto } from "@/server/db/schema";
import { activeCargoCategories } from "@/server/settings";

export class CatalogError extends Error {}

export const CATALOG_PAGE_SIZE = 24;
export const MAX_PRODUCT_PHOTOS = 6;

const sellerName = sql<string>`coalesce(${schema.vendorProfiles.businessName}, ${schema.vendorProfiles.legalName})`;

const firstPhotoId = sql<string | null>`(
  select ${schema.productPhotos.id} from ${schema.productPhotos}
  where ${schema.productPhotos.productId} = ${schema.products.id}
  order by ${schema.productPhotos.uploadedAt} asc limit 1
)`;

const onSale = and(eq(schema.products.status, "active"), eq(schema.vendorProfiles.verificationStatus, "verified"));

export type CatalogFilter = { query: string; category: string; state: string; sellerId: string; page: number };

export async function listCatalog({ query, category, state, sellerId, page }: CatalogFilter) {
  const conditions: Array<SQL | undefined> = [onSale];
  if (query) {
    const pattern = `%${escapeLike(query)}%`;
    conditions.push(or(ilike(schema.products.title, pattern), ilike(schema.products.description, pattern)));
  }
  if (category) {
    conditions.push(eq(schema.products.category, category));
  }
  if (sellerId) {
    conditions.push(eq(schema.products.vendorId, sellerId));
  }
  if (state) {
    conditions.push(
      exists(
        db()
          .select({ id: schema.deliveryRates.id })
          .from(schema.deliveryRates)
          .where(and(eq(schema.deliveryRates.vendorId, schema.products.vendorId), eq(schema.deliveryRates.destinationState, state))),
      ),
    );
  }
  const where = and(...conditions);
  const [rows, totals] = await Promise.all([
    db()
      .select({ product: schema.products, sellerName, sellerCity: schema.vendorProfiles.city, sellerState: schema.vendorProfiles.state, photoId: firstPhotoId })
      .from(schema.products)
      .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.products.vendorId))
      .where(where)
      .orderBy(sql`case when ${schema.products.stockUnits} > 0 then 0 else 1 end`, desc(schema.products.createdAt))
      .limit(CATALOG_PAGE_SIZE)
      .offset((page - 1) * CATALOG_PAGE_SIZE),
    db()
      .select({ value: count() })
      .from(schema.products)
      .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.products.vendorId))
      .where(where),
  ]);
  return { ...pageOf(rows, totals[0]?.value ?? 0, page), pageCount: Math.max(1, Math.ceil((totals[0]?.value ?? 0) / CATALOG_PAGE_SIZE)) };
}

export type CatalogRow = Awaited<ReturnType<typeof listCatalog>>["rows"][number];

export async function catalogCategories(): Promise<Array<{ value: string; label: string }>> {
  const [categories, used] = await Promise.all([
    activeCargoCategories(),
    db()
      .selectDistinct({ category: schema.products.category })
      .from(schema.products)
      .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.products.vendorId))
      .where(onSale),
  ]);
  const inUse = new Set(used.map((row) => row.category));
  return categories.filter((category) => inUse.has(category.value));
}

export async function getCatalogProduct(productId: string) {
  const [row] = await db()
    .select({ product: schema.products, sellerName, sellerCity: schema.vendorProfiles.city, sellerState: schema.vendorProfiles.state })
    .from(schema.products)
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.products.vendorId))
    .where(and(eq(schema.products.id, productId), onSale))
    .limit(1);
  if (!row) {
    return null;
  }
  const [photos, rates] = await Promise.all([listProductPhotos(productId), listDeliveryRates(row.product.vendorId)]);
  return { ...row, photos, rates };
}

export async function listProductsForVendor(vendorId: string) {
  return db()
    .select({ product: schema.products, photoId: firstPhotoId })
    .from(schema.products)
    .where(and(eq(schema.products.vendorId, vendorId), ne(schema.products.status, "archived")))
    .orderBy(desc(schema.products.createdAt));
}

export async function findVendorProduct(vendorId: string, productId: string): Promise<Product | null> {
  const [product] = await db()
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.id, productId), eq(schema.products.vendorId, vendorId), ne(schema.products.status, "archived")))
    .limit(1);
  return product ?? null;
}

export async function createProduct(vendorId: string, actorId: string, input: ProductInput): Promise<Product> {
  return db().transaction(async (tx) => {
    const [product] = await tx.insert(schema.products).values({ vendorId, ...input }).returning();
    await recordAudit({ actorId, action: "product.created", entityType: "product", entityId: product.id, metadata: { title: product.title } }, tx);
    return product;
  });
}

export async function updateProduct(vendorId: string, actorId: string, productId: string, input: ProductInput): Promise<void> {
  await db().transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.id, productId), eq(schema.products.vendorId, vendorId), ne(schema.products.status, "archived")))
      .limit(1)
      .for("update");
    if (!current) {
      throw new CatalogError("Product not found.");
    }
    const status = current.status === "hidden" ? "hidden" : input.status;
    await tx.update(schema.products).set({ ...input, status }).where(eq(schema.products.id, current.id));
    await recordAudit({ actorId, action: "product.updated", entityType: "product", entityId: current.id, metadata: { status } }, tx);
  });
}

export async function archiveProduct(vendorId: string, actorId: string, productId: string): Promise<void> {
  await db().transaction(async (tx) => {
    const [archived] = await tx
      .update(schema.products)
      .set({ status: "archived" })
      .where(and(eq(schema.products.id, productId), eq(schema.products.vendorId, vendorId)))
      .returning({ id: schema.products.id });
    if (!archived) {
      throw new CatalogError("Product not found.");
    }
    await recordAudit({ actorId, action: "product.archived", entityType: "product", entityId: archived.id }, tx);
  });
}

export async function listProductPhotos(productId: string): Promise<ProductPhoto[]> {
  return db().select().from(schema.productPhotos).where(eq(schema.productPhotos.productId, productId)).orderBy(asc(schema.productPhotos.uploadedAt));
}

export async function findPublicPhoto(photoId: string): Promise<{ storageKey: string } | null> {
  const [photo] = await db()
    .select({ storageKey: schema.productPhotos.storageKey })
    .from(schema.productPhotos)
    .innerJoin(schema.products, eq(schema.products.id, schema.productPhotos.productId))
    .where(and(eq(schema.productPhotos.id, photoId), ne(schema.products.status, "archived")))
    .limit(1);
  return photo ?? null;
}

export async function listDeliveryRates(vendorId: string): Promise<DeliveryRate[]> {
  return db().select().from(schema.deliveryRates).where(eq(schema.deliveryRates.vendorId, vendorId)).orderBy(asc(schema.deliveryRates.destinationState));
}

export async function saveDeliveryRate(vendorId: string, actorId: string, input: DeliveryRateFormInput): Promise<void> {
  await db().transaction(async (tx) => {
    const { ratePerTonneKobo, minimumChargeKobo, destinationState } = input;
    await tx
      .insert(schema.deliveryRates)
      .values({ vendorId, destinationState, ratePerTonneKobo, minimumChargeKobo })
      .onConflictDoUpdate({
        target: [schema.deliveryRates.vendorId, schema.deliveryRates.destinationState],
        set: { ratePerTonneKobo, minimumChargeKobo, updatedAt: sql`now()` },
      });
    await recordAudit({ actorId, action: "delivery_rate.saved", entityType: "vendor", entityId: vendorId, metadata: { destinationState, ratePerTonneKobo, minimumChargeKobo } }, tx);
  });
}

export async function removeDeliveryRate(vendorId: string, actorId: string, rateId: string): Promise<void> {
  await db().transaction(async (tx) => {
    const [removed] = await tx
      .delete(schema.deliveryRates)
      .where(and(eq(schema.deliveryRates.id, rateId), eq(schema.deliveryRates.vendorId, vendorId)))
      .returning({ state: schema.deliveryRates.destinationState });
    if (removed) {
      await recordAudit({ actorId, action: "delivery_rate.removed", entityType: "vendor", entityId: vendorId, metadata: { destinationState: removed.state } }, tx);
    }
  });
}

export const PRODUCT_FILTERS = {
  active: { label: "On sale", statuses: ["active"] },
  paused: { label: "Paused", statuses: ["paused"] },
  hidden: { label: "Hidden", statuses: ["hidden"] },
  all: { label: "All", statuses: ["active", "paused", "hidden"] },
} as const;

export type ProductFilter = keyof typeof PRODUCT_FILTERS;

export async function listProductsForAdmin({ filter, query, page }: { filter: ProductFilter; query: string; page: number }) {
  const conditions: Array<SQL | undefined> = [inArray(schema.products.status, [...PRODUCT_FILTERS[filter].statuses])];
  if (query) {
    const pattern = `%${escapeLike(query)}%`;
    conditions.push(or(ilike(schema.products.title, pattern), ilike(schema.vendorProfiles.businessName, pattern), ilike(schema.vendorProfiles.legalName, pattern)));
  }
  const where = and(...conditions);
  const [rows, totals] = await Promise.all([
    db()
      .select({ product: schema.products, sellerName, photoId: firstPhotoId })
      .from(schema.products)
      .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.products.vendorId))
      .where(where)
      .orderBy(desc(schema.products.createdAt))
      .limit(50)
      .offset((page - 1) * 50),
    db()
      .select({ value: count() })
      .from(schema.products)
      .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.products.vendorId))
      .where(where),
  ]);
  return { rows, total: totals[0]?.value ?? 0, page, pageCount: Math.max(1, Math.ceil((totals[0]?.value ?? 0) / 50)) };
}

export async function setProductVisibility(adminId: string, productId: string, visible: boolean, note: string | null): Promise<Product> {
  return db().transaction(async (tx) => {
    const [product] = await tx
      .update(schema.products)
      .set({ status: visible ? "paused" : "hidden", statusNote: note })
      .where(and(eq(schema.products.id, productId), ne(schema.products.status, "archived")))
      .returning();
    if (!product) {
      throw new CatalogError("Product not found.");
    }
    await recordAudit({ actorId: adminId, action: visible ? "product.unhidden" : "product.hidden", entityType: "product", entityId: product.id, metadata: { note } }, tx);
    return product;
  });
}
