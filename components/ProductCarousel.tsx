import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import { productLowStock } from "@/lib/catalog";
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

function Card({ product, duplicate }: { product: Product; duplicate: boolean }) {
  const variant = cheapestSellable(product);
  const sellableCount = product.variants.filter((v) => v.availableForSale).length;
  const image = product.featuredImage ?? product.images[0] ?? null;
  const line = blurb(product.description ?? "");
  /*
    Real stock or nothing. productLowStock returns null when Shopify will not
    share quantities, so the badge stays dark rather than inventing a number.
  */
  const stock = productLowStock(product);

  return (
    <div className="carousel__item" role={duplicate ? undefined : "listitem"}>
      <Link
        className="pcard"
        href={`/products/${product.handle}`}
        /* The second copy exists only to make the loop seamless. It is hidden
           from assistive tech and taken out of the tab order so the same
           eighteen products are not announced or tabbed through twice. */
        tabIndex={duplicate ? -1 : undefined}
      >
        {image && (
          <Image
            className="pcard__img"
            src={image.url}
            alt={duplicate ? "" : image.altText || product.title}
            width={image.width}
            height={image.height}
            sizes="(min-width: 1000px) 300px, (min-width: 700px) 260px, 215px"
          />
        )}

        <h3 className="pcard__name">{product.title}</h3>
        {line && <p className="pcard__blurb">{line}</p>}

        <p className="pcard__price">
          {variant ? (
            <>
              {sellableCount > 1 && <span className="pcard__from">from </span>}
              {money(variant.price)}
            </>
          ) : (
            <span className="pcard__out">Sold out</span>
          )}
        </p>

        {stock && (
          <p
            className={
              "pcard__stock" + (stock.urgent ? " pcard__stock--urgent" : "")
            }
          >
            🔥 Only {stock.remaining} left!
          </p>
        )}
      </Link>
    </div>
  );
}

/**
 * Continuously looping product strip.
 *
 * The track holds the catalogue twice and slides exactly one copy's width
 * before repeating, which is what makes the wrap invisible — there is no jump
 * back to the start because the second copy is already where the first one
 * was. The duplicate costs no extra network: every image URL is identical, so
 * the browser serves the copies from cache.
 *
 * It pauses on hover and on keyboard focus, because the cards are links and a
 * moving target is not clickable. Under prefers-reduced-motion the animation
 * is dropped entirely and the strip falls back to the manual scroll-snap row
 * it used to be.
 */
export default function ProductCarousel({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  /*
    Seconds per card, which keeps the speed constant as the catalogue grows
    rather than accelerating with every product added.

    Both ends of this have been wrong, so the numbers are worth keeping. At
    5s the strip crawled at 54px/s and a card took fifty seconds to come back
    around, which read as a gap in the loop even though the seam measures
    gapless to within 0.01px on the live page. At 2.5s it ran at 109px/s,
    which cured the stall but pushed the cards past a comfortable reading and
    tapping speed. 3.5s sits between the two: ~78px/s, a full cycle in 45s.
  */
  const duration = Math.max(20, products.length * 3.5);

  return (
    <div className="marquee">
      <div
        className="marquee__track"
        style={{ "--marquee-duration": `${duration}s` } as CSSProperties}
      >
        <div
          className="marquee__group"
          role="list"
          aria-label="Browse the collection"
        >
          {products.map((product) => (
            <Card key={product.id} product={product} duplicate={false} />
          ))}
        </div>

        <div className="marquee__group" aria-hidden="true">
          {products.map((product) => (
            <Card key={`${product.id}-dup`} product={product} duplicate />
          ))}
        </div>
      </div>
    </div>
  );
}
