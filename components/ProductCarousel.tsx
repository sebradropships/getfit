import Image from "next/image";
import Link from "next/link";

import CarouselAutoplay from "@/components/CarouselAutoplay";
import { productLowStock } from "@/lib/catalog";
import { blurb } from "@/lib/text";
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
        /* The outer copies exist only to make the loop seamless. They are
           hidden from assistive tech and taken out of the tab order so the
           same thirteen products are not announced or tabbed through three
           times. They stay clickable, though: a copy is pixel-identical to the
           card it duplicates and points at the same product, so a tap on one
           has to go somewhere rather than nowhere. */
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
 * Looping product strip the visitor can also swipe.
 *
 * Three copies of the catalogue sit side by side and the strip rests in the
 * middle one, which is what lets a swipe run a long way in either direction
 * before it can reach a real end. Sliding the scroll position by exactly one
 * copy puts it back in the middle and changes nothing on screen, because the
 * content is periodic — that is the wrap, and it is invisible rather than
 * merely well hidden.
 *
 * The third copy looks expensive and is not. Every image URL is identical, so
 * it costs no network at all, and the 46KB of markup it adds compresses to 35
 * bytes because it sits inside the compression window of the copy in front of
 * it. What it buys is runway: 3.1 screens of swipe in either direction before
 * a gesture could reach a boundary, against 1.5 with two copies.
 *
 * This stays a server component. Only the thin wrapper that owns the animation
 * frame loop is client code; the cards are rendered here and handed down as
 * children, so making the strip swipeable did not move thirty-nine product
 * cards into the client bundle.
 */
export default function ProductCarousel({
  products,
  labelledBy,
}: {
  products: Product[];
  /* The id of the visible heading above the strip. A list that already has a
     heading should be named by it rather than by a second, invented label that
     only a screen reader ever hears. */
  labelledBy?: string;
}) {
  if (products.length === 0) return null;

  /*
    Seconds per card, which keeps the speed constant as the catalogue grows
    rather than accelerating with every product added.

    This number is a wait, not a speed, and that is the thing to hold on to.
    The loop itself is seamless and has been measured as such repeatedly: on
    a 390px phone, 95 seconds of untouched autoplay never leaves more than
    12px of the strip uncovered, which is the gap between two cards. What a
    visitor actually complains about is how long a particular product takes
    to come back, and that is the cycle: thirteen cards at 3.5s each ran for
    45.5s, of which any one card spent about 30s off screen on a phone. Read
    as a blank section, which is what it was reported as, twice.

    So: 2.5s, a 32.5s cycle, a product back in roughly 21s. Going slower
    lengthens that wait in direct proportion, because the strip has a fixed
    width and the period is width over speed. The only way to shorten the
    wait without moving faster is to put fewer or narrower cards in
    MORE_PRODUCTS; there is no third lever.

    The loop takes its speed from this and the measured copy width, so the
    number still means seconds per card at every breakpoint — the same
    arithmetic the CSS animation used to do.
  */
  const cycleSeconds = Math.max(20, products.length * 2.5);

  /* The real list is the middle copy, so the strip rests on the cards that
     carry the markup rather than on a decorative one. A tab into the strip
     then lands on the cards the visitor is already looking at. */
  return (
    <CarouselAutoplay cycleSeconds={cycleSeconds}>
      <div className="marquee__track">
        <div className="marquee__group" aria-hidden="true">
          {products.map((product) => (
            <Card key={`${product.id}-before`} product={product} duplicate />
          ))}
        </div>

        <div
          className="marquee__group"
          role="list"
          aria-labelledby={labelledBy}
          aria-label={labelledBy ? undefined : "Browse the collection"}
        >
          {products.map((product) => (
            <Card key={product.id} product={product} duplicate={false} />
          ))}
        </div>

        <div className="marquee__group" aria-hidden="true">
          {products.map((product) => (
            <Card key={`${product.id}-after`} product={product} duplicate />
          ))}
        </div>
      </div>
    </CarouselAutoplay>
  );
}
