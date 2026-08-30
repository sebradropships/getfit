/**
 * Central configuration for the storefront.
 *
 * COMPLIANCE NOTES — read before editing:
 *
 * 1. `saleEndsAt` must be a real deadline you intend to honour. Do not make
 *    this a rolling per-visitor timer. Fake urgency is a deceptive practice
 *    under FTC Act Section 5.
 *
 * 2. The compare-at price lives in Shopify, not here, and the discount
 *    percentage is calculated from it at render time. Under 16 CFR Part 233
 *    a "regular price" must be one you have genuinely offered for a
 *    reasonable period.
 *
 * 3. `REVIEWS` must stay empty until you have real review data. The FTC's
 *    2024 Rule on Consumer Reviews and Testimonials carries civil penalties
 *    per violation for fabricated reviews. The aggregate rating is COMPUTED
 *    from the entries below — it cannot be set by hand, by design.
 *
 * 4. Do not add weight-loss, metabolism, detox, circulation, inflammation,
 *    pain-relief or sleep/melatonin claims anywhere in this app. The FTC
 *    requires competent and reliable scientific evidence — human clinical
 *    trials — for health claims, and that evidence does not exist for
 *    magnetic bracelets. This applies to IMAGERY as well as text: an
 *    implied claim is treated the same as an express one. See BLOCKED_IMAGES.
 */

export const OFFER = {
  featuredHandle: "pentagram-magnetite-hematite-stretch-bracelet",

  /** Configurable announcement bar. Set to null to hide the bar entirely. */
  announcement: "LIMITED LAUNCH OFFER — SAVE 28% TODAY" as string | null,

  /**
   * Real campaign deadline, or null for no countdown.
   * Only set this to a date you will actually honour by restoring the
   * compare-at price in Shopify. A timer that resets per visitor is illegal.
   */
  saleEndsAt: "2026-09-05T23:59:59-07:00" as string | null,

  /** Free-shipping threshold in store currency, or null if you don't offer one. */
  freeShippingThreshold: null as number | null,

  /** Only display policies that actually exist. */
  shipsIn: "1–2 business days",
  returnWindowDays: 30,
  supportEmail: "sebradropships@gmail.com",

  disclaimer:
    "Sold as a fashion and lifestyle accessory. This product is not a medical device, is not a weight-loss product, and is not intended to diagnose, treat, cure, or prevent any disease. Not recommended for anyone with a pacemaker, implanted defibrillator, insulin pump, or other implanted electronic device. Consult a licensed healthcare provider about any health concern.",
} as const;

/**
 * IMAGE SAFETY BLOCKLIST — do not remove entries without looking at the image.
 *
 * These four supplier images are weight-loss before/after photographs
 * (oversized jeans, slimmed waists). Displaying them alongside this product
 * communicates a fat-loss claim. The FTC treats an implied claim exactly the
 * same as an express one, and no competent scientific evidence supports a
 * weight-loss effect from magnetic bracelets.
 *
 * These should also be DELETED from the Shopify product itself, because the
 * Shopify storefront, Google Shopping feeds and social product tags all read
 * the product's media directly and never see this file.
 *
 * Matching is on URL substring, so Shopify's ?v= cache-busting suffix and any
 * CDN resizing parameters do not defeat it.
 *
 * Any image added to this product in future must be reviewed by a human
 * before it ships. Nothing here can catch an unsafe image it has not seen.
 */
export const BLOCKED_IMAGES: readonly string[] = [
  "cd5dfbc2-9524-4b7d-9e3c-98be97638d31", // before/after, woman's waist
  "cf4dacf8-ce27-4d77-9d58-b52dca87610e", // "big jeans" weight-loss trope, man
  "ce5c630f-7019-4a4b-98e9-f0dacd6218f3", // "big jeans" weight-loss trope, woman
  "344382119440", // "big jeans" weight-loss trope, man
];

/**
 * Not a compliance matter — these are byte-for-byte repeats of an image that
 * already appears earlier in the gallery. Shopify stores them under separate
 * filenames, so there is no way to detect the duplication from the URL alone.
 * Showing the same photo twice in a five-image gallery reads as careless.
 */
export const DUPLICATE_IMAGES: readonly string[] = [
  "226698993216", // same shot as 704294623587
];

export function isImageAllowed(url: string): boolean {
  return ![...BLOCKED_IMAGES, ...DUPLICATE_IMAGES].some((fragment) =>
    url.includes(fragment)
  );
}

/**
 * The centrepiece macro shot.
 *
 * The nine supplier photographs on this product do not show a pentagram —
 * they show plain cylinder and round hematite beads — while the Shopify title
 * and description both describe "a carved pentagram focal bead". The merchant
 * has confirmed the shipped item does have one and will supply a photograph.
 *
 * Until that photo exists, the Symbolic Detail card renders as text only and
 * no close-up is shown. Do not point this at one of the existing supplier
 * images to fill the gap — none of them depict the centrepiece.
 */
export const CENTREPIECE_PHOTO: { url: string; alt: string } | null = null;

/**
 * REAL customer reviews only.
 *
 * Leave this array empty until you have genuine reviews. When it is empty the
 * site shows "Be the first to review this piece" and emits no rating markup.
 *
 * The aggregate score shown on the page and in Product structured data is
 * derived from these entries — there is deliberately no way to hand-set a
 * headline rating like "4.8/5" without the underlying reviews to support it.
 * Google issues manual actions for review markup that isn't backed by real
 * on-page reviews, and the FTC fines per fabricated review.
 */
export type Review = {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  body: string;
  author: string;
  verified: boolean;
  /** ISO date */
  date: string;
};

export const REVIEWS: readonly Review[] = [];

export function reviewSummary(reviews: readonly Review[]) {
  if (reviews.length === 0) {
    return { count: 0, average: 0, hasReviews: false as const };
  }
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return {
    count: reviews.length,
    average: Math.round((total / reviews.length) * 10) / 10,
    hasReviews: true as const,
  };
}
