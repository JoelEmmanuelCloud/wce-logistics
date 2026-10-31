import Link from "next/link";
import { Suspense } from "react";
import { CartIcon } from "@/components/line-icons";
import { readCart } from "@/server/cart";

function CartButton({ count }: { count: number }) {
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
      className="relative grid size-10 shrink-0 place-items-center rounded-xl text-white transition-colors hover:bg-white/10"
    >
      <CartIcon className="size-5" />
      {count > 0 && <span className="absolute right-0.5 top-0.5 grid min-w-[18px] place-items-center rounded-full bg-orange px-1 text-[11px] font-bold leading-[18px] text-navy">{count}</span>}
    </Link>
  );
}

async function LiveCartButton() {
  return <CartButton count={(await readCart()).length} />;
}

export function SiteCart() {
  return (
    <Suspense fallback={<CartButton count={0} />}>
      <LiveCartButton />
    </Suspense>
  );
}
