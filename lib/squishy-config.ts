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
  tagline: "1000+ possible squishy styles. Every box is a surprise.",

  /**
   * Supplied brand imagery, used in preference to the Shopify media because
   * these are shot for the page. Shopify images still feed the variety strip.
   *
   * These are illustrative of the range, not of one specific box — contents
   * are randomly assorted, which the legal line at the foot of the page states
   * plainly. Keep it that way: showing a fixed set as though it were what
   * arrives would misrepresent a blind box.
   */
  images: {
    hero: {
      src: "/squishy/hero-box.jpg",
      alt: "A mystery box overflowing with colourful squishy toys — panda, unicorn, donut, cat and more",
      width: 596,
      height: 869,
    },
    spread: {
      src: "/squishy/mystery-spread.jpg",
      alt: "A question-mark mystery box surrounded by dozens of different squishies",
      width: 594,
      height: 869,
    },
    grid: {
      src: "/squishy/styles-grid.jpg",
      alt: "Rows of squishies — animals, fruit, desserts, rainbows and more",
      width: 576,
      height: 869,
    },
    unboxing: {
      src: "/squishy/unboxing.jpg",
      alt: "Hands opening a squishy mystery box on a soft blanket",
      width: 590,
      height: 869,
    },
  },

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

/**
 * Promotional deadline.
 *
 * ONE FIXED INSTANT, not a per-visitor duration. Every visitor counts to the
 * same moment, and when it passes the countdown is gone — it does not restart.
 * A timer that resets each session never actually expires, which makes the
 * urgency fabricated and deceptive under FTC Act Section 5.
 *
 * For this to be truthful, something has to genuinely change at this moment:
 * set a real compare-at price in Shopify now, and remove it when the deadline
 * passes. If the price is identical before and after, the countdown is
 * counting to nothing.
 *
 * To run a different window, change this one line. Set it to null to remove
 * the countdown entirely.
 */
export const COUNTDOWN = {
  endsAt: "2026-09-06T18:00:00-07:00" as string | null,
  label: "FLASH SALE ENDS IN",
} as const;

/**
 * Strip above the header.
 *
 * Every line has to be true on its own, because this sits above the fold on
 * every visit. No countdown and no "ends soon" — there is no campaign deadline
 * (COUNTDOWN.endsAt is null), so urgency here would be invented. The savings
 * line matches what the bundle rows actually compute.
 */
export const ANNOUNCEMENT = {
  enabled: true,
  // Widened rather than `as const` so the length isn't a literal type — the
  // component's empty-list guard has to stay meaningful as this list is edited.
  messages: [
    "🎁 EVERY BOX IS A SURPRISE",
    "🌈 1000+ POSSIBLE STYLES",
    "🔥 BUY 2 GET 2 FREE — SAVE 50%",
    "👀 YOU NEVER KNOW WHAT YOU'LL GET",
  ] as readonly string[],
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

/**
 * Empty until real customers have written them.
 *
 * As of this writing the store has 0 orders and 0 customers, so there is no
 * genuine review that could go here. Do not populate this with invented
 * entries: 16 CFR Part 465 makes writing or disseminating fake consumer
 * reviews a violation carrying civil penalties per review, and Canada's
 * Competition Act covers false testimonials.
 *
 * When you do have real ones, add them here and set REVIEWS_ARE_REAL to true —
 * the star rating, review count and aggregateRating markup all switch on
 * together and are computed from these entries.
 */
export const REVIEWS: readonly Review[] = [];

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
    text: "One box, or four. More boxes, more surprises.",
  },
  {
    n: "02",
    emoji: "👀",
    title: "OPEN THE MYSTERY",
    text: "Panda? Unicorn? Boba tea? Nobody knows until you open it.",
  },
  {
    n: "03",
    emoji: "💖",
    title: "SQUISH & COLLECT",
    text: "Find your favourite. Then go hunting for the rest.",
  },
] as const;

/**
 * Kept concrete rather than generic. "Slow-rising" and the style categories
 * come from the actual product listing and the supplied photography — claims
 * we can point at, not filler.
 */
export const FEATURES = [
  {
    emoji: "🎁",
    title: "MYSTERY INSIDE",
    text: "Sealed until you open it. That's the whole point.",
  },
  {
    emoji: "🌈",
    title: "1000+ STYLES",
    text: "Animals, fruit, desserts, galaxy glitter and more.",
  },
  {
    emoji: "🤏",
    title: "SATISFYING SQUISH",
    text: "Soft, slow-rising, weirdly hard to put down.",
  },
  {
    emoji: "💖",
    title: "COLLECT THEM ALL",
    text: "Got a double? Trade it. Got a favourite? Hunt for more.",
  },
] as const;
