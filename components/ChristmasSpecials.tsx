"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { isSoldOut } from "@/lib/catalog";
import type { Money, Product, Variant } from "@/lib/catalog";

/** How long each product holds the rail. */
const ROTATE_MS = 5000;

function money(m: Money): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: m.currencyCode,
    minimumFractionDigits: 2,
  }).format(Number(m.amount));
}

/**
 * The variant the rail quotes: the cheapest a shopper can actually buy.
 *
 * Falls back to the cheapest variant overall when every one is sold out, so a
 * sold-out product still shows a price and reads as a product rather than as a
 * broken card. The sold-out state is labelled separately.
 */
function pickVariant(product: Product): Variant | null {
  const sellable = product.variants.filter((v) => !isSoldOut(v));
  const pool = sellable.length > 0 ? sellable : product.variants;
  if (pool.length === 0) return null;
  return pool.reduce((lowest, v) =>
    Number(v.price.amount) < Number(lowest.price.amount) ? v : lowest
  );
}

/**
 * Discount percentage, or 0 when there is no genuine one.
 *
 * Guarded rather than assumed. Shopify carries compare-at as "0.00" on a
 * product that has never had one set, and several products in this catalogue
 * arrived that way — rendering that as a strikethrough would advertise a
 * saving of minus infinity. A compare-at only counts when it is strictly above
 * the selling price.
 */
function percentOff(variant: Variant): number {
  if (!variant.compareAtPrice) return 0;
  const was = Number(variant.compareAtPrice.amount);
  const now = Number(variant.price.amount);
  if (!Number.isFinite(was) || !Number.isFinite(now)) return 0;
  if (was <= now) return 0;
  return Math.round(((was - now) / was) * 100);
}

/**
 * The seasonal rail at the top of the page.
 *
 * One product at a time, advancing every five seconds. A rail rather than a
 * grid because this sits where the hero used to: it is the first thing seen,
 * so it gets the whole width and one clear subject instead of nine competing
 * thumbnails.
 *
 * The timer is paused while a pointer is over the rail or focus is inside it.
 * Without that, a shopper reading the third card loses it mid-sentence, which
 * is the single most irritating thing an auto-advancing component does — and
 * was the reason the product marquee below this was replaced with a grid.
 *
 * Honours prefers-reduced-motion by not advancing at all: the dots stay, so
 * the rail is still fully navigable by hand.
 */
export default function ChristmasSpecials({
  products,
}: {
  products: Product[];
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = products.length;

  /* Read once on mount rather than at module scope: matchMedia does not exist
     on the server, and the value must not be baked into the bundle. */
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  }, []);

  useEffect(() => {
    if (count <= 1 || paused || reduced.current) return;
    const t = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      ROTATE_MS
    );
    return () => window.clearInterval(t);
  }, [count, paused]);

  if (count === 0) return null;

  const product = products[Math.min(index, count - 1)];
  const variant = pickVariant(product);
  const off = variant ? percentOff(variant) : 0;
  const soldOut = product.variants.every((v) => isSoldOut(v));

  return (
    <section
      className="xmas"
      aria-label="Christmas Specials"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Decorative only — the heading already says Christmas. */}
      <div className="xmas__snow" aria-hidden="true">
        {["❄", "✦", "❅", "✧", "❄", "✦"].map((s, i) => (
          <span key={i} className="xmas__flake" style={{ "--i": i } as React.CSSProperties}>
            {s}
          </span>
        ))}
      </div>

      <div className="wrap">
        <p className="xmas__kicker">
          <span aria-hidden="true">🎄</span> Limited holiday drop{" "}
          <span aria-hidden="true">🎁</span>
        </p>

        <h2 className="xmas__head">
          <span className="xmas__head-glow">Christmas Specials</span>
        </h2>

        {/*
          key={product.id} remounts the card on every change, which replays the
          entry animation. aria-live is polite and the region is labelled, so a
          screen reader hears the new product rather than silently losing the
          old one.
        */}
        <div className="xmas__stage" aria-live="polite">
          <article className="xmas__card">
            {/*
              EVERY slide is rendered and kept mounted; only opacity changes.

              The obvious construction — render just the active product and key
              the card on its id — remounts the <img> on each rotation, so the
              browser re-picks from srcset before layout has settled and grabs
              the largest candidate (observed: w=3840 for a 296px box). It then
              corrects to w=640 a second later, which showed up as a blank
              square for roughly a third of every five-second slot.

              Mounted once, each image loads once and the rotation is a pure
              compositor opacity swap with nothing to fetch. Nine small webps
              is a trivial cost next to the grid below, which carries 86.
            */}
            <div className="xmas__shot">
              {products.map((p, i) => {
                const img = p.featuredImage ?? p.images[0] ?? null;
                if (!img) return null;
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.handle}`}
                    className={"xmas__slide" + (i === index ? " is-on" : "")}
                    aria-hidden={i !== index ? true : undefined}
                    tabIndex={i !== index ? -1 : undefined}
                  >
                    <Image
                      className="xmas__img"
                      src={img.url}
                      alt={i === index ? img.altText || p.title : ""}
                      fill
                      sizes="(min-width: 760px) 300px, 88vw"
                      priority={i === 0}
                    />
                  </Link>
                );
              })}
              {off > 0 && <span className="xmas__off">−{off}%</span>}
              {soldOut && <span className="xmas__sold">Sold out</span>}
            </div>

            {/* Keyed here rather than on the card: the copy has nothing to
                fetch, so remounting it to replay the entry animation is free,
                while remounting the images is what caused the blank. */}
            <div className="xmas__body" key={product.id}>
              <h3 className="xmas__name">
                <Link href={`/products/${product.handle}`}>{product.title}</Link>
              </h3>

              {variant && (
                <p className="xmas__prices">
                  {off > 0 && (
                    <s className="xmas__was">{money(variant.compareAtPrice!)}</s>
                  )}
                  <b className="xmas__now">{money(variant.price)}</b>
                  {off > 0 && (
                    <span className="xmas__save">Save {off}%</span>
                  )}
                </p>
              )}

              <Link
                className="btn btn--jelly xmas__cta"
                href={`/products/${product.handle}`}
              >
                Shop this gift →
              </Link>
            </div>
          </article>
        </div>

        <div className="xmas__dots">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={"xmas__dot" + (i === index ? " xmas__dot--on" : "")}
              aria-label={`Show ${p.title}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
