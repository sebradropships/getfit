"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ambient product loop.
 *
 * Muted, looping and inline — the pattern for a silent lifestyle clip rather
 * than a video the shopper is meant to sit and watch.
 *
 * Playback starts from an effect instead of the `autoPlay` attribute for two
 * reasons: it lets us honour prefers-reduced-motion, which no HTML attribute
 * can express, and a muted video is allowed to start programmatically so
 * nothing is lost by doing it this way.
 *
 * The pause control is not decoration. WCAG 2.2.2 requires any motion that
 * runs longer than five seconds to have a pause mechanism, and this loops
 * indefinitely.
 */
export default function LifestyleVideo({
  src,
  poster,
  label,
}: {
  src: string;
  poster: string;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) return; // Leave it on the poster frame.

    // A rejected play() is not an error worth surfacing — some browsers block
    // it regardless of muting, and the poster is a perfectly good fallback.
    video
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, []);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="vid">
      <video
        ref={ref}
        className="vid__el"
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        // Decorative: the surrounding copy already carries the message, so it
        // is hidden from screen readers rather than announced as an unlabelled
        // media element.
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={src} type="video/mp4" />
      </video>

      <button
        type="button"
        className="vid__toggle"
        onClick={toggle}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5l11 7-11 7z" fill="currentColor" />
          </svg>
        )}
      </button>
    </div>
  );
}
