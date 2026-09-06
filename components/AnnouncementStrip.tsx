import { ANNOUNCEMENT, COUNTDOWN } from "@/lib/squishy-config";
import TickerCountdown from "./TickerCountdown";

/**
 * Scrolling strip above the header.
 *
 * The marquee is a server component with a pure-CSS animation — no JavaScript,
 * nothing to hydrate. The message list renders twice so translating the track
 * by -50% lands exactly where it started, which is what makes the loop
 * seamless rather than snapping. The duplicate is aria-hidden so screen
 * readers hear each message once, and reduced-motion stops the animation in
 * globals.css while leaving the text readable.
 *
 * When a real deadline is configured the strip carries the countdown instead,
 * falling back to the marquee once it expires.
 */
function Marquee() {
  const items = ANNOUNCEMENT.messages;

  return (
    <div className="ticker__track">
      <ul className="ticker__list">
        {items.map((m) => (
          <li className="ticker__item" key={m}>
            {m}
          </li>
        ))}
      </ul>
      <ul className="ticker__list" aria-hidden="true">
        {items.map((m) => (
          <li className="ticker__item" key={`dup-${m}`}>
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AnnouncementStrip() {
  if (!ANNOUNCEMENT.enabled || ANNOUNCEMENT.messages.length === 0) return null;

  return (
    <div className="ticker" role="complementary" aria-label="Store highlights">
      {COUNTDOWN.endsAt ? (
        <TickerCountdown endsAt={COUNTDOWN.endsAt} label={COUNTDOWN.label}>
          <Marquee />
        </TickerCountdown>
      ) : (
        <Marquee />
      )}
    </div>
  );
}
