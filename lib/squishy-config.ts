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
  /**
   * Shopify product handle. Must match the store exactly.
   *
   * Shopify generated this from the long supplier title. Renaming the product
   * in Shopify changes the handle and will break this — set a permanent handle
   * in the product's SEO section if you plan to retitle it.
   */
  handle:
    "1000-pieces-kinds-assorted-squishy-figures-blind-box-surprise-toys-slow-rising-soft-fidget-squeeze-stress-relief-toy-random-1pcs",

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

/**
 * Variant titles come from supplier feeds and carry stray whitespace and
 * inconsistent casing — the live one is literally "Random  Only 1pcs" with a
 * double space. Matching raw strings makes the config silently wrong in a way
 * that never shows up on screen, so every comparison goes through this.
 */
export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The Shopify variant that actually sells a bundle, or null if none does.
 *
 * Generic over the variant shape so callers keep the full type — returning a
 * bare `{ title }` here is what let the final CTA read prices off a value the
 * compiler could not check.
 */
export function findVariant<T extends { title: string }>(
  product: { variants: T[] } | null,
  bundle: Bundle
): T | null {
  return (
    product?.variants.find(
      (v) => normalizeTitle(v.title) === normalizeTitle(bundle.variantTitle)
    ) ?? null
  );
}

export const BUNDLES: readonly Bundle[] = [
  {
    id: "single",
    variantTitle: "1 Box",
    boxes: 1,
    heading: "1 BOX",
    subline: "Try your luck",
    previewPrice: 36,
  },
  {
    id: "double",
    variantTitle: "2 Boxes",
    boxes: 2,
    heading: "2 BOXES",
    subline: "DOUBLE THE SURPRISE",
    previewPrice: 54,
  },
  {
    id: "quad",
    variantTitle: "4 Boxes",
    boxes: 4,
    /*
      At $36 a box, $72 buys two — and you receive four. So this is buy 2 get
      2 free, not buy 3 get 1 free; the latter would be $108. The accurate
      claim also happens to be the more generous one. If the 4-box price ever
      changes, update this wording with it, or use the computed savings figure
      the bundle row already shows.
    */
    heading: "BUY 2 GET 2 FREE",
    subline: "GET 4 BOXES — PAY FOR 2",
    badge: "BEST VALUE 🔥",
    highlight: true,
    previewPrice: 72,
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
/**
 * The largest genuine saving available, as a percentage.
 *
 * Measured against buying the same number of boxes one at a time at the live
 * single-box price — a like-for-like comparison with a price actually charged
 * on this page. That is what makes it defensible where a compare-at "regular
 * price" the product has never sold at would not be: under both the FTC's
 * pricing guides and Canada's Competition Act s.74.01, a reference price has
 * to be one genuinely offered.
 *
 * Returns 0 when no bundle beats buying singly, and every badge that depends
 * on it disappears on its own.
 */
export function bestBundleSaving(
  product: {
    variants: Array<{ title: string; price: { amount: string } }>;
  } | null
): number {
  const unit = findVariant(product, BUNDLES[0]);
  if (!unit) return 0;

  const unitAmount = Number(unit.price.amount);
  if (!Number.isFinite(unitAmount) || unitAmount <= 0) return 0;

  let best = 0;
  for (const bundle of BUNDLES) {
    const variant = findVariant(product, bundle);
    if (!variant) continue;

    const amount = Number(variant.price.amount);
    const boughtSingly = unitAmount * bundle.boxes;
    if (boughtSingly > amount) {
      best = Math.max(
        best,
        Math.round(((boughtSingly - amount) / boughtSingly) * 100)
      );
    }
  }
  return best;
}

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
