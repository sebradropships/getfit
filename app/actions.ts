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

    const cart = await createCart(merchandiseId, quantity);
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
    const cart = await createCart(merchandiseId, quantity);
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
