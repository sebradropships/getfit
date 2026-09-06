"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown for the strip above the header.
 *
 * Renders `children` — the marquee — in two cases: before mount, so the server
 * and client agree on first paint, and after the deadline passes. The second
 * is the important one: when the offer is over the strip goes back to stating
 * facts rather than restarting the clock. A timer that resets never expires,
 * and an offer that never ends is not an offer.
 */
export default function TickerCountdown({
  endsAt,
  label,
  children,
}: {
  endsAt: string;
  label: string;
  children: React.ReactNode;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(endsAt).getTime();
    if (Number.isNaN(end)) return;

    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (remaining === null || remaining === 0) return <>{children}</>;

  const s = Math.floor(remaining / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const hh = pad(Math.floor(s / 3600));
  const mm = pad(Math.floor((s % 3600) / 60));
  const ss = pad(s % 60);

  return (
    <div className="ticker__live">
      <span className="ticker__flame" aria-hidden="true">
        🔥
      </span>
      <span className="ticker__label">{label}</span>
      <span className="ticker__clock" role="timer">
        {hh}:{mm}:{ss}
      </span>
    </div>
  );
}
