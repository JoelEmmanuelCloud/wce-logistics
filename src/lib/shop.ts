import { transportKobo } from "@/lib/pricing";

export const MAX_ORDER_KOBO = 2_000_000_000;
export const MAX_CART_LINES = 30;
export const MAX_CART_QUANTITY = 100_000;
export const CART_COOKIE = "wce_cart";
export const DELIVER_TO_COOKIE = "wce_deliver_to";
export const RECENT_SEARCHES_KEY = "wce_recent_searches";
export const MAX_RECENT_SEARCHES = 5;
export const MIN_SEARCH_LENGTH = 2;

export type CartLine = { productId: string; quantity: number };

export type PricedLine = { unitPriceKobo: number; unitWeightKg: number; quantity: number };

export type DeliveryRateInput = { ratePerTonneKobo: number; minimumChargeKobo: number };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function photoPath(photoId: string): string {
  return `/shop/photos/${photoId}`;
}

export function deliveryFeeKobo(weightKg: number, rate: DeliveryRateInput): number {
  return Math.max(transportKobo(weightKg, rate.ratePerTonneKobo), rate.minimumChargeKobo);
}

export function orderTotals(lines: readonly PricedLine[], rate: DeliveryRateInput | null) {
  const goodsKobo = lines.reduce((sum, line) => sum + line.unitPriceKobo * line.quantity, 0);
  const weightKg = lines.reduce((sum, line) => sum + line.unitWeightKg * line.quantity, 0);
  const deliveryKobo = rate ? deliveryFeeKobo(weightKg, rate) : 0;
  return { goodsKobo, weightKg, deliveryKobo, totalKobo: goodsKobo + deliveryKobo };
}

export function deliveredUnitKobo(product: { priceKobo: number; unitWeightKg: number; minOrderUnits: number }, rate: DeliveryRateInput): number {
  const units = product.minOrderUnits;
  const { totalKobo } = orderTotals([{ unitPriceKobo: product.priceKobo, unitWeightKg: product.unitWeightKg, quantity: units }], rate);
  return Math.round(totalKobo / units);
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

export function parseRecentSearches(value: string | null): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string" && entry.length > 0).slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(terms: readonly string[], term: string): string[] {
  const value = term.trim().slice(0, 40);
  if (!value) {
    return [...terms];
  }
  return [value, ...terms.filter((entry) => entry.toLowerCase() !== value.toLowerCase())].slice(0, MAX_RECENT_SEARCHES);
}

export function returnPathFrom(value: unknown): "/checkout" | null {
  return value === "/checkout" ? value : null;
}
