"use client";

import { useState } from "react";

import { useCart } from "./CartProvider";
import type { Money, Product } from "@/lib/catalog";

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

  return (
    <div className="pdp__buy">
      <p className="pdp__price">
        {money(selected.price)}
        {was && <span className="pdp__was">{money(was)}</span>}
      </p>

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
        className="btn btn--pulse pdp__add"
        disabled={isAdding}
        onClick={() => add(selected.id, 1)}
      >
        {isAdding ? "Adding…" : `Add to cart → ${money(selected.price)}`}
      </button>
    </div>
  );
}
