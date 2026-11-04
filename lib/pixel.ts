/**
 * Meta Pixel — shared config and the browser-side track helper.
 *
 * The pixel ID comes from the environment, never from source. The ad account
 * and its pixel are created separately from this deploy, so hardcoding an ID
 * would mean a code change (and a redeploy) the moment it exists. With this,
 * setting NEXT_PUBLIC_META_PIXEL_ID in Vercel is the whole switch-on.
 *
 * With no ID set, every function here is inert and MetaPixel renders nothing —
 * so this ships safely before the pixel exists.
 */

/** Empty until NEXT_PUBLIC_META_PIXEL_ID is set. Inlined at build time. */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";

/** Fired on window once the base code has run, for anything that needs to wait. */
export const PIXEL_READY_EVENT = "squishy:pixel-ready";

type PixelEvent = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout";

type Fbq = (
  method: "track" | "init",
  event: string,
  params?: Record<string, unknown>,
  options?: { eventID: string }
) => void;

declare global {
  interface Window {
    fbq?: Fbq;
    __squishyPixelInit?: number;
  }
}

/**
 * A unique id per event occurrence.
 *
 * Meta deduplicates a browser event against a server copy on
 * event_name + event_id. Nothing sends a server copy yet, but minting the id
 * here means adding the Conversions API later needs no change at the call
 * sites — only a relay that forwards this same id.
 */
export function newEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Fire a pixel event from the browser.
 *
 * Safe to call before fbevents.js has finished downloading: the base code
 * installs a queueing stub synchronously, so fbq buffers and replays. Safe to
 * call on the server too, where it is a no-op.
 */
export function track(event: PixelEvent, params: Record<string, unknown> = {}) {
  if (!META_PIXEL_ID) return;
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;

  try {
    window.fbq("track", event, params, { eventID: newEventId() });
  } catch {
    /* Tracking must never break a purchase. */
  }
}
