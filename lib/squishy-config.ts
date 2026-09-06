/**
 * Blind Box Squishy Mystery Box — landing page configuration.
 *
 * Everything a marketer would want to change lives here.
 *
 * PRICING IS NOT SET HERE. The numbers below are intent, used only to render
 * a preview before the Shopify product exists. Once the product is published,
 * every price, compare-at and discount percentage on the page is read from
 * Shopify, so the page can never advertise a figure that differs from what
 * checkout charges. Change prices in Shopify, not in this file.
 */

export const PRODUCT = {
  /** Shopify product handle. Must match the handle in the store. */
  handle: "blind-box-squishy-mystery-box",

  name: "Blind Box Squishy Mystery Box",
  tagline: "100+ possible squishy styles. Every box is a surprise.",

  /** Preview-only fallbacks. Shopify wins whenever it has the product. */
  fallback: {
    currency: "USD",
    originalPrice: 36,
    salePrice: 18,
  },
} as const;

/**
 * Bundles map to REAL Shopify variants, matched on variant title.
 *
 * Adding four boxes to the cart would have Shopify charge for four. A
 * "buy 3 get 1 free" price only holds at checkout if it is a variant with its
 * own price, so each bundle below must exist as a variant in Shopify.
 *
 * A bundle whose variant is missing is hidden rather than shown at a price we
 * could not actually honour — it fails closed on purpose.
 */
export type Bundle = {
  id: string;
  /** Must match the Shopify variant title exactly. */
  variantTitle: string;
  boxes: number;
  heading: string;
  subline: string;
  badge?: string;
  highlight?: boolean;
  /**
   * Shown ONLY before the Shopify variant exists, so the page can be previewed
   * pre-launch. Once the variant is published its real price replaces this and
   * the preview value is never rendered again. Note this is not boxes ×
   * unit price for the 4-box bundle — that is the whole point of the offer.
   */
  previewPrice: number;
};

export const BUNDLES: readonly Bundle[] = [
  {
    id: "single",
    variantTitle: "1 Box",
    boxes: 1,
    heading: "1 BOX",
    subline: "Try your luck",
    previewPrice: 18,
  },
  {
    id: "double",
    variantTitle: "2 Boxes",
    boxes: 2,
    heading: "2 BOXES",
    // Two boxes is simply twice one box. Saying "save more" here would be a
    // discount that does not exist.
    subline: "DOUBLE THE SURPRISE",
    previewPrice: 36,
  },
  {
    id: "quad",
    variantTitle: "4 Boxes",
    boxes: 4,
    heading: "BUY 3 GET 1 FREE",
    subline: "GET 4 BOXES — PAY FOR 3",
    badge: "BEST VALUE 🔥",
    highlight: true,
    previewPrice: 54,
  },
];

/**
 * Promotional countdown.
 *
 * `endsAt` must be a real deadline you will honour by restoring the compare-at
 * price in Shopify when it passes. It is a fixed instant, identical for every
 * visitor — never a per-visitor timer that restarts each session, which would
 * never actually expire.
 *
 * Set to null to hide the countdown entirely. That is the correct setting when
 * there is no real deadline; a fabricated one is a deceptive practice.
 */
export const COUNTDOWN = {
  endsAt: null as string | null,
  label: "OFFER ENDS IN",
} as const;

export const FLASH_SALE = {
  enabled: true,
  /** Percentage is computed from live Shopify prices, never written here. */
  label: "FLASH SALE",
} as const;

/**
 * Only list what the store genuinely provides.
 *
 * There is no return policy and no verified shipping time yet, so neither is
 * claimed. Add entries only when they are real — an advertised policy is an
 * enforceable promise.
 */
export const TRUST = [
  { icon: "🔒", label: "Secure checkout" },
  { icon: "📦", label: "Order tracking" },
] as const;

/* ----------------------------------------------------------------- reviews */

export type Review = {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  author: string;
};

/**
 * SAMPLE CONTENT — NOT REAL CUSTOMER REVIEWS.
 *
 * These exist so the layout can be designed and reviewed. They render with a
 * visible "sample" marker and no attributed customer name, so no shopper can
 * mistake them for genuine testimonials.
 *
 * Before running ads: replace these with real reviews and set
 * `REVIEWS_ARE_REAL` to true. Presenting fabricated reviews as genuine carries
 * FTC civil penalties per violation under the 2024 Rule on Consumer Reviews
 * and Testimonials.
 *
 * While REVIEWS_ARE_REAL is false the page shows no star rating and no review
 * count, and emits no aggregateRating in structured data.
 */
export const REVIEWS_ARE_REAL = false;

export const REVIEWS: readonly Review[] = [
  {
    id: "s1",
    rating: 5,
    body: "Opening the box was honestly half the fun 😂",
    author: "Sample review",
  },
  {
    id: "s2",
    rating: 5,
    body: "I had no idea which one I'd get. The surprise made it so much better.",
    author: "Sample review",
  },
  {
    id: "s3",
    rating: 5,
    body: "Got multiple boxes so I could see what I would get.",
    author: "Sample review",
  },
];

export function ratingSummary() {
  if (!REVIEWS_ARE_REAL || REVIEWS.length === 0) {
    return { show: false as const, average: 0, count: 0 };
  }
  const total = REVIEWS.reduce((sum, r) => sum + r.rating, 0);
  return {
    show: true as const,
    average: Math.round((total / REVIEWS.length) * 10) / 10,
    count: REVIEWS.length,
  };
}

/* ---------------------------------------------------------------- sections */

export const STEPS = [
  {
    n: "01",
    emoji: "🎁",
    title: "PICK YOUR BOX",
    text: "Choose how many surprises you want.",
  },
  {
    n: "02",
    emoji: "👀",
    title: "OPEN THE MYSTERY",
    text: "You never know which squishy you'll discover.",
  },
  {
    n: "03",
    emoji: "💖",
    title: "SQUISH & COLLECT",
    text: "Discover your favorite and start your collection.",
  },
] as const;

export const FEATURES = [
  { emoji: "🎁", title: "MYSTERY INSIDE", text: "Every box is a surprise." },
  { emoji: "🌈", title: "100+ STYLES", text: "So many designs to discover." },
  {
    emoji: "🤏",
    title: "SATISFYING SQUISH",
    text: "Different shapes and textures to explore.",
  },
  {
    emoji: "💖",
    title: "COLLECT THEM ALL",
    text: "Get more boxes and discover more styles.",
  },
] as const;
