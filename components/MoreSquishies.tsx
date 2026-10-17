"use client";

import Image from "next/image";

import { useCart } from "./CartProvider";
import type { Money, Product, Variant } from "@/lib/catalog";

function money(m: Money): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: m.currencyCode,
    minimumFractionDigits: 2,
  }).format(Number(m.amount));
}

/**
 * The cheapest variant that can actually be bought, or null when none can.
 *
 * There is no variant picker in this strip, so the button has to commit to one
 * variant. It commits to the cheapest sellable one and the price label says
 * "from", which keeps the number on screen the number the button charges. A
 * product with nothing sellable renders as sold out rather than as a button
 * that would fail at checkout.
 */
function cheapestSellable(product: Product): Variant | null {
  const sellable = product.variants.filter((v) => v.availableForSale);
  if (sellable.length === 0) return null;
  return sellable.reduce((lowest, v) =>
    Number(v.price.amount) < Number(lowest.price.amount) ? v : lowest
  );
}

export default function MoreSquishies({ products }: { products: Product[] }) {
  const { add, isAdding } = useCart();

  if (products.length === 0) return null;

  return (
    <div className="more">
      {products.map((product) => {
        const variant = cheapestSellable(product);
        const sellableCount = product.variants.filter(
          (v) => v.availableForSale
        ).length;
        const image = product.featuredImage ?? product.images[0] ?? null;

        return (
          <article className="more__card" key={product.id}>
            {image && (
              <Image
                className="more__img"
                src={image.url}
                alt={image.altText || product.title}
                width={image.width}
                height={image.height}
                sizes="(min-width: 900px) 30vw, 45vw"
              />
            )}

            <h3 className="more__name">{product.title}</h3>

            {variant ? (
              <>
                <p className="more__price">
                  {sellableCount > 1 && (
                    <span className="more__from">from </span>
                  )}
                  {money(variant.price)}
                </p>
                <button
                  type="button"
                  className="btn btn--light more__add"
                  disabled={isAdding}
                  onClick={() => add(variant.id, 1)}
                >
                  Add to cart
                </button>
              </>
            ) : (
              <p className="more__price more__price--out">Sold out</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
