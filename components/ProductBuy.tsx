"use client";

import { useEffect, useRef, useState } from "react";

import { useCart } from "./CartProvider";
import { isSoldOut, lowStock } from "@/lib/catalog";
import type { Money, Product } from "@/lib/catalog";
import { track } from "@/lib/pixel";
import { ttTrack } from "@/lib/tiktok-pixel";

function money(m: Money): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: m.currencyCode,
    minimumFractionDigits: 2,
  }).format(Number(m.amount));
}

/**
 * Variant picker and add-to-cart for a single product page.
 *
 * Only sellable variants are offered, so the button can never be wired to a
 * merchandise id that checkout would reject. The price shown is always the
 * selected variant's price — the same number the button charges.
 */
export default function ProductBuy({ product }: { product: Product }) {
  const { add, isAdding } = useCart();

  /*
    Which variants can actually be bought. This drives selection only — the
    picker below renders EVERY variant, including the sold-out ones, so a
    shopper can see that the 4-pack exists and is unavailable rather than
    wondering why it vanished. Hiding them was the old behaviour and it read as
    a broken page.
  */
  const sellable = product.variants.filter((v) => !isSoldOut(v));
  const [selectedId, setSelectedId] = useState<string>(sellable[0]?.id ?? "");
  const selected = sellable.find((v) => v.id === selectedId) ?? sellable[0] ?? null;

  /*
    ViewContent, once per product page.

    It lives here rather than in a tracker component rendered by the page
    because `selected` is the single source of truth for what this page is
    actually offering. A separate component would have to re-derive "first
    sellable variant" and could drift, reporting a variant the shopper was
    never shown.

    Fired once per product id, deliberately not on every variant change:
    re-firing on each radio click would stack several ViewContents against one
    page view and quietly understate cost per view. The ref also absorbs the
    double effect invocation React Strict Mode does in development.

    No wait for the pixel is needed — the base code runs inline during parse,
    so window.fbq exists (as the queueing stub at worst) long before this
    effect, and track() is a no-op when it does not.
  */
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    if (!selected) return;
    if (viewed.current === product.id) return;
    viewed.current = product.id;

    track("ViewContent", {
      content_ids: [selected.id],
      content_type: "product",
      content_name: product.title,
      currency: selected.price.currencyCode,
      value: Number(selected.price.amount),
    });

    /*
      The same view, for TikTok. Note the payload is NOT the Meta one: TikTok
      takes a `contents` array of `content_id` objects and has no `content_ids`
      field at all, so passing Meta's shape through would be accepted by the
      pixel and recorded with no product attached — a populated event that
      cannot build a product audience or report content-level cost.
    */
    ttTrack("ViewContent", {
      contents: [
        {
          content_id: selected.id,
          content_type: "product",
          content_name: product.title,
          price: Number(selected.price.amount),
          quantity: 1,
        },
      ],
      currency: selected.price.currencyCode,
      value: Number(selected.price.amount),
    });
  }, [product.id, product.title, selected]);

  if (!selected) {
    return (
      <p className="pdp__sold" role="status">
        Sold out
      </p>
    );
  }

  /*
    Only strike a "was" price through when Shopify carries a compare-at that is
    genuinely higher. Several products in this catalogue arrived with a
    compare-at of 0.00, which would otherwise render as a discount that does
    not exist.
  */
  const was =
    selected.compareAtPrice &&
    Number(selected.compareAtPrice.amount) > Number(selected.price.amount)
      ? selected.compareAtPrice
      : null;

  /*
    The selected variant's own stock, not a product total - this line sits
    beside the button that buys exactly this variant. Null when Shopify
    withholds quantities, and null renders nothing.
  */
  const stock = lowStock(selected.quantityAvailable);

  return (
    <div className="pdp__buy">
      <p className="pdp__price">
        {money(selected.price)}
        {was && <span className="pdp__was">{money(was)}</span>}
      </p>

      {stock && (
        <p
          className={"pdp__stock" + (stock.urgent ? " pdp__stock--urgent" : "")}
          role="status"
        >
          🔥 Only {stock.remaining} left!
        </p>
      )}

      {/*
        Gated on the full variant count, not the sellable count. A product with
        one option in stock and three sold out still needs the picker, because
        the three sold-out ones are the information the shopper is missing.
      */}
      {product.variants.length > 1 && (
        <div
          className="pdp__variants"
          role="radiogroup"
          aria-label="Choose an option"
        >
          {product.variants.map((v) => {
            const out = isSoldOut(v);

            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                /* A sold-out option is never the checked one, even if it
                   somehow shares an id with the selection. */
                aria-checked={!out && v.id === selected.id}
                disabled={out}
                className={
                  "pdp__variant" +
                  (!out && v.id === selected.id ? " pdp__variant--on" : "") +
                  (out ? " pdp__variant--out" : "")
                }
                /* `disabled` already blocks the click; the guard keeps the
                   intent explicit and survives someone removing the attribute
                   to chase a styling bug. */
                onClick={() => {
                  if (!out) setSelectedId(v.id);
                }}
              >
                <span>{v.title}</span>
                <b>{money(v.price)}</b>
                {out && <em className="pdp__variant-tag">Sold out</em>}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="btn btn--jelly pdp__add"
        disabled={isAdding}
        onClick={() => add(selected.id, 1)}
      >
        {isAdding ? "Adding…" : `Add to cart → ${money(selected.price)}`}
      </button>
    </div>
  );
}
