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
  /**
   * Null when the Storefront token lacks the
   * `unauthenticated_read_product_inventory` scope. Never invent a number to
   * fill this in — the low-stock indicator hides itself when it is null.
   */
  quantityAvailable: number | null;
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
  description: string;
  descriptionHtml: string;
  featuredImage: ProductImage | null;
  images: ProductImage[];
  variants: Variant[];
};

export type CartLine = {
  id: string;
  quantity: number;
  merchandiseId: string;
  title: string;
  variantTitle: string;
  image: ProductImage | null;
  price: Money;
  /** Null when the inventory scope is not granted. */
  quantityAvailable: number | null;
};

export type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  subtotal: Money;
  lines: CartLine[];
};

/**
 * Ask Shopify's CDN for an appropriately sized rendition.
 *
 * The source files are 800×800. Sending those into a 66px thumbnail wastes
 * roughly 90 KB per image, which on a paid-social landing page is paid for in
 * bounced sessions. Shopify resizes on the fly from a `width` parameter, so
 * this costs nothing extra to serve.
 */
export function cdnImage(url: string, width: number): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("cdn.shopify.com")) return url;
    parsed.searchParams.set("width", String(width));
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Builds a srcset at 1× and 2× for a known display width. */
export function cdnSrcSet(url: string, width: number): string {
  return `${cdnImage(url, width)} 1x, ${cdnImage(url, width * 2)} 2x`;
}

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

/** Below this many units we surface a real low-stock line. */
export const LOW_STOCK_THRESHOLD = 10;

/**
 * Real scarcity only.
 *
 * Returns null when inventory is unknown (scope not granted) or when stock is
 * comfortable. The caller must render nothing in that case rather than
 * substituting a placeholder number or a fabricated percentage.
 */
export function lowStock(
  quantityAvailable: number | null
): { remaining: number; urgent: boolean } | null {
  if (quantityAvailable === null) return null;
  if (!Number.isFinite(quantityAvailable)) return null;
  if (quantityAvailable <= 0) return null;
  if (quantityAvailable > LOW_STOCK_THRESHOLD) return null;
  return { remaining: quantityAvailable, urgent: quantityAvailable <= 5 };
}
