"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { ProductImage } from "@/lib/catalog";

/**
 * Cap on slides per card.
 *
 * The Storefront query pulls `images(first: 30)`. Putting thirty slides in a
 * grid card would ship thirty <img> tags per product and, with fifteen
 * products, a few hundred image requests on a page nobody asked to browse
 * that deeply. Six is enough to signal "there is more here" and to let a
 * shopper form an impression; the product page carries the full set.
 */
const MAX_SLIDES = 6;

/**
 * Swipeable image strip inside a product card.
 *
 * Scrolling is native: a scroll-snapping overflow container, so a touch drag
 * is handled by the compositor rather than by JavaScript. That matters on the
 * phones this storefront is actually browsed on — a JS-driven drag on a grid
 * of fifteen cards is exactly the kind of thing that janks.
 *
 * EACH SLIDE IS ITS OWN LINK, rather than the strip sitting inside one. A
 * single anchor wrapped around a scroller is the obvious construction and it
 * is the wrong one: an overlay link intercepts the gesture, and a <button>
 * for the dots nested inside an <a> is invalid HTML. Per-slide links keep the
 * markup valid, keep the whole image tappable, and cost nothing — the browser
 * does not fire a click when a drag scrolled the container, so a swipe never
 * navigates by accident.
 *
 * Only the first slide is reachable by keyboard or announced; the rest carry
 * `aria-hidden` and are out of the tab order. Fifteen cards × six identical
 * "Butter Squishy" links would otherwise mean ninety tab stops to cross one
 * section.
 *
 * This is the only client component in the grid. The cards themselves render
 * on the server, so switching the strip to a swipeable one did not move the
 * catalogue into the client bundle.
 */
export default function ProductCardGallery({
  images,
  href,
  title,
  sizes,
}: {
  images: ProductImage[];
  href: string;
  title: string;
  sizes: string;
}) {
  const slides = images.slice(0, MAX_SLIDES);
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  /*
    Which slide is in view, derived from scroll position rather than tracked
    through gesture state. React bails out of a re-render when the value is
    unchanged, so firing this on every scroll frame costs one division and
    nothing else for the frames where the index has not moved.
  */
  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w === 0) return; // hidden or not laid out yet
    const i = Math.round(el.scrollLeft / w);
    setActive(Math.min(Math.max(i, 0), slides.length - 1));
  }, [slides.length]);

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  if (slides.length === 0) {
    /* No photography yet. A plain link keeps the card clickable and the grid
       aligned instead of collapsing one cell to the height of its text. */
    return <Link href={href} className="gcard__media gcard__media--empty" aria-label={title} />;
  }

  return (
    <div className="gcard__media">
      <div className="gcard__track" ref={trackRef} onScroll={onScroll}>
        {slides.map((img, i) => (
          <Link
            key={img.url}
            href={href}
            className="gcard__slide"
            aria-hidden={i > 0 ? true : undefined}
            tabIndex={i > 0 ? -1 : undefined}
          >
            <Image
              className="gcard__img"
              src={img.url}
              /* The first slide names the product; the rest are the same
                 product from another angle and are decorative to a screen
                 reader that has already heard the name. */
              alt={i === 0 ? img.altText || title : ""}
              fill
              sizes={sizes}
            />
          </Link>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="gcard__dots">
          {slides.map((img, i) => (
            <button
              key={img.url}
              type="button"
              className={"gcard__dot" + (i === active ? " gcard__dot--on" : "")}
              aria-label={`Show image ${i + 1} of ${slides.length} of ${title}`}
              aria-current={i === active ? "true" : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
