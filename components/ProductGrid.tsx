import Link from "next/link";

import ProductCardGallery from "@/components/ProductCardGallery";
import { isSoldOut, productLowStock } from "@/lib/catalog";
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
 * A card shows one price for a product that may have eighteen variants, so it
 * shows the lowest sellable one and labels it "from" when there is more than
 * one. The card links to the product page rather than adding to cart, so the
 * shopper picks the variant there — the number here is a floor, and it says so
 * rather than quietly being the price of something else.
 */
function cheapestSellable(product: Product): Variant | null {
  const sellable = product.variants.filter((v) => !isSoldOut(v));
  if (sellable.length === 0) return null;
  return sellable.reduce((lowest, v) =>
    Number(v.price.amount) < Number(lowest.price.amount) ? v : lowest
  );
}

/** A compare-at only counts when it is genuinely above the selling price. */
function wasPrice(variant: Variant): Money | null {
  if (!variant.compareAtPrice) return null;
  return Number(variant.compareAtPrice.amount) > Number(variant.price.amount)
    ? variant.compareAtPrice
    : null;
}

const CARD_SIZES =
  "(min-width: 1100px) 260px, (min-width: 760px) 30vw, (min-width: 520px) 45vw, 46vw";

function Card({ product }: { product: Product }) {
  const variant = cheapestSellable(product);
  const sellableCount = product.variants.filter((v) => !isSoldOut(v)).length;
  const was = variant ? wasPrice(variant) : null;
  const stock = productLowStock(product);
  const href = `/products/${product.handle}`;

  /* featuredImage first, then the rest — without deduping, Shopify's featured
     image is usually also images[0] and the card would open on the same photo
     twice, which reads as a broken swipe. */
  const gallery = product.featuredImage
    ? [
        product.featuredImage,
        ...product.images.filter((i) => i.url !== product.featuredImage!.url),
      ]
    : product.images;

  return (
    <li className="gcard">
      <ProductCardGallery
        images={gallery}
        href={href}
        title={product.title}
        sizes={CARD_SIZES}
      />

      {!variant && <span className="gcard__flag">Sold out</span>}

      <Link className="gcard__body" href={href}>
        <h3 className="gcard__name">{product.title}</h3>

        <p className="gcard__price">
          {variant ? (
            <>
              {sellableCount > 1 && <span className="gcard__from">from </span>}
              <span className="gcard__now">{money(variant.price)}</span>
              {was && <s className="gcard__was">{money(was)}</s>}
            </>
          ) : (
            <span className="gcard__out">Sold out</span>
          )}
        </p>

        {stock && (
          <p
            className={
              "gcard__stock" + (stock.urgent ? " gcard__stock--urgent" : "")
            }
          >
            🔥 Only {stock.remaining} left!
          </p>
        )}
      </Link>
    </li>
  );
}

/**
 * A plain product grid — the layout every shop has.
 *
 * This replaced an auto-scrolling marquee. The marquee looked alive, but a
 * strip that moves on its own is a poor place to compare products: a card the
 * shopper wanted slid away while they were reading it, and on a phone nothing
 * was reachable except by waiting. A grid holds still, shows every product at
 * once, and is what a visitor already knows how to use.
 *
 * Server component. The only client code is the per-card image strip.
 */
export default function ProductGrid({
  products,
  labelledBy,
}: {
  products: Product[];
  /* The id of the visible heading above the grid. A list that already has a
     heading should be named by it rather than by a second, invented label
     only a screen reader ever hears. */
  labelledBy?: string;
}) {
  if (products.length === 0) return null;

  return (
    <ul
      className="gcards reveal"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : "Browse the collection"}
    >
      {products.map((product) => (
        <Card key={product.id} product={product} />
      ))}
    </ul>
  );
}
