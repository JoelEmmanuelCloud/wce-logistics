import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { archiveProductAction, removeProductPhotoAction, updateProductAction } from "@/app/vendor/products/actions";
import { ProductForm } from "@/app/vendor/products/product-form";
import { ChevronLeftIcon } from "@/components/line-icons";
import { ProductImage } from "@/components/shop/product-image";
import { ActionButton } from "@/components/ui/action-button";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PRODUCT_STATUS } from "@/lib/labels";
import { KOBO_PER_NAIRA } from "@/lib/pricing";
import { requireRole } from "@/server/auth/dal";
import { findVendorProduct, listProductPhotos, MAX_PRODUCT_PHOTOS } from "@/server/catalog";
import { activeCargoCategories } from "@/server/settings";
import { findVendorProfileByUser } from "@/server/vendors";
import { ProductPhotoUpload } from "./photo-upload";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/vendor/products/[productId]">) {
  const { productId } = await params;
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  const product = /^[0-9a-f-]{36}$/i.test(productId) ? await findVendorProduct(profile.id, productId) : null;
  if (!product) {
    notFound();
  }
  const [photos, categories] = await Promise.all([listProductPhotos(product.id), activeCargoCategories()]);

  return (
    <>
      <Link href="/vendor/products" className="group inline-flex items-center gap-1.5 py-1 text-[14px] font-semibold text-navy/70 transition-colors hover:text-navy">
        <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to products
      </Link>
      <PageHeader title={product.title} action={<StatusBadge status={product.status} map={PRODUCT_STATUS} />} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Details" />
          <ProductForm
            action={updateProductAction.bind(null, product.id)}
            categories={categories}
            submitLabel="Save changes"
            initial={{
              title: product.title,
              description: product.description,
              category: product.category,
              unitLabel: product.unitLabel,
              unitWeightKg: String(product.unitWeightKg),
              priceKobo: String(product.priceKobo / KOBO_PER_NAIRA),
              stockUnits: String(product.stockUnits),
              minOrderUnits: String(product.minOrderUnits),
              status: product.status === "paused" ? "paused" : "active",
            }}
          />
        </Card>
        <div className="order-first grid content-start gap-6 xl:order-none">
          {product.status === "hidden" && (
            <Alert tone="error" title="Hidden by our team">
              {product.statusNote ?? "This product is not visible in the shop."} Contact support to resolve this.
            </Alert>
          )}
          <Card>
            <CardHeader title="Photos" description={`The first photo is the main one. Up to ${MAX_PRODUCT_PHOTOS}.`} />
            {photos.length > 0 && (
              <ul className="mb-5 grid grid-cols-2 gap-3">
                {photos.map((photo) => (
                  <li key={photo.id} className="grid gap-2">
                    <ProductImage photoId={photo.id} alt={`Photo of ${product.title}`} sizes="200px" className="aspect-square rounded-xl" />
                    <ActionButton action={removeProductPhotoAction.bind(null, product.id, photo.id)} label="Remove" pendingLabel="Removing" variant="outline" />
                  </li>
                ))}
              </ul>
            )}
            {photos.length < MAX_PRODUCT_PHOTOS && <ProductPhotoUpload productId={product.id} />}
          </Card>
          <Card>
            <CardHeader title="Remove from the shop" description="Past orders keep their details. This cannot be undone." />
            <ActionButton action={archiveProductAction.bind(null, product.id)} label="Delete product" pendingLabel="Deleting" variant="danger" />
          </Card>
        </div>
      </div>
    </>
  );
}
