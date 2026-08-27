/**
 * Offer configuration.
 *
 * COMPLIANCE NOTES — read before editing:
 *
 * 1. saleEndsAt must be a real deadline you intend to honour. Do not make
 *    this a rolling per-visitor timer. Fake urgency is a deceptive practice
 *    under FTC Act Section 5.
 *
 * 2. The compare-at price lives in Shopify, not here, and the discount
 *    percentage is calculated from it at render time. Under 16 CFR Part 233
 *    a "regular price" must be one you have genuinely offered for a
 *    reasonable period.
 *
 * 3. reviewSummary must be left undefined until you have real review data
 *    that matches. The FTC's 2024 Rule on Consumer Reviews and Testimonials
 *    carries civil penalties per violation for fabricated reviews.
 *
 * 4. Do not add weight-loss, metabolism, detox, circulation, inflammation,
 *    pain-relief or sleep/melatonin claims anywhere in this app. The FTC
 *    requires competent and reliable scientific evidence — human clinical
 *    trials — for health claims, and that evidence does not exist for
 *    magnetic bracelets. This applies to imagery as well as text: an
 *    implied claim is treated the same as an express one.
 */
export const OFFER = {
  featuredHandle: "pentagram-magnetite-hematite-stretch-bracelet",

  saleEndsAt: "2026-09-05T23:59:59-07:00",

  stockPercent: 74,

  reviewSummary: undefined as string | undefined,

  disclaimer:
    "Sold as a fashion and lifestyle accessory. This product is not a medical device, is not a weight-loss product, and is not intended to diagnose, treat, cure, or prevent any disease. Any customer statements reflect individual experience and are not typical results. Not recommended for anyone with a pacemaker, implanted defibrillator, insulin pump, or other implanted electronic device. Consult a licensed healthcare provider about any health concern.",
} as const;
