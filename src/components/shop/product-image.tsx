import Image from "next/image";
import { BoxIcon } from "@/components/line-icons";
import { photoPath } from "@/lib/shop";

export function ProductImage({ photoId, alt, sizes, className }: { photoId: string | null; alt: string; sizes: string; className?: string }) {
  return (
    <span className={`relative block overflow-hidden bg-sand ${className ?? ""}`}>
      {photoId ? (
        <Image src={photoPath(photoId)} alt={alt} fill sizes={sizes} className="object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-navy/25">
          <BoxIcon className="size-1/3" />
        </span>
      )}
    </span>
  );
}
