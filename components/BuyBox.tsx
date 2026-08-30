"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { buyNow } from "@/app/actions";
import { useCart } from "./CartProvider";
import {
  discount,
  formatMoney,
  lowStock,
  type Product,
  type Variant,
} from "@/lib/catalog";

function Countdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(endsAt).getTime();
    if (Number.isNaN(end)) return;
    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  // Nothing renders until mounted, so server and client markup agree.
  if (remaining === null || remaining === 0) return null;

  const s = Math.floor(remaining / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const days = Math.floor(s / 86400);

  // Drop the days cell on a same-day deadline — a permanent "00 DAYS" reads
  // like a broken clock rather than urgency.
  const units: Array<[string, string]> = [
    ...(days > 0 ? ([[pad(days), "Days"]] as Array<[string, string]>) : []),
    [pad(Math.floor((s % 86400) / 3600)), "Hrs"],
    [pad(Math.floor((s % 3600) / 60)), "Min"],
    [pad(s % 60), "Sec"],
  ];

  return (
    <div className="clock" role="timer" aria-label="Time remaining in this offer">
      {units.map(([value, label]) => (
        <div className="clock__u" key={label}>
          <b>{value}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Real inventory only.
 *
 * `quantityAvailable` is null unless the Storefront token carries the
 * `unauthenticated_read_product_inventory` scope, and null renders nothing at
 * all. Do not substitute a placeholder number or a hardcoded percentage here —
 * fabricated stock levels are a deceptive practice under FTC Act Section 5.
 */
function StockBar({ variant }: { variant: Variant }) {
  const stock = lowStock(variant.quantityAvailable);
  const [width, setWidth] = useState(0);

  const remaining = stock?.remaining ?? 0;
  // Bar fills as stock empties, scaled against the 10-unit low-stock window.
  const target = stock ? Math.max(6, 100 - remaining * 10) : 0;

  useEffect(() => {
    if (!stock) return;
    const id = setTimeout(() => setWidth(target), 200);
    return () => clearTimeout(id);
  }, [stock, target]);

  if (!stock) return null;

  return (
    <div className="stock">
      <div className="stock__row">
        <span className="stock__hi">
          {stock.urgent
            ? `Only ${remaining} left — order soon`
            : `Only ${remaining} left in stock`}
        </span>
      </div>
      <div className="stock__track">
        <div className="stock__fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function BuyBox({
  product,
  saleEndsAt,
  shipsIn,
}: {
  product: Product;
  saleEndsAt: string | null;
  shipsIn: string;
}) {
  const { add, openCart, error: cartError } = useCart();

  const [variant, setVariant] = useState<Variant>(
    product.variants.find((v) => v.availableForSale) ?? product.variants[0]
  );
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [buying, startBuying] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSticky, setShowSticky] = useState(false);

  const ctaRef = useRef<HTMLDivElement>(null);

  const { hasDiscount, percent, savedLabel } = discount(variant);
  const soldOut = !variant.availableForSale;

  const max = variant.quantityAvailable ?? Infinity;
  const atMax = qty >= max;

  // Clamp if the shopper switches to a variant with less stock.
  useEffect(() => {
    if (Number.isFinite(max) && qty > max) setQty(Math.max(1, max));
  }, [max, qty]);

  /**
   * The sticky bar stands in for the real Add to Cart once it has scrolled up
   * and out of view.
   *
   * Intersection alone is not enough: on a phone the main button starts below
   * the fold, so "not intersecting" is also true before the shopper has ever
   * reached it. Firing on that would cover the price with a duplicate CTA on
   * first paint. Checking that the button sits above the viewport limits the
   * bar to the case it is actually for — the shopper has scrolled past it.
   */
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      ([entry]) => {
        const scrolledPast =
          !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setShowSticky(scrolledPast);
      },
      { threshold: 0 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleAdd = async () => {
    setLocalError(null);
    setAdding(true);
    await add(variant.id, qty);
    setAdding(false);
  };

  const handleBuyNow = () => {
    setLocalError(null);
    startBuying(async () => {
      const result = await buyNow(variant.id, qty);
      if (result.ok) window.location.href = result.url;
      else setLocalError(result.error);
    });
  };

  const busy = adding || buying;
  const error = localError ?? cartError;

  return (
    <>
      <div className="price">
        <span className="price__now">{formatMoney(variant.price)}</span>
        {hasDiscount && variant.compareAtPrice && (
          <>
            <span className="price__was">
              {formatMoney(variant.compareAtPrice)}
            </span>
            <span className="price__save">Save {percent}%</span>
          </>
        )}
      </div>
      <p className="price__note">
        {hasDiscount
          ? `You save ${savedLabel}. Compare-at is our regular selling price.`
          : `All prices in ${variant.price.currencyCode}.`}
      </p>

      {hasDiscount && (
        <div className="offer">
          <div className="offer__title">🔥 Limited launch offer</div>
          <div className="offer__line">Save {percent}% today</div>
          {saleEndsAt && <Countdown endsAt={saleEndsAt} />}
          <StockBar variant={variant} />
          {/* No returns line: this product has no return policy. */}
          <div className="offer__perks">
            <span>✓ Free shipping</span>
            <span>✓ Secure checkout</span>
            <span>✓ Easy everyday wear</span>
          </div>
        </div>
      )}

      {product.variants.length > 1 && (
        <div style={{ marginTop: 18 }}>
          <label className="eyebrow" htmlFor="variant">
            Option
          </label>
          <select
            id="variant"
            value={variant.id}
            onChange={(e) => {
              const next = product.variants.find((v) => v.id === e.target.value);
              if (next) setVariant(next);
            }}
            style={{
              display: "block",
              width: "100%",
              marginTop: 8,
              height: 46,
              padding: "0 12px",
              font: "inherit",
              borderRadius: 10,
              border: "1px solid var(--line-strong)",
              background: "var(--white)",
            }}
          >
            {product.variants.map((v) => (
              <option key={v.id} value={v.id} disabled={!v.availableForSale}>
                {v.title} — {formatMoney(v.price)}
                {v.availableForSale ? "" : " (Sold out)"}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="buybox" ref={ctaRef}>
        <div className="buybox__row">
          <div className="qty">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1 || busy}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="qty__val" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              disabled={atMax || busy}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            className="btn btn--primary"
            onClick={handleAdd}
            disabled={soldOut || busy}
          >
            {soldOut ? "Sold out" : adding ? "Adding…" : "Get yours today →"}
            {!soldOut && !adding && (
              <span className="btn__sub">Ships in {shipsIn}</span>
            )}
          </button>
        </div>

        <button
          type="button"
          className="btn btn--ghost"
          onClick={handleBuyNow}
          disabled={soldOut || busy}
        >
          {buying ? "Starting checkout…" : "Buy it now"}
        </button>
      </div>

      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}

      <div className="sticky" data-show={showSticky && !soldOut}>
        <div className="sticky__price">
          <b>{formatMoney(variant.price)}</b>
          {hasDiscount && <span>Save {percent}%</span>}
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleAdd}
          disabled={soldOut || busy}
        >
          {adding ? "Adding…" : "Add to cart"}
        </button>
      </div>
    </>
  );
}
