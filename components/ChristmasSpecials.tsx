"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { isSoldOut } from "@/lib/catalog";
import type { Money, Product, Variant } from "@/lib/catalog";

/** How long each product holds the rail. */
const ROTATE_MS = 5000;

/**
 * The snow, as explicit values rather than a formula or Math.random().
 *
 * Random would desynchronise server and client markup and throw a hydration
 * mismatch; a formula (left = i * 16%) produces the evenly-spaced, identically
 * sized row that the first version had and that reads as a pattern rather than
 * as weather. These are hand-scattered: overlapping columns, sizes from 9px to
 * 26px, speeds from 8s to 16s, and negative delays so the sky is already full
 * on first paint instead of filling from the top.
 *
 * l = left %, s = size px, d = fall duration s, t = delay s (negative),
 * o = peak opacity, x = horizontal drift px.
 */
const FLAKES = [
  { c: "❄", l: 3, s: 20, d: 13, t: -1.2, o: 0.55, x: 24 },
  { c: "✦", l: 9, s: 11, d: 9, t: -5.4, o: 0.4, x: -14 },
  { c: "❅", l: 15, s: 26, d: 16, t: -8.1, o: 0.32, x: 30 },
  { c: "•", l: 21, s: 9, d: 10, t: -2.7, o: 0.6, x: -8 },
  { c: "❆", l: 27, s: 14, d: 8, t: -6.9, o: 0.5, x: 18 },
  { c: "✧", l: 33, s: 17, d: 14, t: -3.3, o: 0.45, x: -22 },
  { c: "❅", l: 38, s: 12, d: 11, t: -9.5, o: 0.6, x: 10 },
  { c: "❄", l: 44, s: 23, d: 15, t: -0.6, o: 0.3, x: -26 },
  { c: "✦", l: 50, s: 10, d: 9, t: -4.8, o: 0.65, x: 16 },
  { c: "❆", l: 56, s: 18, d: 12, t: -7.2, o: 0.4, x: -12 },
  { c: "•", l: 61, s: 9, d: 10, t: -1.9, o: 0.55, x: 22 },
  { c: "❄", l: 67, s: 25, d: 16, t: -10.4, o: 0.3, x: -18 },
  { c: "✧", l: 73, s: 15, d: 11, t: -5.9, o: 0.5, x: 8 },
  { c: "❅", l: 79, s: 11, d: 8, t: -3.6, o: 0.62, x: -20 },
  { c: "❄", l: 84, s: 21, d: 14, t: -8.7, o: 0.36, x: 26 },
  { c: "✦", l: 89, s: 13, d: 10, t: -2.1, o: 0.55, x: -10 },
  { c: "❆", l: 94, s: 17, d: 13, t: -6.3, o: 0.42, x: 14 },
  { c: "✧", l: 97, s: 10, d: 9, t: -9.9, o: 0.6, x: -16 },
] as const;

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
        {FLAKES.map((f, i) => (
          <span
            key={i}
            className="xmas__flake"
            style={
              {
                "--l": f.l,
                "--s": f.s,
                "--d": f.d,
                "--t": f.t,
                "--o": f.o,
                "--x": f.x,
              } as React.CSSProperties
            }
          >
            {f.c}
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
                      /*
                        Eager on purpose. Mounting the slides was not enough on
                        its own: next/image defaults to loading="lazy", and the
                        browser deprioritises nine stacked lazy images so hard
                        that only five had finished after eight seconds while
                        four had not requested a byte (currentSrc null). The
                        rotation then outran the downloads and the card blanked
                        anyway. These are above the fold and the rail is
                        useless without them, so none is a candidate for
                        deferral. The first also takes priority, which preloads
                        it for LCP.
                      */
                      loading={i === 0 ? undefined : "eager"}
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
