import Image from "next/image";
import Link from "next/link";
import { ArrowButton } from "@/components/action-buttons";
import { DisplayHeading, Section } from "@/components/section";
import { IMAGES } from "@/data/images";

const CATEGORIES = [
  { label: "Construction materials", category: "construction_materials", image: IMAGES.construction },
  { label: "Farm produce", category: "agricultural_produce", image: IMAGES.agriculture },
  { label: "Packaged food", category: "packaged_food", image: IMAGES.retail },
  { label: "General goods", category: "general_goods", image: IMAGES.warehouse },
];

export function ShopSection() {
  return (
    <Section id="shop" tone="navy" labelledBy="shop-title" watermark="left">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <DisplayHeading id="shop-title">
          Buy it.
          <span className="block pl-[0.6em] text-orange">They haul it.</span>
        </DisplayHeading>
        <div className="flex flex-col gap-6 lg:items-end">
          <p className="max-w-[32em] text-[clamp(17px,1.35vw,21px)] leading-relaxed text-white/75 lg:text-right">
            Shop bulk goods from verified sellers. The seller delivers on their own checked truck, and you track it to your door. You pay only after they accept your order.
          </p>
          <ArrowButton href="/shop" label="Browse the shop" />
        </div>
      </div>
      <ul className="mt-[clamp(40px,5vw,72px)] grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        {CATEGORIES.map(({ label, category, image }) => (
          <li key={category}>
            <Link href={`/shop?category=${category}`} className="group relative block aspect-[4/5] overflow-hidden rounded-[22px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange">
              <Image src={image.src} alt="" fill sizes="(min-width: 1024px) 24vw, 48vw" className="object-cover transition-[scale] duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/10 to-transparent" aria-hidden="true" />
              <span className="absolute inset-x-4 bottom-4 font-display text-[clamp(22px,2.2vw,34px)] uppercase leading-[0.95] text-white">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
