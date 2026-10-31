import { transportKobo } from "@/lib/pricing";

export const MAX_ORDER_KOBO = 2_000_000_000;
export const MAX_CART_LINES = 30;
export const MAX_CART_QUANTITY = 100_000;
export const CART_COOKIE = "wce_cart";

export type CartLine = { productId: string; quantity: number };

export type PricedLine = { unitPriceKobo: number; unitWeightKg: number; quantity: number };

export type DeliveryRateInput = { ratePerTonneKobo: number; minimumChargeKobo: number };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function deliveryFeeKobo(weightKg: number, rate: DeliveryRateInput): number {
  return Math.max(transportKobo(weightKg, rate.ratePerTonneKobo), rate.minimumChargeKobo);
}

export function orderTotals(lines: readonly PricedLine[], rate: DeliveryRateInput | null) {
  const goodsKobo = lines.reduce((sum, line) => sum + line.unitPriceKobo * line.quantity, 0);
  const weightKg = lines.reduce((sum, line) => sum + line.unitWeightKg * line.quantity, 0);
  const deliveryKobo = rate ? deliveryFeeKobo(weightKg, rate) : 0;
  return { goodsKobo, weightKg, deliveryKobo, totalKobo: goodsKobo + deliveryKobo };
}

export function parseCart(value: string | undefined): CartLine[] {
  if (!value) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  const lines = new Map<string, number>();
  for (const entry of parsed.slice(0, MAX_CART_LINES)) {
    const productId = (entry as { p?: unknown })?.p;
    const quantity = (entry as { q?: unknown })?.q;
    if (typeof productId === "string" && UUID_PATTERN.test(productId) && Number.isInteger(quantity) && (quantity as number) > 0 && (quantity as number) <= MAX_CART_QUANTITY) {
      lines.set(productId, quantity as number);
    }
  }
  return [...lines].map(([productId, quantity]) => ({ productId, quantity }));
}

export function serializeCart(lines: readonly CartLine[]): string {
  return JSON.stringify(lines.map((line) => ({ p: line.productId, q: line.quantity })));
}

export function setCartLine(lines: readonly CartLine[], productId: string, quantity: number): CartLine[] {
  const others = lines.filter((line) => line.productId !== productId);
  return quantity > 0 ? [...others, { productId, quantity }] : others;
}

export function returnPathFrom(value: unknown): "/checkout" | null {
  return value === "/checkout" ? value : null;
}
