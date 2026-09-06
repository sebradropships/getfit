import { ANNOUNCEMENT } from "@/lib/squishy-config";

/**
 * Scrolling strip above the header.
 *
 * A server component with a pure-CSS marquee — no JavaScript, no hydration,
 * nothing to hydrate before it animates. The message list is rendered twice so
 * translating the track by -50% lands exactly where it started, which is what
 * makes the loop seamless rather than snapping.
 *
 * The duplicate is aria-hidden so screen readers hear each message once.
 * Reduced-motion stops the animation in globals.css; the messages stay put and
 * remain readable.
 */
export default function AnnouncementStrip() {
  if (!ANNOUNCEMENT.enabled || ANNOUNCEMENT.messages.length === 0) return null;

  const items = ANNOUNCEMENT.messages;

  return (
    <div className="ticker" role="complementary" aria-label="Store highlights">
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
    </div>
  );
}
