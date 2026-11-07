"use server";

import { cookies } from "next/headers";
import {
  addCartLine,
  createCart,
  getCart,
  removeCartLine,
  updateCartLine,
} from "@/lib/shopify";
import type { Cart } from "@/lib/catalog";
import { TTCLID_COOKIE, TTP_COOKIE } from "@/lib/tiktok-pixel";

const CART_COOKIE = "cart_id";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export type CartResult =
  | { ok: true; cart: Cart }
  | { ok: false; error: string };

/** Never leak Shopify internals to the browser. Log the detail, show a line. */
function fail(context: string, err: unknown, message: string): CartResult {
  console.error(
    `${context} failed:`,
    err instanceof Error ? err.message : String(err)
  );
  return { ok: false, error: message };
}

async function readCartId(): Promise<string | undefined> {
  return (await cookies()).get(CART_COOKIE)?.value;
}

async function writeCartId(id: string) {
  (await cookies()).set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

async function clearCartId() {
  (await cookies()).delete(CART_COOKIE);
}

/**
 * Browser and click identifiers for both ad platforms, lifted off the incoming
 * request.
 *
 * Checkout happens on shop.viraltoys.us, so a server-side Purchase is
 * assembled from the Shopify order and never sees the shopper's browser.
 * Attaching these at cart creation is what carries them across: they come back
 * on the order as `note_attributes`. Without a click id a purchase arrives with
 * no way to tie it to an ad, which a 7-day click-through ad set cannot
 * attribute — the sale lands in Shopify and never in the ads dashboard.
 *
 * All four are first-party, non-httpOnly cookies on viraltoys.us, so they ride
 * along with the server action's own request and need no client plumbing.
 * Anything absent is omitted rather than sent empty.
 *
 * The two platforms are NOT symmetrical, and the asymmetry is invisible if you
 * only read this list:
 *
 *   `_fbp` / `_fbc`   written by Meta's fbevents.js. It converts `?fbclid=`
 *                     into `_fbc` by itself, so there is nothing to do but
 *                     read it. The orders-paid webhook already consumes both.
 *   `_ttp`            written by TikTok's events.js. The `_fbp` twin.
 *   `_ttclid`         written by OUR OWN inline script in
 *                     components/TikTokPixel.tsx. TikTok's events.js has no
 *                     `_fbc` equivalent and leaves `ttclid` in the query
 *                     string, so without that script this is always absent and
 *                     the TikTok leg silently attributes nothing.
 *
 * The TikTok pair is banked here but not yet consumed: the orders-paid route
 * sends Meta only. They land on the order from today so that the TikTok Events
 * API relay, when it is added, has real click ids waiting for it in historical
 * orders rather than starting cold.
 */
async function clickAttribution(): Promise<Array<{ key: string; value: string }>> {
  const jar = await cookies();

  const names = ["_fbp", "_fbc", TTP_COOKIE, TTCLID_COOKIE] as const;

  return names.flatMap((name) => {
    const value = jar.get(name)?.value;
    return value ? [{ key: name, value }] : [];
  });
}

/**
 * Reads the current cart. A cart ID that Shopify no longer recognises — one
 * that has already been checked out, or has expired — is cleared rather than
 * surfaced as an error, so the shopper simply sees an empty cart.
 */
export async function fetchCart(): Promise<Cart | null> {
  const id = await readCartId();
  if (!id) return null;

  try {
    const cart = await getCart(id);
    if (!cart) await clearCartId();
    return cart;
  } catch (err) {
    console.error(
      "fetchCart failed:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

export async function addToCart(
  merchandiseId: string,
  quantity = 1
): Promise<CartResult> {
  try {
    const id = await readCartId();

    if (id) {
      const existing = await getCart(id);
      if (existing) {
        // Shopify merges duplicate merchandise into the existing line itself.
        const cart = await addCartLine(id, merchandiseId, quantity);
        return { ok: true, cart };
      }
      await clearCartId();
    }

    const cart = await createCart(
      merchandiseId,
      quantity,
      await clickAttribution()
    );
    await writeCartId(cart.id);
    return { ok: true, cart };
  } catch (err) {
    return fail(
      "addToCart",
      err,
      "We couldn't add that to your cart. Please try again."
    );
  }
}

export async function setLineQuantity(
  lineId: string,
  quantity: number
): Promise<CartResult> {
  try {
    const id = await readCartId();
    if (!id) return { ok: false, error: "Your cart has expired." };

    const cart =
      quantity <= 0
        ? await removeCartLine(id, lineId)
        : await updateCartLine(id, lineId, quantity);

    return { ok: true, cart };
  } catch (err) {
    return fail(
      "setLineQuantity",
      err,
      "We couldn't update that quantity. Please try again."
    );
  }
}

export async function removeLine(lineId: string): Promise<CartResult> {
  try {
    const id = await readCartId();
    if (!id) return { ok: false, error: "Your cart has expired." };
    const cart = await removeCartLine(id, lineId);
    return { ok: true, cart };
  } catch (err) {
    return fail(
      "removeLine",
      err,
      "We couldn't remove that item. Please try again."
    );
  }
}

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Buy Now — creates a single-line cart and hands back Shopify's hosted
 * checkout URL. Payment is handled entirely by Shopify, so this application
 * never sees card data and stays out of PCI scope.
 */
export async function buyNow(
  merchandiseId: string,
  quantity = 1
): Promise<CheckoutResult> {
  try {
    const cart = await createCart(
      merchandiseId,
      quantity,
      await clickAttribution()
    );
    return { ok: true, url: cart.checkoutUrl };
  } catch (err) {
    console.error(
      "buyNow failed:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      ok: false,
      error: "We couldn't start checkout. Please try again.",
    };
  }
}
