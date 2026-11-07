/**
 * TikTok Pixel — shared config, cookie names, and the browser-side track helper.
 *
 * Deliberately a sibling of `lib/pixel.ts` rather than a generalisation of it.
 * The two platforms look symmetrical and are not, in one way that matters
 * enough to keep the code apart — see TTCLID_COOKIE below.
 *
 * As with Meta, the id comes from the environment and everything here is inert
 * without it, so this ships safely before the pixel is switched on.
 */

/** Empty until NEXT_PUBLIC_TIKTOK_PIXEL_ID is set. Inlined at build time. */
export const TIKTOK_PIXEL_ID =
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim() ?? "";

/**
 * Where we stash the TikTok click id ourselves.
 *
 * THIS IS THE ONE PLACE TIKTOK IS NOT LIKE META. Meta's fbevents.js reads
 * `fbclid` off the URL and writes the `_fbc` cookie for you, which is why
 * `app/actions.ts` can simply read `_fbc` and be done. TikTok's events.js does
 * NOT do the equivalent: it writes `_ttp` (its browser id, the `_fbp`
 * analogue) but leaves `ttclid` in the query string and nowhere else.
 *
 * So mirroring the Meta setup literally — load the pixel, then read a cookie —
 * yields nothing at all, silently, forever. The click id has to be captured
 * from the URL by our own script, which is what TikTokPixel does, into this
 * cookie.
 *
 * Leading underscore on purpose: Shopify treats cart attributes whose key
 * starts with `_` as hidden, so this never renders on the checkout page or the
 * order confirmation the customer sees. `_fbp` and `_fbc` get the same
 * treatment for the same reason.
 */
export const TTCLID_COOKIE = "_ttclid";

/** TikTok's own first-party browser id, written by events.js. The `_fbp` twin. */
export const TTP_COOKIE = "_ttp";

/** Fired on window once the base code has run, for anything that needs to wait. */
export const TIKTOK_PIXEL_READY_EVENT = "squishy:ttq-ready";

/**
 * TikTok's web event names.
 *
 * These are the *pixel* names, which are not the same strings as the Marketing
 * API's optimization codes for the same events — `CompletePayment` here is
 * `SHOPPING` in an ad group's `optimization_event`, `InitiateCheckout` is
 * `INITIATE_ORDER`, `AddToCart` is `ON_WEB_CART`, `ViewContent` is
 * `ON_WEB_DETAIL`. Sending an API code through the pixel records nothing.
 */
type TikTokEvent =
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "CompletePayment";

type Ttq = {
  page: () => void;
  track: (event: string, params?: Record<string, unknown>, options?: { event_id: string }) => void;
  load: (id: string, options?: Record<string, unknown>) => void;
  identify: (params: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    ttq?: Ttq;
    TiktokAnalyticsObject?: string;
    __squishyTtqInit?: number;
  }
}

/**
 * A unique id per event occurrence, for browser/server deduplication.
 *
 * TikTok dedupes a pixel event against an Events API copy on
 * event_name + event_id, the same shape Meta uses — so minting it here means a
 * future server-side CompletePayment relay needs no change at the call sites.
 * Named `event_id` in TikTok's payload, not `eventID` as Meta spells it.
 */
export function newTikTokEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Fire a TikTok pixel event from the browser.
 *
 * Safe before events.js has downloaded — the base code installs a queueing
 * stub synchronously — and a no-op on the server.
 */
export function ttTrack(
  event: TikTokEvent,
  params: Record<string, unknown> = {}
) {
  if (!TIKTOK_PIXEL_ID) return;
  if (typeof window === "undefined" || typeof window.ttq?.track !== "function") {
    return;
  }

  try {
    window.ttq.track(event, params, { event_id: newTikTokEventId() });
  } catch {
    /* Tracking must never break a purchase. */
  }
}
