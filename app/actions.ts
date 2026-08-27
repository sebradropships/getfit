"use server";

import { createCheckout } from "@/lib/shopify";

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function startCheckout(
  variantId: string,
  quantity = 1
): Promise<CheckoutResult> {
  try {
    const url = await createCheckout(variantId, quantity);
    return { ok: true, url };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not start checkout";
    console.error("startCheckout failed:", message);
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
}
