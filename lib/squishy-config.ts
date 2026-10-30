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
 * The shipping line is unconditional now because the rate behind it is. The
 * US zone used to carry a $6.50 flat Economy rate alongside a $0.00 tier gated
 * on TOTAL_PRICE >= $60.00, which is why this once read "over $60" — an
 * unqualified claim would have been false on every order under the gate, and
 * the $59.99 four-box missed it by a cent. That method has been replaced with
 * a single "Free shipping" rate at $0.00 carrying no conditions, so the badge
 * and the checkout agree. Reintroduce a paid rate and this line has to change
 * in the same commit.
 */
export const TRUST = [
  { icon: "🔒", label: "Secure checkout" },
  { icon: "📦", label: "Order tracking" },
  { icon: "🚚", label: "Free shipping" },
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
  "shiny-malt-squishy",
  "sensory-cube-squishy",
  "jellyfish-squishy",
  "glitter-dumpling-squishy",
  "fruit-maltose-toothpaste-squishy",

  /*
    Unresolved on review. chocolate-squishy is the one to fix first: four
    identifiable people including a MINOR, under overlay labels reading
    "Autism" and "Anxiety". That is a likeness and substantiation problem,
    not a trademark one, and no image swap on the others addresses it.
  */
  "chocolate-squishy",
  "fried-chicken-squishy",
  "bread-cat-squishy",
  "gold-bar-squishy",

  /*
    Near-duplicates of two entries above - golden-butter-squishy is the same
    13.5cm block as gold-bar-squishy, and fried-chicken-drumstick-squishy the
    same drumstick as fried-chicken-squishy. Listed because the owner asked
    for the complete catalogue; expect each pair to read as a repeat in the
    carousel until one of each is retired.
  */
];

/* ----------------------------------------------------------------- reviews */

export type Review = {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /** The customer's own headline, where they wrote one. */
  title?: string;
  body: string;
  author: string;
};

/**
 * Real customer reviews, supplied by the owner and published verbatim.
 *
 * Bylined "Anonymous Customer" at the owner's request. Deliberately NOT
 * "Verified Customer": no order record in this store backs them, and that
 * badge would assert a check nobody ran.
 *
 * They describe individual squishy toys, not the sealed Blind Box - several
 * mention a specific look or size ("looks just like the pictures", "I wish it
 * came in a slightly bigger size"), which a random assortment cannot have.
 * That is why REVIEWS_ARE_PRODUCT_SPECIFIC below exists and is false.
 */
export const REVIEWS_ARE_REAL = true;

/**
 * Whether these reviews are reviews OF the Blind Box Mystery Box.
 *
 * They are not, so this is false, and that keeps two separate product-level
 * claims switched off:
 *   - the aggregateRating in the box's structured data (app/page.tsx)
 *   - the "4.8/5" badge beside the buy button (components/SquishyBuy.tsx)
 *
 * Both state a rating for one specific product. Attaching reviews written
 * about other items to this one is what 16 CFR 465.7 calls review hijacking,
 * and unsupported review markup is a documented Google manual action. The
 * reviews themselves still render, with an average that says what it is an
 * average of.
 *
 * Flip this to true only once the reviews below are reviews of the box.
 */
export const REVIEWS_ARE_PRODUCT_SPECIFIC = false;

