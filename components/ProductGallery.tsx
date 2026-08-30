"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cdnImage, cdnSrcSet, type ProductImage } from "@/lib/catalog";

/**
 * `hero` is the buy-box gallery: one dominant image with thumbnails under it,
 * which is what a shopper deciding on a purchase needs. `showcase` is the
 * browse-y multi-image carousel used further down the page. Both are the same
 * snap-scrolling track — only how many slides are visible at once differs.
 */
export default function ProductGallery({
  images,
  title,
  layout = "showcase",
}: {
  images: ProductImage[];
  title: string;
  layout?: "hero" | "showcase";
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  // Track which slide is centred, so dots and thumbnails follow a swipe.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Measure a real slide rather than assuming a width — the slide basis
        // differs between the hero and showcase layouts and across breakpoints.
        const first = track.children[0] as HTMLElement | undefined;
        if (!first) return;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        const step = first.offsetWidth + gap;
        if (step <= 0) return;
        setIndex(
          Math.min(images.length - 1, Math.round(track.scrollLeft / step))
        );
      });
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [images.length]);

  const goTo = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[i] as HTMLElement | undefined;
    slide?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
    setIndex(i);
  }, []);

  if (images.length === 0) return null;

  return (
    <div>
      <div
        className={layout === "hero" ? "gal__scroller gal--hero" : "gal__scroller"}
        ref={trackRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${title} images`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") goTo(Math.min(images.length - 1, index + 1));
          if (e.key === "ArrowLeft") goTo(Math.max(0, index - 1));
        }}
      >
        {images.map((img, i) => (
          <div
            className="gal__slide"
            key={img.url}
            aria-roledescription="slide"
            aria-label={`Image ${i + 1} of ${images.length}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cdnImage(img.url, 800)}
              srcSet={`${cdnImage(img.url, 400)} 400w, ${cdnImage(img.url, 600)} 600w, ${cdnImage(img.url, 800)} 800w`}
              alt={img.altText ?? `${title} — view ${i + 1}`}
              width={img.width}
              height={img.height}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              decoding="async"
              sizes="(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 82vw"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          {/* Dots read better under a multi-slide carousel; thumbnails under a
              single dominant image. Showing both at once is just noise. */}
          {layout === "showcase" && (
            <div className="gal__dots" role="tablist" aria-label="Choose image">
              {images.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  className="gal__dot"
                  aria-current={i === index}
                  aria-label={`Go to image ${i + 1}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          )}

          <div className="pgal__thumbs" hidden={layout !== "hero"}>
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                className="pgal__thumb"
                aria-current={i === index}
                aria-label={`Show image ${i + 1}`}
                onClick={() => goTo(i)}
              >
                {/*
                  Thumbnails sit inside the first viewport on the product page,
                  so lazy-loading them just leaves visible empty squares during
                  the initial paint.
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cdnImage(img.url, 66)}
                  srcSet={cdnSrcSet(img.url, 66)}
                  alt=""
                  width={66}
                  height={66}
                  loading="eager"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
