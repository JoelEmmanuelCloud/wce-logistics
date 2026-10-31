import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createProductAction } from "@/app/vendor/products/actions";
import { ProductForm } from "@/app/vendor/products/product-form";
import { ChevronLeftIcon } from "@/components/line-icons";
import { Card, PageHeader } from "@/components/ui/card";
import { requireRole } from "@/server/auth/dal";
import { activeCargoCategories } from "@/server/settings";
import { findVendorProfileByUser } from "@/server/vendors";

export const metadata: Metadata = { title: "Add a product" };

export default async function NewProductPage() {
  const user = await requireRole("vendor");
  const profile = await findVendorProfileByUser(user.id);
  if (!profile) {
    redirect("/vendor/profile");
  }
  const categories = await activeCargoCategories();

  return (
    <>
      <Link href="/vendor/products" className="group inline-flex items-center gap-1.5 py-1 text-[14px] font-semibold text-navy/70 transition-colors hover:text-navy">
        <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to products
      </Link>
      <PageHeader title="Add a product" description="You can add photos on the next step." />
      <Card>
        <ProductForm action={createProductAction} categories={categories} submitLabel="Save and add photos" />
      </Card>
    </>
  );
}
