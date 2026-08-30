"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { cdnImage, cdnSrcSet, formatMoney } from "@/lib/catalog";

export default function CartDrawer({
  shopHref,
  freeShippingThreshold,
}: {
  shopHref: string;
  freeShippingThreshold: number | null;
}) {
  const { cart, isOpen, closeCart, setQuantity, remove, pending, isAdding, error } =
    useCart();

  const lines = cart?.lines ?? [];
  // While an add is in flight the cart is genuinely empty, but saying so would
  // contradict the tap that just opened this drawer. Show progress instead.
  const isEmpty = lines.length === 0 && !isAdding;
  const showSkeleton = lines.length === 0 && isAdding;

  const subtotalValue = cart ? Number(cart.subtotal.amount) : 0;
  const away =
    freeShippingThreshold !== null && cart
      ? Math.max(0, freeShippingThreshold - subtotalValue)
      : null;

  // inert keeps the closed drawer out of the tab order and the a11y tree.
  return (
    <div className="drawer" data-open={isOpen} inert={!isOpen}>
      <div className="drawer__scrim" onClick={closeCart} />

      <div
        className="drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <div className="drawer__head">
          <h2>Your cart</h2>
          <button
            type="button"
            className="iconbtn"
            onClick={closeCart}
            aria-label="Close cart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="drawer__body">
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}

          {showSkeleton ? (
            <div className="line" aria-live="polite">
              <div className="line__img skel" />
              <div>
                <div className="skel skel--text" style={{ width: "80%" }} />
                <div
                  className="skel skel--text"
                  style={{ width: "45%", marginTop: 8 }}
                />
                <span className="sr">Adding to your cart…</span>
              </div>
            </div>
          ) : isEmpty ? (
            <div className="empty">
              <h3>Your cart is waiting.</h3>
              <p>
                Discover something designed to become part of your everyday
                ritual.
              </p>
              <Link href={shopHref} className="btn btn--primary" onClick={closeCart}>
                Shop the bracelet
              </Link>
            </div>
          ) : (
            <>
              {lines.map((line) => {
                // Cap at real inventory when Shopify shares it; otherwise the
                // only ceiling is Shopify's own validation at checkout.
                const max = line.quantityAvailable ?? Infinity;
                const atMax = line.quantity >= max;

                return (
                  <div className="line" key={line.id}>
                    <div className="line__img">
                      {line.image && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={cdnImage(line.image.url, 68)}
                          srcSet={cdnSrcSet(line.image.url, 68)}
                          alt={line.image.altText ?? line.title}
                          width={68}
                          height={68}
                          loading="lazy"
                        />
                      )}
                    </div>

                    <div>
                      <div className="line__name">{line.title}</div>
                      <div className="line__meta">
                        {line.variantTitle !== "Default Title" && (
                          <>{line.variantTitle} · </>
                        )}
                        {formatMoney(line.price)}
                      </div>

                      <div className="line__foot">
                        <div className="qty">
                          <button
                            type="button"
                            onClick={() =>
                              setQuantity(line.id, line.quantity - 1)
                            }
                            disabled={pending || line.quantity <= 1}
                            aria-label={`Decrease quantity of ${line.title}`}
                          >
                            −
                          </button>
                          <span className="qty__val" aria-live="polite">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setQuantity(line.id, line.quantity + 1)
                            }
                            disabled={pending || atMax}
                            aria-label={`Increase quantity of ${line.title}`}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          className="line__rm"
                          onClick={() => remove(line.id)}
                          disabled={pending}
                        >
                          Remove
                        </button>
                      </div>

                      {atMax && Number.isFinite(max) && (
                        <p className="line__meta" style={{ marginTop: 6 }}>
                          Only {max} available
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/*
                Upsell slot. Intentionally empty — this is a one-product launch
                and inventing companion products would be fabricating a
                catalogue. Render a <CartUpsell /> here when real products exist.
              */}
            </>
          )}
        </div>

        {!isEmpty && cart && (
          <div className="drawer__foot">
            {away !== null && away > 0 && (
              <p className="drawer__note">
                You&rsquo;re {formatMoney({ amount: away.toFixed(2), currencyCode: cart.subtotal.currencyCode })}{" "}
                away from free shipping.
              </p>
            )}

            <div className="drawer__sub">
              <span>Subtotal</span>
              <span>{formatMoney(cart.subtotal)}</span>
            </div>
            <p className="drawer__note">
              Shipping and taxes calculated at checkout.
            </p>

            <a
              className="btn btn--primary"
              href={cart.checkoutUrl}
              aria-disabled={pending}
            >
              Checkout
            </a>

            <button
              type="button"
              className="btn btn--ghost"
              onClick={closeCart}
              style={{ marginTop: 8 }}
            >
              Continue shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