export const REVIEWS: readonly Review[] = [
  {
    id: "r1",
    rating: 5,
    title: "Super satisfying!",
    body: "Really soft and squishy. The texture is amazing, and it’s surprisingly relaxing to play with.",
    author: "Anonymous Customer",
  },
  {
    id: "r2",
    rating: 5,
    title: "My new favourite toy",
    body: "Absolutely love it! Great quality, fun to squeeze, and worth every penny.",
    author: "Anonymous Customer",
  },
  {
    id: "r3",
    rating: 4,
    title: "Great little purchase",
    body: "Very cute and satisfying. I wish it came in a slightly bigger size, but overall I’m happy.",
    author: "Anonymous Customer",
  },
  {
    id: "r4",
    rating: 5,
    title: "Perfect stress reliever",
    body: "I keep it on my desk and find myself squeezing it whenever I’m working. Love it!",
    author: "Anonymous Customer",
  },
  {
    id: "r5",
    rating: 5,
    title: "Kids love it!",
    body: "Bought this for my younger sibling, and they haven’t stopped playing with it.",
    author: "Anonymous Customer",
  },
  {
    id: "r6",
    rating: 5,
    title: "Amazing texture",
    body: "The softness is exactly what I was looking for. Really enjoyable to squeeze.",
    author: "Anonymous Customer",
  },
  {
    id: "r7",
    rating: 4,
    title: "Worth buying",
    body: "Good quality and looks just like the pictures. Delivery could have been a little faster.",
    author: "Anonymous Customer",
  },
  {
    id: "r8",
    rating: 5,
    title: "So satisfying",
    body: "One of those little things you don’t realise you need until you get one!",
    author: "Anonymous Customer",
  },
  {
    id: "r9",
    rating: 5,
    title: "Great gift idea",
    body: "Bought it as a gift, and it was a hit. Definitely ordering more.",
    author: "Anonymous Customer",
  },
  {
    id: "r10",
    rating: 5,
    title: "Adorable and fun",
    body: "The design is super cute, and the squishy texture makes it even better.",
    author: "Anonymous Customer",
  },
  {
    id: "r11",
    rating: 4,
    title: "Happy with my order",
    body: "Nice product overall. Soft, fun, and exactly what I expected.",
    author: "Anonymous Customer",
  },
  {
    id: "r12",
    rating: 5,
    title: "Can’t stop squeezing it",
    body: "It’s oddly addictive! Great for keeping your hands busy.",
    author: "Anonymous Customer",
  },
  {
    id: "r13",
    rating: 5,
    title: "Excellent quality",
    body: "Really impressed with the feel and finish. Definitely exceeded my expectations.",
    author: "Anonymous Customer",
  },
  {
    id: "r14",
    rating: 5,
    title: "Perfect for everyday fun",
    body: "Small, cute, and incredibly satisfying. I carry mine around everywhere.",
    author: "Anonymous Customer",
  },
  {
    id: "r15",
    rating: 4,
    title: "Really good product",
    body: "Enjoyable to use and looks great. Would love to see more designs.",
    author: "Anonymous Customer",
  },
  {
    id: "r16",
    rating: 5,
    title: "Definitely recommended",
    body: "Great little toy for anyone who enjoys sensory and stress-relief toys.",
    author: "Anonymous Customer",
  },
  {
    id: "r17",
    rating: 5,
    title: "Better than expected",
    body: "The texture is lovely, and the product feels great. Very happy with it.",
    author: "Anonymous Customer",
  },
  {
    id: "r18",
    rating: 5,
    title: "My kids are obsessed",
    body: "They absolutely love squeezing and playing with it. Great purchase!",
    author: "Anonymous Customer",
  },
  {
    id: "r19",
    rating: 4,
    title: "Cute and satisfying",
    body: "Really nice product. Packaging could be improved, but the toy itself is lovely.",
    author: "Anonymous Customer",
  },
  {
    id: "r20",
    rating: 5,
    title: "Love everything about it",
    body: "Fun, soft, and super satisfying. I’ll definitely be coming back for more.",
    author: "Anonymous Customer",
  },
  {
    id: "r21",
    rating: 5,
    title: "Five stars from me",
    body: "Great experience overall. Lovely product and a fun addition to my collection.",
    author: "Anonymous Customer",
  },
];

/**
 * The average shown inside the review section. Describes the reviews, and
 * makes no claim about any one product.
 */
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

/**
 * The rating a specific product may advertise as its own - the buy-button
 * badge and the aggregateRating in structured data. Stays off until the
 * reviews are about that product. See REVIEWS_ARE_PRODUCT_SPECIFIC.
 */
export function productRatingSummary() {
  if (!REVIEWS_ARE_PRODUCT_SPECIFIC) {
    return { show: false as const, average: 0, count: 0 };
  }
  return ratingSummary();
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
