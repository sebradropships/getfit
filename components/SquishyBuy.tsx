"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { discount, formatMoney, lowStock, type Product, type Variant } from "@/lib/catalog";
import {
  BUNDLES,
  COUNTDOWN,
  FLASH_SALE,
  PRODUCT,
  TRUST,
  findVariant,
  ratingSummary,
  type Bundle,
} from "@/lib/squishy-config";

/** A bundle paired with the Shopify variant that actually sells it. */
type Offer = {
  bundle: Bundle;
  variant: Variant | null;
  /** Formatted price — real when the variant exists, preview otherwise. */
  price: string;
  perBox: string;
};

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    // Whole-dollar prices read better without trailing zeros on a page like
    // this, but anything with cents still shows them.
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

function Countdown({ endsAt, label }: { endsAt: string; label: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(endsAt).getTime();
    if (Number.isNaN(end)) return;
    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  // Renders nothing until mounted so server and client markup agree, and
  // nothing once expired — the offer is over, so the timer goes away rather
  // than restarting.
  if (remaining === null || remaining === 0) return null;

  const s = Math.floor(remaining / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const units: Array<[string, string]> = [
    [pad(Math.floor(s / 86400)), "Days"],
    [pad(Math.floor((s % 86400) / 3600)), "Hrs"],
    [pad(Math.floor((s % 3600) / 60)), "Min"],
    [pad(s % 60), "Sec"],
  ];

  return (
    <div className="countdown">
      <div className="countdown__label">{label}</div>
      <div className="countdown__row" role="timer">
        {units.map(([v, l]) => (
          <div className="cd" key={l}>
            <b>{v}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SquishyBuy({ product }: { product: Product | null }) {
  const { add, error: cartError } = useCart();

  const currency =
    product?.variants[0]?.price.currencyCode ?? PRODUCT.fallback.currency;

  /**
   * Each bundle is resolved to its Shopify variant by title. A bundle whose
   * variant is missing can still be previewed, but cannot be bought — we will
   * not take an order at a price Shopify has not agreed to.
   */
  const offers = useMemo<Offer[]>(
    () =>
      BUNDLES.map((bundle) => {
        const variant = findVariant(product, bundle);

        const amount = variant
          ? Number(variant.price.amount)
          : bundle.previewPrice;

        return {
          bundle,
          variant,
          price: money(amount, currency),
          perBox: money(
            Math.round((amount / bundle.boxes) * 100) / 100,
            currency
          ),
        };
      }),
    [product, currency]
  );

  const live = offers.some((o) => o.variant);

  /**
   * Once the product is live, only bundles backed by a real variant are shown.
   * A bundle without one cannot be sold at the price on its row, and listing
   * an offer that cannot be bought at the stated price is worse than not
   * listing it. Before the product exists everything renders, so the full
   * layout is still previewable.
   */
  const visible = live ? offers.filter((o) => o.variant) : offers;

  // Prefer the highlighted bundle, but only among the ones actually on offer.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const defaultId =
    visible.find((o) => o.bundle.highlight)?.bundle.id ??
    visible[0]?.bundle.id ??
    null;
  const activeId = selectedId ?? defaultId;
  const selected =
    visible.find((o) => o.bundle.id === activeId) ?? visible[0] ?? null;

  const [adding, setAdding] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  // The sticky bar stands in for the CTA only once it has scrolled up and out
  // of view. Checking that it sits above the viewport keeps the bar from
  // appearing before the shopper has ever reached the button.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) =>
        setShowBar(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const singleVariant =
    findVariant(product, BUNDLES[0]) ?? product?.variants[0] ?? null;

  const unitDiscount = singleVariant ? discount(singleVariant) : null;

  // Unit price falls back to the preview value only while the variant is
  // missing; once Shopify has it, Shopify is the source of truth.
  const unitAmount = singleVariant
    ? Number(singleVariant.price.amount)
    : BUNDLES[0].previewPrice;
  const unitPrice = money(unitAmount, currency);
  // Only strike a "was" price through when it is genuinely higher. Shopify
  // currently carries a compare-at equal to the price, which would otherwise
  // render "$4.45 $4.45" and imply a discount that does not exist.
  const unitWas = singleVariant
    ? unitDiscount?.hasDiscount && singleVariant.compareAtPrice
      ? formatMoney(singleVariant.compareAtPrice)
      : null
    : money(PRODUCT.fallback.originalPrice, currency);

  const rating = ratingSummary();
  const stock = selected?.variant
    ? lowStock(selected.variant.quantityAvailable)
    : null;

  const soldOut = Boolean(selected?.variant && !selected.variant.availableForSale);
  const canBuy = Boolean(selected?.variant) && !soldOut;

  const buy = async () => {
    if (!selected?.variant) return;
    setAdding(true);
    await add(selected.variant.id, 1);
    setAdding(false);
  };

  const scrollToOffer = () => {
    document
      .getElementById("offer")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <>
      {rating.show && (
        <div className="rating">
          <span className="stars" aria-hidden="true">
            ★★★★★
          </span>
          <span>
            {rating.average}/5
            <span className="sr"> from {rating.count} reviews</span>
          </span>
        </div>
      )}

      <div className="pricebar" id="offer">
        {FLASH_SALE.enabled && unitDiscount?.hasDiscount && (
          <span className="flash">
            🔥 {unitDiscount.percent}% OFF {FLASH_SALE.label}
          </span>
        )}

        {/*
          The headline always anchors on the price of ONE box.

          Preselecting the 4-box bundle would otherwise put "$54" in the
          largest type on the page, which buries the $18 impulse price the
          whole hook depends on. The selected bundle's total is never hidden —
          it sits on its own row and again on the button.
        */}
        <div className="prices">
          <span className="price-now">{unitPrice}</span>
          {unitWas && <span className="price-was">{unitWas}</span>}
          {unitDiscount?.hasDiscount && (
            <span className="price-off">SAVE {unitDiscount.percent}%</span>
          )}
        </div>
        <p className="perbox">
          per box
          {selected && selected.bundle.boxes > 1 && (
            <>
              {" · "}
              {selected.bundle.boxes} boxes ={" "}
              <b>{selected.price}</b> ({selected.perBox} each)
            </>
          )}
        </p>

        {COUNTDOWN.endsAt && (
          <Countdown endsAt={COUNTDOWN.endsAt} label={COUNTDOWN.label} />
        )}

        {/* Real inventory only. Hidden entirely when Shopify won't share it —
            never replaced with an invented number. */}
        {stock && (
          <p className="buybar__off" style={{ marginTop: 12 }}>
            Only {stock.remaining} box{stock.remaining === 1 ? "" : "es"} remaining
          </p>
        )}

        <div className="bundles" role="radiogroup" aria-label="Choose your bundle">
          {visible.map((offer) => {
            const { bundle } = offer;
            const isOn = bundle.id === activeId;
            return (
              <button
                key={bundle.id}
                type="button"
                role="radio"
                aria-checked={isOn}
                className={`bundle${bundle.highlight ? " bundle--best" : ""}`}
                onClick={() => setSelectedId(bundle.id)}
              >
                {bundle.badge && (
                  <span className="bundle__badge">{bundle.badge}</span>
                )}
                <span className="bundle__dot" aria-hidden="true" />
                <span>
                  <span className="bundle__h">{bundle.heading}</span>
                  <span className="bundle__sub">{bundle.subline}</span>
                </span>
                <span className="bundle__price">
                  <b>{offer.price}</b>
                  <span>
                    {bundle.boxes} box{bundle.boxes === 1 ? "" : "es"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div ref={ctaRef} style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btn--pulse"
            onClick={buy}
            disabled={!canBuy || adding}
          >
            {soldOut
              ? "Sold out"
              : adding
                ? "Adding…"
                : `Get my surprise box → ${selected?.price ?? ""}`}
          </button>
        </div>

        {!live && (
          <p className="soldout">
            Preview mode — prices shown are placeholders. Publish{" "}
            <code>{PRODUCT.handle}</code> to the Headless sales channel in
            Shopify and every price here switches to live data.
          </p>
        )}

        {live && visible.length < BUNDLES.length && (
          <p className="soldout">
            Only the bundles that exist in Shopify are shown. Add{" "}
            {BUNDLES.filter((b) => !visible.some((v) => v.bundle.id === b.id))
              .map((b) => `"${b.variantTitle}"`)
              .join(" and ")}{" "}
            as variants to offer them.
          </p>
        )}

        {cartError && (
          <p className="err" role="alert">
            {cartError}
          </p>
        )}

        <div className="trustrow">
          {TRUST.map((t) => (
            <span key={t.label}>
              {t.icon} {t.label}
            </span>
          ))}
        </div>
      </div>

      <div className="buybar" data-show={showBar}>
        <div className="buybar__info">
          {unitDiscount?.hasDiscount && (
            <div className="buybar__off">{unitDiscount.percent}% OFF</div>
          )}
          <div className="buybar__price">{selected?.price}</div>
        </div>
        <button
          type="button"
          className="btn"
          onClick={canBuy ? buy : scrollToOffer}
          disabled={adding}
        >
          {adding ? "Adding…" : canBuy ? "Get mine →" : "See offer →"}
        </button>
      </div>
    </>
  );
}
