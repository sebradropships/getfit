"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export type HeroSlide = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/**
 * Looping cross-fade for the hero shot.
 *
 * Two things this deliberately does NOT do.
 *
 * It does not render every slide on the server. The first image is the LCP
 * element on mobile, and mounting three of them into the SSR HTML would have
 * the browser fetching all three before first paint. Slides 2..n appear only
 * after hydration, so the served markup is the single priority image it was
 * before the carousel existed.
 *
 * It does not animate when the visitor has asked it not to. With
 * prefers-reduced-motion the timer never starts and the first slide simply
 * stays, which is also what anyone sees before JavaScript arrives.
 */
export default function HeroCarousel({
  slides,
  intervalMs = 3000,
}: {
  slides: readonly HeroSlide[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || paused || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      intervalMs
    );
    return () => window.clearInterval(id);
  }, [mounted, paused, slides.length, intervalMs]);

  if (slides.length === 0) return null;

  // Pre-hydration the first slide is the whole carousel — see the note above.
  const rendered = mounted ? slides : slides.slice(0, 1);

  return (
    <>
      {rendered.map((slide, i) => (
        <Image
          key={slide.src}
          className={"herocar__img" + (i === index ? " is-on" : "")}
          src={slide.src}
          alt={slide.alt}
          width={slide.width}
          height={slide.height}
          sizes="(min-width: 900px) 46vw, 100vw"
          priority={i === 0}
          aria-hidden={i !== index}
        />
      ))}

      {mounted && slides.length > 1 && (
        <div
          className="herocar__dots"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              className={"herocar__dot" + (i === index ? " is-on" : "")}
              aria-label={`Show image ${i + 1} of ${slides.length}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
            />
          ))}
        </div>
      )}
    </>
  );
}
