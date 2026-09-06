"use client";

import { useCart, useReveal } from "./CartProvider";

/**
 * Not a navbar.
 *
 * The brief calls for no navigation, and on a single-page impulse buy every
 * link is an exit. What remains is the one control the page genuinely needs:
 * a way back into the cart after the drawer has been dismissed. Without it a
 * shopper who closes the drawer has no route to checkout.
 */
export default function Header() {
  const { cart, openCart } = useCart();
  useReveal();

  const count = cart?.totalQuantity ?? 0;

  return (
    <header className="topbar">
      <div className="wrap topbar__inner">
        <span className="brand">
          SQUISH<span className="grad-text">BOX</span>
        </span>

        <button
          type="button"
          className="iconbtn"
          onClick={openCart}
          aria-label={
            count > 0
              ? `Open cart, ${count} item${count === 1 ? "" : "s"}`
              : "Open cart"
          }
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 8h12l-1 12H7L6 8Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M9.5 8V6.5a2.5 2.5 0 0 1 5 0V8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          {count > 0 && (
            <span className="cartcount" aria-hidden="true">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
