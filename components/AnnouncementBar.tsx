"use client";

import { useEffect, useState } from "react";

/**
 * Sale strip with an optional countdown.
 *
 * The deadline is a single fixed timestamp in lib/offer-config.ts, so every
 * visitor sees the same clock counting to the same moment. It is deliberately
 * NOT "seven hours from whenever you arrived" — a per-visitor timer that
 * restarts on each session never actually expires, which makes the urgency
 * fabricated and is a deceptive practice under FTC Act Section 5.
 *
 * When the deadline passes the countdown disappears rather than resetting.
 * That is the point: at that moment the offer has genuinely ended, and the
 * compare-at price should be restored in Shopify so the discount comes off
 * the page too.
 */
export default function AnnouncementBar({
  text,
  endsAt,
}: {
  text: string;
  endsAt: string | null;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) return;

    const end = new Date(endsAt).getTime();
    if (Number.isNaN(end)) return;

    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  // Until mounted, remaining is null and the bar renders the plain text, so
  // the server and client markup agree on first paint.
  const showClock = remaining !== null && remaining > 0;

  let clock = "";
  if (showClock) {
    const s = Math.floor(remaining / 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    clock = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  }

  return (
    <div className="announce">
      {showClock ? (
        <>
          Limited offer ends in{" "}
          <span className="announce__clock" role="timer">
            {clock}
          </span>
        </>
      ) : (
        text
      )}
    </div>
  );
}
