"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * useLayoutEffect warns when it runs during SSR, but useEffect fires after
 * paint — which would flash the final number before the count-up starts.
 * Picking per environment keeps the animation clean without the warning.
 */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Decelerating curve, so the number sprints then eases into its final value. */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animated discount sticker: pops, jiggles, and counts up to the real figure.
 *
 * The target is passed in rather than hardcoded — it is the live discount
 * computed from Shopify prices, so if the saving changes or disappears the
 * sticker follows instead of animating to a number that is no longer true.
 *
 * Accessibility: the number changes ~60 times a second, which a screen reader
 * would try to announce. The animating content is hidden from assistive tech
 * and the settled value is exposed once via aria-label.
 */
export default function DiscountSticker({
  percent,
  before,
  after,
  className,
  durationMs = 900,
}: {
  percent: number;
  before: string;
  after: string;
  className: string;
  durationMs?: number;
}) {
  // Starts at the final value so the server and the first client render agree;
  // the layout effect resets it to 0 before the browser paints.
  const [value, setValue] = useState(percent);
  const [animate, setAnimate] = useState(false);
  const frame = useRef(0);

  useIsoLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(percent);
      return;
    }

    setAnimate(true);
    setValue(0);

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(easeOutCubic(t) * percent));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame.current);
  }, [percent, durationMs]);

  return (
    <span
      className={animate ? `${className} sticker-pop` : className}
      aria-label={`${before}${percent}${after}`}
    >
      <span aria-hidden="true">
        {before}
        {value}
        {after}
      </span>
    </span>
  );
}
