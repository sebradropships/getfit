"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { isSoldOut } from "@/lib/catalog";
import type { Money, Product, Variant } from "@/lib/catalog";

/** How long each product holds the rail before it advances itself. */
const ROTATE_MS = 5000;

/** How long auto-rotation stands down after the visitor touches the rail. */
const HOLD_AFTER_TOUCH_MS = 6000;

/**
 * The snow, as explicit values rather than a formula or Math.random().
 *
 * Random would desynchronise server and client markup and throw a hydration
 * mismatch; a formula (left = i * 16%) produces the evenly spaced, identically
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
 * SWIPEABLE AND SELF-ADVANCING, and both work through the same mechanism: the
 * cards sit in a native scroll-snap track, the visitor can drag it, and the
 * timer simply scrolls it. There is no separate "animate" path that a gesture
 * could fight, and the active index is always read back from scrollLeft rather
 * than tracked in parallel — so the dots cannot drift out of step with what is
 * actually on screen.
 *
 * Native scrolling rather than a JS drag means the gesture runs on the
 * compositor with real momentum and rubber-banding, which a pointermove
 * handler cannot reproduce convincingly on a phone.
 *
 * Auto-rotation stands down for six seconds after any touch, and indefinitely
 * while a pointer is over the rail or focus is inside it. Advancing out from
 * under someone who is reading is the single most irritating thing this kind
 * of component does, and it is what got the product marquee below replaced
 * with a static grid.
 *
 * Every card is rendered once and never remounts, so no image is ever
 * refetched on a change — see the eager-loading note on <Image> below for why
 * that alone was not enough.
 */
export default function ChristmasSpecials({
  products,
}: {
  products: Product[];
}) {
  const count = products.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const resumeTimer = useRef<number | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  }, []);

  useEffect(
    () => () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    },
    []
  );

  /** Stand auto-rotation down, then let it resume. */
  const holdAuto = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(
      () => setPaused(false),
      HOLD_AFTER_TOUCH_MS
    );
  }, []);

  const goTo = useCallback((i: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({
      left: i * el.clientWidth,
      behavior: reduced.current ? "auto" : "smooth",
    });
  }, []);

  /*
    Reports position only. It deliberately does NOT pause the rotation.

    It used to, guarded by a flag set during the timer's own scrollTo and
    cleared 700ms later. Smooth scrolling has no completion event, so that
    window was a guess — and it was too short. The rail read its own
    auto-advance as a swipe and stood itself down for six seconds after every
    single one, which measured on the live page as an effective period of
    about eleven seconds instead of five.

    Intent now comes from input events (pointerdown, wheel, keydown), which
    only a person can produce, so there is no race to lose. A scroll event is
    evidence of movement, never of who caused it.
  */
  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex(Math.min(Math.max(i, 0), count - 1));
  }, [count]);

  useEffect(() => {
    if (count <= 1 || paused || reduced.current) return;
    const t = window.setInterval(() => {
      const el = trackRef.current;
      if (!el || el.clientWidth === 0) return;
      /* Advance from where the rail actually is, not from a counter that a
         swipe could have left behind. */
      const here = Math.round(el.scrollLeft / el.clientWidth);
      goTo((here + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [count, paused, goTo]);

  if (count === 0) return null;

  return (
    <section
      className="xmas"
      aria-label="Christmas Specials"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
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

        <div
          className="xmas__track"
          ref={trackRef}
          onScroll={onScroll}
          /* Every way a person can drive this rail by hand. Only these stand
             the rotation down — a scroll event cannot say who caused it. */
          onPointerDown={holdAuto}
          onTouchStart={holdAuto}
          onWheel={holdAuto}
          onKeyDown={holdAuto}
          /* Focusable so the rail can be scrolled with the arrow keys; the
             dots remain the explicit control. */
          tabIndex={0}
          role="group"
          aria-label={`${count} Christmas products, swipe to browse`}
        >
          {products.map((product, i) => {
            const variant = pickVariant(product);
            const off = variant ? percentOff(variant) : 0;
            const soldOut = product.variants.every((v) => isSoldOut(v));
            const image = product.featuredImage ?? product.images[0] ?? null;
            const href = `/products/${product.handle}`;

            return (
              <article className="xmas__card" key={product.id}>
                <div className="xmas__shot">
                  <Link href={href} className="xmas__shotlink">
                    {image && (
                      <Image
                        className="xmas__img"
                        src={image.url}
                        alt={image.altText || product.title}
                        fill
                        sizes="(min-width: 760px) 300px, 88vw"
                        priority={i === 0}
                        /*
                          Eager on purpose. next/image defaults to lazy, and a
                          browser deprioritises a row of off-screen lazy images
                          hard enough that measuring the live page found only
                          five of nine complete after eight seconds, four
                          never having requested a byte. The rotation then
                          reached a card before its bytes did and it rendered
                          blank. The first also takes priority, for LCP.
                        */
                        loading={i === 0 ? undefined : "eager"}
                      />
                    )}
                  </Link>
                  {off > 0 && <span className="xmas__off">−{off}%</span>}
                  {soldOut && <span className="xmas__sold">Sold out</span>}
                </div>

                <div className="xmas__body">
                  <h3 className="xmas__name">
                    <Link href={href}>{product.title}</Link>
                  </h3>

                  {variant && (
                    <p className="xmas__prices">
                      {off > 0 && (
                        <s className="xmas__was">
                          {money(variant.compareAtPrice!)}
                        </s>
                      )}
                      <b className="xmas__now">{money(variant.price)}</b>
                      {off > 0 && (
                        <span className="xmas__save">Save {off}%</span>
                      )}
                    </p>
                  )}

                  <Link className="btn btn--jelly xmas__cta" href={href}>
                    Shop this gift →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="xmas__dots">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={"xmas__dot" + (i === index ? " xmas__dot--on" : "")}
              aria-label={`Show ${p.title}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => {
                holdAuto();
                goTo(i);
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
