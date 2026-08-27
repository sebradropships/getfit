"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { startCheckout } from "@/app/actions";
import {
  discount,
  formatMoney,
  type Product,
  type Variant,
} from "@/lib/catalog";

export type Benefit = { icon: string; title: string; text: string };
export type Trust = { icon: string; label: string };

export type FlashOfferProps = {
  product: Product;
  /** ISO 8601. Must be a real deadline you intend to honour. */
  saleEndsAt: string;
  stockPercent: number;
  benefits: Benefit[];
  trust: Trust[];
  /** Only set this once you have real review data. */
  reviewSummary?: string;
  disclaimer: string;
};

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const els = Array.from(root.querySelectorAll<HTMLElement>(".fo-reveal"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return ref;
}

function Countdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(endsAt).getTime();
    if (Number.isNaN(end)) return;

    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  // Render nothing until mounted so server and client markup agree.
  if (remaining === null) return null;

  if (remaining === 0) {
    return (
      <div className="fo__timer fo-reveal is-in">
        <div className="fo__timer-ended">
          This sale has ended — current price shown above.
        </div>
      </div>
    );
  }

  const s = Math.floor(remaining / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const units: Array<[string, string]> = [
    [pad(Math.floor(s / 86400)), "Days"],
    [pad(Math.floor((s % 86400) / 3600)), "Hrs"],
    [pad(Math.floor((s % 3600) / 60)), "Min"],
    [pad(s % 60), "Sec"],
  ];

  return (
    <div className="fo__timer fo-reveal">
      <div className="fo__timer-label">Sale ends in</div>
      <div className="fo__clock" role="timer">
        {units.map(([value, label]) => (
          <div className="fo__unit" key={label}>
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StockBar({ percent }: { percent: number }) {
  const [width, setWidth] = useState(0);
  const safe = Math.max(0, Math.min(100, percent));

  useEffect(() => {
    const id = setTimeout(() => setWidth(safe), 250);
    return () => clearTimeout(id);
  }, [safe]);

  return (
    <div className="fo__stock fo-reveal">
      <div className="fo__stock-row">
        <span className="fo__stock-hi">Selling fast</span>
        <span>{safe}% claimed</span>
      </div>
      <div className="fo__stock-track">
        <div className="fo__stock-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function FlashOffer({
  product,
  saleEndsAt,
  stockPercent,
  benefits,
  trust,
  reviewSummary,
  disclaimer,
}: FlashOfferProps) {
  const rootRef = useReveal();
  const ctaRef = useRef<HTMLButtonElement>(null);

  const [variant, setVariant] = useState<Variant>(
    product.variants.find((v) => v.availableForSale) ?? product.variants[0]
  );
  const [showSticky, setShowSticky] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { hasDiscount, percent, savedLabel } = discount(variant);
  const image = product.featuredImage;

  useEffect(() => {
    const onScroll = () => {
      const cta = ctaRef.current;
      if (!cta) return;
      const pastHero = cta.getBoundingClientRect().bottom < 0;
      const nearFooter =
        window.innerHeight + window.scrollY >
        document.body.scrollHeight - 120;
      setShowSticky(pastHero && !nearFooter);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const buy = () => {
    setError(null);
    startTransition(async () => {
      const result = await startCheckout(variant.id, 1);
      if (result.ok) {
        window.location.href = result.url;
      } else {
        setError(result.error);
      }
    });
  };

  const soldOut = !variant.availableForSale;
  const ctaLabel = soldOut
    ? "Sold out"
    : pending
      ? "Starting checkout…"
      : hasDiscount
        ? `Claim ${percent}% Off — Add to Cart`
        : "Add to Cart";

  return (
    <div className="fo" ref={rootRef}>
      <div className="fo__glowfield" aria-hidden="true" />
      <div className="fo__wrap">
        <div className="fo__strip fo-reveal">
          <span className="fo__strip-dot" aria-hidden="true" />
          <span>
            {hasDiscount
              ? `Limited-time offer — save ${savedLabel} while stock lasts`
              : "Limited-time offer — while stock lasts"}
          </span>
        </div>

        <div className="fo__grid">
          <div className="fo__media fo-reveal">
            {hasDiscount && (
              <div className="fo__badge" aria-hidden="true">
                <div>
                  {percent}%<small>OFF</small>
                </div>
              </div>
            )}
            <div className="fo__media-inner">
              {image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={image.url}
                  alt={image.altText ?? product.title}
                  width={image.width}
                  height={image.height}
                  fetchPriority="high"
                />
              )}
            </div>
          </div>

          <div className="fo__offer">
            <span className="fo__eyebrow fo-reveal">
              Magnetite + Hematite · Everyday Stone Jewelry
            </span>

            <h1 className="fo__title fo-reveal">
              Wear Something You Actually Love
              {hasDiscount && (
                <>
                  {" — "}
                  <em>{percent}% Off Today</em>
                </>
              )}
            </h1>

            <p className="fo__sub fo-reveal">
              Genuine magnetite and hematite in a matte-black stretch design
              that slips on in a second and stays comfortable all day. Real
              stone weight, a carved pentagram focal bead, and no clasp to
              fumble with.
            </p>

            {reviewSummary && (
              <div className="fo__stars fo-reveal">
                <span className="fo__stars-icons" aria-hidden="true">
                  ★★★★★
                </span>
                <span>{reviewSummary}</span>
              </div>
            )}

            <div className="fo__price fo-reveal">
              <span className="fo__price-now">
                {formatMoney(variant.price)}
              </span>
              {hasDiscount && variant.compareAtPrice && (
                <>
                  <span className="fo__price-was">
                    {formatMoney(variant.compareAtPrice)}
                  </span>
                  <span className="fo__price-tag">
                    Save {savedLabel} · {percent}% off
                  </span>
                </>
              )}
            </div>

            <p className="fo__price-note fo-reveal">
              Compare-at price is our regular selling price. All prices in{" "}
              {variant.price.currencyCode}.
            </p>

            <Countdown endsAt={saleEndsAt} />
            <StockBar percent={stockPercent} />

            {product.variants.length > 1 && (
              <div className="fo__variants fo-reveal">
                <label className="fo__sr" htmlFor="variant">
                  Option
                </label>
                <select
                  id="variant"
                  className="fo__select"
                  value={variant.id}
                  onChange={(e) => {
                    const next = product.variants.find(
                      (v) => v.id === e.target.value
                    );
                    if (next) setVariant(next);
                  }}
                >
                  {product.variants.map((v) => (
                    <option key={v.id} value={v.id} disabled={!v.availableForSale}>
                      {v.title} — {formatMoney(v.price)}
                      {v.availableForSale ? "" : " (Sold out)"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              ref={ctaRef}
              type="button"
              className="fo__cta fo-reveal"
              onClick={buy}
              disabled={soldOut || pending}
            >
              {ctaLabel}
              {!soldOut && !pending && (
                <span className="fo__cta-sub">Ships in 1–2 business days</span>
              )}
            </button>

            {error && (
              <p className="fo__error" role="alert">
                {error}
              </p>
            )}

            <div className="fo__reassure fo-reveal">
              <span>✓ 30-day returns</span>
              <span>✓ Secure checkout</span>
              <span>✓ Tracked shipping</span>
            </div>
          </div>
        </div>

        {benefits.length > 0 && (
          <div className="fo__benefits">
            <h2 className="fo__h2 fo-reveal">Why People Keep Wearing It</h2>
            <p className="fo__h2-sub fo-reveal">
              Honest reasons customers reach for this bracelet every morning.
            </p>
            <div className="fo__cards">
              {benefits.map((b, i) => (
                <div
                  className="fo__card fo-reveal"
                  key={b.title}
                  style={{ transitionDelay: `${i * 90}ms` }}
                >
                  <div className="fo__card-ico" aria-hidden="true">
                    {b.icon}
                  </div>
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {trust.length > 0 && (
          <div className="fo__trust fo-reveal">
            {trust.map((t) => (
              <span className="fo__trust-item" key={t.label}>
                <i aria-hidden="true">{t.icon}</i>
                {t.label}
              </span>
            ))}
          </div>
        )}

        <div
          className="fo__description fo-reveal"
          dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
        />

        <p className="fo__disclaimer">{disclaimer}</p>
      </div>

      <div className="fo-sticky" data-show={showSticky}>
        {image && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            className="fo-sticky__img"
            src={image.url}
            alt=""
            width={46}
            height={46}
          />
        )}
        <div className="fo-sticky__txt">
          <div className="fo-sticky__name">{product.title}</div>
          <div className="fo-sticky__price">
            <b>{formatMoney(variant.price)}</b>
            {hasDiscount && variant.compareAtPrice && (
              <s>{formatMoney(variant.compareAtPrice)}</s>
            )}
          </div>
        </div>
        <button
          type="button"
          className="fo-sticky__btn"
          onClick={buy}
          disabled={soldOut || pending}
        >
          {soldOut ? "Sold out" : pending ? "…" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
