import Link from "next/link";
import { ProductImage } from "@/components/shop/product-image";
import { formatNaira } from "@/lib/pricing";
import type { CatalogRow } from "@/server/catalog";

export function ProductCard({ row }: { row: CatalogRow }) {
  const { product, photoId, sellerName, sellerCity, sellerState } = row;
  const soldOut = product.stockUnits === 0;
  return (
    <Link
      href={`/shop/${product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white transition-[border-color,box-shadow] hover:border-navy/30 hover:shadow-[0_16px_40px_rgba(11,37,69,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
    >
      <span className="relative block">
        <ProductImage photoId={photoId} alt={product.title} sizes="(min-width: 1280px) 24vw, (min-width: 768px) 32vw, (min-width: 480px) 48vw, 100vw" className="aspect-[4/3]" />
        {soldOut && <span className="absolute left-3 top-3 rounded-full bg-navy px-3 py-1 text-[12px] font-semibold text-white">Out of stock</span>}
      </span>
      <span className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-[16px] font-semibold leading-snug text-navy group-hover:text-orange-ink">{product.title}</span>
        <span className="text-[13px] text-navy/70">
          {sellerName}, {sellerCity}, {sellerState}
        </span>
        <span className="mt-auto pt-2">
          <span className="block font-display text-[26px] leading-none text-navy">{formatNaira(product.priceKobo)}</span>
          <span className="mt-1 block text-[13px] text-navy/70">
            per {product.unitLabel}
            {product.minOrderUnits > 1 && `, minimum ${product.minOrderUnits.toLocaleString("en-NG")}`}
          </span>
        </span>
      </span>
    </Link>
  );
}
