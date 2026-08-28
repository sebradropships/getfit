/**
 * Shared types and pure helpers.
 *
 * Safe to import from client components — contains no secrets, no network
 * calls, and no reads of process.env. Anything that talks to Shopify lives
 * in lib/shopify.ts, which is server-only.
 */

export type Money = { amount: string; currencyCode: string };

export type Variant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: Money;
  compareAtPrice: Money | null;
};

export type ProductImage = {
  url: string;
  altText: string | null;
  width: number;
  height: number;
};

export type Product = {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  featuredImage: ProductImage | null;
  images: ProductImage[];
  variants: Variant[];
};

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: money.currencyCode,
  }).format(Number(money.amount));
}

export type Discount = {
  hasDiscount: boolean;
  percent: number;
  savedLabel: string;
};

/**
 * Discount is always derived from the live Shopify prices — never hardcoded.
 * If the compare-at price is removed in Shopify, every discount element on
 * the page disappears on its own.
 */
export function discount(variant: Variant): Discount {
  const now = Number(variant.price.amount);
  const was = variant.compareAtPrice ? Number(variant.compareAtPrice.amount) : 0;

  if (!Number.isFinite(now) || !Number.isFinite(was) || was <= now) {
    return { hasDiscount: false, percent: 0, savedLabel: "" };
  }

  const saved = was - now;
  return {
    hasDiscount: true,
    percent: Math.round((saved / was) * 100),
    savedLabel: formatMoney({
      amount: saved.toFixed(2),
      currencyCode: variant.price.currencyCode,
    }),
  };
}
