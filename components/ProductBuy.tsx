"use client";

import { useEffect, useRef, useState } from "react";

import { useCart } from "./CartProvider";
import { lowStock } from "@/lib/catalog";
import type { Money, Product } from "@/lib/catalog";
import { track } from "@/lib/pixel";

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

  const sellable = product.variants.filter((v) => v.availableForSale);
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

      {sellable.length > 1 && (
        <div
          className="pdp__variants"
          role="radiogroup"
          aria-label="Choose an option"
        >
          {sellable.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={v.id === selected.id}
              className={
                "pdp__variant" +
                (v.id === selected.id ? " pdp__variant--on" : "")
              }
              onClick={() => setSelectedId(v.id)}
            >
              <span>{v.title}</span>
              <b>{money(v.price)}</b>
            </button>
          ))}
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
