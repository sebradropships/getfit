import Image from "next/image";
import Link from "next/link";

import type { Money, Product, Variant } from "@/lib/catalog";

function money(m: Money): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: m.currencyCode,
    minimumFractionDigits: 2,
  }).format(Number(m.amount));
}

/**
 * The cheapest variant a shopper can actually buy, or null when none can.
 *
 * The card shows one price for a product that may have several variants, so
 * it shows the lowest sellable one and prefixes "from" when there is more
 * than one. The card links to the product page rather than adding to cart, so
 * the shopper picks the variant there — the number here is a floor, and it is
 * labelled as one.
 */
function cheapestSellable(product: Product): Variant | null {
  const sellable = product.variants.filter((v) => v.availableForSale);
  if (sellable.length === 0) return null;
  return sellable.reduce((lowest, v) =>
    Number(v.price.amount) < Number(lowest.price.amount) ? v : lowest
  );
}

/**
 * A one-line blurb from Shopify's plain-text description.
 *
 * `description` is already HTML-stripped by Shopify — `descriptionHtml` is the
 * markup version — so this only has to shorten it. It cuts at a word boundary
 * rather than mid-word, and returns "" for the supplier dumps that are nothing
 * but spec tables, so the card drops the line instead of printing debris.
 */
export function blurb(text: string, max = 95): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length === 0) return "";
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "") + "…";
}

/**
 * Horizontally scrolling product strip.
 *
 * Deliberately a server component with no JavaScript: it is CSS scroll-snap
 * over a flex row, so it works before hydration and costs nothing on mobile,
 * where this page's traffic lands. Cards link to the product page; buying
 * happens there.
 */
export default function ProductCarousel({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <div className="carousel" role="list" aria-label="Browse the collection">
      {products.map((product) => {
        const variant = cheapestSellable(product);
        const sellableCount = product.variants.filter(
          (v) => v.availableForSale
        ).length;
        const image = product.featuredImage ?? product.images[0] ?? null;
        const line = blurb(product.description ?? "");

        return (
          <div className="carousel__item" role="listitem" key={product.id}>
            <Link className="pcard" href={`/products/${product.handle}`}>
              {image && (
                <Image
                  className="pcard__img"
                  src={image.url}
                  alt={image.altText || product.title}
                  width={image.width}
                  height={image.height}
                  sizes="(min-width: 900px) 240px, 46vw"
                />
              )}

              <h3 className="pcard__name">{product.title}</h3>
              {line && <p className="pcard__blurb">{line}</p>}

              <p className="pcard__price">
                {variant ? (
                  <>
                    {sellableCount > 1 && (
                      <span className="pcard__from">from </span>
                    )}
                    {money(variant.price)}
                  </>
                ) : (
                  <span className="pcard__out">Sold out</span>
                )}
              </p>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
