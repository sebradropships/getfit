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

/**
 * Canonical origin, in one place.
 *
 * app/layout.tsx builds metadataBase from this and app/page.tsx builds the
 * JSON-LD image URLs from it. Keeping one constant is deliberate: these
 * drifted apart once already and shipped a scaffold host into every
 * canonical tag on the site.
 */
export const SITE_URL = "https://www.viraltoys.us";

export const PRODUCT = {
  /**
   * Shopify product handle. Must match the store exactly.
   *
   * This is a HAND-SET permanent handle, not the supplier-generated one, so
   * retitling the product in Shopify no longer breaks this page. Keep it that
   * way: if you ever change it in Shopify, change it here in the same commit.
   */
  handle: "squishy-mystery-box",

  name: "Blind Box Squishy Mystery Box",
  tagline: "Endless surprise styles. Every box is different.",

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
    originalPrice: 21.99,
    salePrice: 21.99,
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
    previewPrice: 21.99,
  },
  {
    id: "double",
    variantTitle: "2 Boxes",
    boxes: 2,
    heading: "2 BOXES",
    subline: "DOUBLE THE SURPRISE",
    /*
      The decoy, and priced to be rejected. $39.99 against a compare-at of
      2 × 21.99 = $43.98 is only 9% off, which is the point: it makes the step
      up to four boxes for $20 more read as obviously better. No badge — a 9%
      saving does not earn one, and awarding it would dilute the hero.

      It also clears $25 contribution on its own ($26.77), so a visitor who
      picks it anyway is still profitable at a $25 CPA.
    */
    previewPrice: 39.99,
  },
  {
    id: "quad",
    variantTitle: "4 Boxes",
    boxes: 4,
    /*
      The hero, because it is the only tier whose contribution ($34.43) clears
      a $30 Meta CPA. $59.99 against 4 × 21.99 = $87.96 is 31.8% off at $15.00
      a box — genuinely the lowest per-box price here, which is exactly what
      "best value" asserts.

      Deliberately not framed as "buy 3 get 1 free": three boxes would be
      $65.97 and this sells for less than that, so the formula wording would
      understate the real offer.
    */
    heading: "4 BOXES",
    subline: "LOWEST PRICE PER BOX",
    badge: "BEST VALUE 🔥",
    highlight: true,
    previewPrice: 59.99,
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
  endsAt: null as string | null,
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
    "🌈 ENDLESS SURPRISE STYLES",
    "🔥 SAVE UP TO 32% ON BUNDLES",
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
 * There is still no return policy and no verified delivery window, so neither
 * is claimed. Add entries only when they are real — an advertised policy is an
 * enforceable promise.
 *
 * The shipping line is deliberately conditional. Shopify's US zone carries two
 * active Economy rates: $6.50 flat, and $0.00 gated on TOTAL_PRICE >= $60.00.
 * So free shipping is real but threshold-based, and a bare "Free shipping"
 * badge would be false on every single-tier order — the $59.99 four-box misses
 * the gate by one cent. Stating the threshold keeps it true and makes the badge
 * do upsell work instead. If the Shopify threshold changes, change this line in
 * the same commit.
 */
export const TRUST = [
  { icon: "🔒", label: "Secure checkout" },
  { icon: "📦", label: "Order tracking" },
  { icon: "🚚", label: "Free shipping over $60" },
] as const;

/* ------------------------------------------------------- more products */

/**
 * Extra single products featured beneath the mystery box.
 *
 * These are the PERMANENT handles set by hand in Shopify, not supplier slugs,
 * so retitling the products cannot break this list. Nothing here is a price:
 * title, image and price are all read from Shopify at runtime, exactly like
 * the mystery box. A handle that does not resolve is dropped from the strip
 * rather than rendered as an empty card — it fails closed, same as a bundle
 * whose variant is missing.
 */
export const MORE_PRODUCTS: readonly string[] = [
  /*
    The full catalogue, listed on the owner's explicit instruction after
    being shown the image audit below. The supplier photography has NOT been
    replaced yet; the owner is swapping it in Shopify and has accepted the
    risk in the meantime, with the Meta catalogue deliberately excluded as
    the mitigation.

    A handle listed here still only renders once its product is ACTIVE and
    published to Squishy Headless 03. getProductsByHandles drops anything
    that does not resolve, so a draft product simply has no card.
  */

  // Audited clean, image by image.
  "butter-stick-squishy",
  "caramel-pudding-squishy",
  "water-bottle-squishy",

  /*
    Third-party marks visible in the CURRENT supplier photography. Replace
    the Shopify media before this page carries real traffic:
      chocolate-butter-sticks-squishy  Reese's, Twix, Hershey's, Kinder,
                                       Ferrero, Bounty, Cadbury, Snickers,
                                       KitKat, Mars
      chocolate-snack-squishy          Twix, Snickers, KitKat, Reese's,
                                       Kinder, Bounty, Cadbury, Nestle
      shiny-malt-squishy               Hello Kitty, Sanrio
      sensory-cube-squishy             Starbucks siren + wordmark, Schylling
      jellyfish-squishy                NEE DOH embossed, identifiable person
      glitter-dumpling-squishy         Squishy Steam Bunz
      glitter-dumpling-squishy-set     Squeezy Dumplings
      fruit-maltose-toothpaste-squishy Chiboki
  */
  "chocolate-butter-sticks-squishy",
  "chocolate-snack-squishy",
  "shiny-malt-squishy",
  "sensory-cube-squishy",
  "jellyfish-squishy",
  "glitter-dumpling-squishy",
  "glitter-dumpling-squishy-set",
  "fruit-maltose-toothpaste-squishy",

  /*
    Unresolved on review. chocolate-squishy is the one to fix first: four
    identifiable people including a MINOR, under overlay labels reading
    "Autism" and "Anxiety". That is a likeness and substantiation problem,
    not a trademark one, and no image swap on the others addresses it.
  */
  "chocolate-squishy",
  "fried-chicken-squishy",
  "fried-egg-toast-squishy",
  "bread-cat-squishy",
  "gold-bar-squishy",

  /*
    Near-duplicates of two entries above - golden-butter-squishy is the same
    13.5cm block as gold-bar-squishy, and fried-chicken-drumstick-squishy the
    same drumstick as fried-chicken-squishy. Listed because the owner asked
    for the complete catalogue; expect each pair to read as a repeat in the
    carousel until one of each is retired.
  */
  "golden-butter-squishy",
  "fried-chicken-drumstick-squishy",
];

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
 * PLACEHOLDER COPY FOR LAYOUT WORK - NOT CUSTOMER REVIEWS.
 *
 * The store has 0 orders and 0 customers, so no genuine review exists yet.
 * These entries exist only so the block can be designed and tuned at real
 * copy lengths. While REVIEWS_ARE_REAL is false they render behind a dashed
 * warning bar, in dashed cards, and the byline is hard-coded to "Sample
 * placeholder" - the author field below is never read in that branch, so no
 * value here can surface as a customer name.
 *
 * Do NOT flip REVIEWS_ARE_REAL to true against this array. That switch also
 * turns on the aggregateRating in structured data, which would publish a
 * rating no customer produced. Replace every entry with a real review first:
 * 16 CFR Part 465 carries civil penalties per fake review, and Canada's
 * Competition Act covers false testimonials.
 */
export const REVIEWS: readonly Review[] = [
  {
    id: "sample-1",
    rating: 5,
    body: "Opening it was genuinely the best part - I had no idea what was coming out of the box.",
    author: "Sample placeholder",
  },
  {
    id: "sample-2",
    rating: 5,
    body: "Got a mix I was not expecting and ended up liking the strangest one most.",
    author: "Sample placeholder",
  },
  {
    id: "sample-3",
    rating: 4,
    body: "Fun to squeeze and a nice surprise. Would like to know roughly how many come in a box.",
    author: "Sample placeholder",
  },
  {
    id: "sample-4",
    rating: 5,
    body: "Ordered the four-box and split them with friends. Everyone ended up with something different.",
    author: "Sample placeholder",
  },
  {
    id: "sample-5",
    rating: 5,
    body: "The not-knowing is the whole appeal. Already thinking about the next one.",
    author: "Sample placeholder",
  },
  {
    id: "sample-6",
    rating: 4,
    body: "Soft and slow-rising, exactly as described. The surprise beat picking one myself.",
    author: "Sample placeholder",
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
    title: "ENDLESS SURPRISE STYLES",
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
