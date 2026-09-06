import type { Metadata } from "next";
import Image from "next/image";

import SquishyBuy from "@/components/SquishyBuy";
import { getProduct } from "@/lib/shopify";
import { cdnImage, type Product } from "@/lib/catalog";
import {
  BUNDLES,
  FEATURES,
  PRODUCT,
  REVIEWS,
  REVIEWS_ARE_REAL,
  STEPS,
  bestBundleSaving,
  findVariant,
  ratingSummary,
} from "@/lib/squishy-config";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blind Box Squishy Mystery Box — 100+ Possible Styles",
  description:
    "Every box is a surprise. 100+ possible squishy styles, shapes and textures. Open, squish, collect — you never know which one you'll get.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "What will you get?! Blind Box Squishy Mystery Box",
    description:
      "100+ possible squishy styles. Every box is a surprise. Open, squish, collect.",
    type: "website",
  },
};

/** Decorative confetti. aria-hidden — it carries no meaning. */
function Floaties({ items }: { items: string[] }) {
  // Deterministic placement: a seeded pattern rather than random, so the
  // server and client render identical markup and nothing shifts on hydration.
  const spots = [
    { top: "6%", left: "4%", delay: "0s" },
    { top: "14%", right: "6%", delay: "0.6s" },
    { top: "48%", left: "2%", delay: "1.2s" },
    { top: "62%", right: "4%", delay: "0.3s" },
    { top: "84%", left: "10%", delay: "0.9s" },
    { top: "30%", right: "12%", delay: "1.5s" },
  ];

  return (
    <div className="floaties" aria-hidden="true">
      {items.map((emoji, i) => (
        <span
          key={`${emoji}-${i}`}
          className="floaty"
          style={{ ...spots[i % spots.length], animationDelay: spots[i % spots.length].delay }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

function productJsonLd(product: Product | null) {
  const rating = ratingSummary();
  const variant = product?.variants[0];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: PRODUCT.name,
    description: PRODUCT.tagline,
    ...(product && { image: product.images.map((i) => i.url) }),
    ...(variant && {
      offers: {
        "@type": "Offer",
        priceCurrency: variant.price.currencyCode,
        price: Number(variant.price.amount).toFixed(2),
        availability: variant.availableForSale
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    }),
    // Emitted only when reviews are real. Review markup unsupported by genuine
    // on-page reviews earns a Google manual action.
    ...(rating.show && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.average,
        reviewCount: rating.count,
      },
    }),
  };
}

export default async function LandingPage() {
  // A missing product must not take the page down — it renders in preview mode
  // so the page can be built and reviewed before Shopify is ready.
  let product: Product | null = null;
  try {
    product = await getProduct(PRODUCT.handle);
  } catch {
    product = null;
  }

  // The hero now comes from the brand shots, so every Shopify image is free to
  // feed the variety strip rather than the first being spent on the hero.
  const variety = product?.images.slice(0, 8) ?? [];

  /**
   * The flash-sale flag is only truthful when a discount actually exists.
   * Shopify currently carries a compare-at equal to the selling price, so
   * there is no sale — and a "LIMITED-TIME FLASH SALE" badge over a product
   * that is not discounted is fabricated urgency. Set a genuine compare-at in
   * Shopify and the badge returns on its own.
   */
  const single = findVariant(product, BUNDLES[0]) ?? product?.variants[0] ?? null;
  const hasRealSale = single?.compareAtPrice
    ? Number(single.compareAtPrice.amount) > Number(single.price.amount)
    : false;

  // Falls back to the genuine bundle saving when there is no compare-at.
  const bestSaving = bestBundleSaving(product);

  /*
    The ribbon deliberately avoids "limited-time". Nothing here is time-limited
    — COUNTDOWN.endsAt is null and there is no campaign deadline — so claiming
    urgency would be inventing it. It states the saving, which is true.
  */
  const ribbon = hasRealSale
    ? "🔥 Flash sale"
    : bestSaving > 0
      ? `🔥 Save up to ${bestSaving}%`
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd(product)),
        }}
      />

      {/* ======================================= 1. HERO + OFFER */}
      <section className="hero">
        <Floaties items={["✨", "❓", "⭐", "🎉", "💖", "🫧"]} />

        <div className="wrap">
          <div className="hero__grid">
            {/*
              The brand shot, not the Shopify media — it is the only image that
              shows the box mid-open, which is the entire hook. next/image
              serves AVIF/WebP and a per-breakpoint size; priority because this
              is the LCP element on mobile.
            */}
            <div className="hero__media">
              {ribbon && <span className="saleflag">{ribbon}</span>}
              <Image
                src={PRODUCT.images.hero.src}
                alt={PRODUCT.images.hero.alt}
                width={PRODUCT.images.hero.width}
                height={PRODUCT.images.hero.height}
                priority
                sizes="(min-width: 900px) 46vw, 100vw"
              />
            </div>

            <div className="hero__body">
              <span className="kicker">Blind box mystery</span>

              <h1 className="h1">
                What will you <span className="grad-text">get?!</span> 👀
              </h1>

              <p className="hero__sub">{PRODUCT.tagline}</p>

              <SquishyBuy product={product} />
            </div>
          </div>
        </div>
      </section>

      {/* ============================== 2. THE MYSTERY EXPERIENCE */}
      <section className="section">
        <div className="wrap">
          <h2 className="h2 reveal">
            Open. Squish. <span className="grad-text">Surprise.</span> Repeat.
          </h2>

          <div className="steps">
            {STEPS.map((s) => (
              <div className="step reveal" key={s.n}>
                <div className="step__n">{s.n}</div>
                <div className="step__emoji" aria-hidden="true">
                  {s.emoji}
                </div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>

          {/* The unboxing shot does the persuading; the copy stays out of its
              way. On mobile it stacks under the heading rather than beside it. */}
          <div className="mystery reveal">
            <Floaties items={["✨", "⭐", "🫧", "❓"]} />
            <div className="mystery__grid">
              <div className="mystery__shot">
                <Image
                  src={PRODUCT.images.unboxing.src}
                  alt={PRODUCT.images.unboxing.alt}
                  width={PRODUCT.images.unboxing.width}
                  height={PRODUCT.images.unboxing.height}
                  loading="lazy"
                  sizes="(min-width: 768px) 44vw, 88vw"
                />
              </div>
              <div className="mystery__copy">
                <div className="mystery__cap">Which one will you get?</div>
                <div className="mystery__count">100+ possible styles</div>
                <p className="mystery__sub">
                  Animals, fruit, desserts, glitter-filled galaxy balls. Every
                  box is packed at random — so no two openings are the same.
                </p>
              </div>
            </div>
          </div>

          <div className="showcase reveal">
            <Image
              src={PRODUCT.images.grid.src}
              alt={PRODUCT.images.grid.alt}
              width={PRODUCT.images.grid.width}
              height={PRODUCT.images.grid.height}
              loading="lazy"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
            <Image
              src={PRODUCT.images.spread.src}
              alt={PRODUCT.images.spread.alt}
              width={PRODUCT.images.spread.width}
              height={PRODUCT.images.spread.height}
              loading="lazy"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>

          {/* Shopify's own media, when there is any beyond the first. */}
          {variety.length > 0 && (
            <div className="strip" aria-label="More styles">
              {variety.map((img, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={img.url}
                  src={cdnImage(img.url, 320)}
                  alt={img.altText ?? `Squishy style ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================== 3. SOCIAL PROOF + PRODUCT FEATURES */}
      <section className="section" style={{ background: "var(--bg-2)" }}>
        <div className="wrap">
          <h2 className="h2 reveal">
            Why everyone loves a <span className="grad-text">surprise</span>
          </h2>

          <div className="features">
            {FEATURES.map((f) => (
              <div className="feature reveal" key={f.title}>
                <div className="feature__emoji" aria-hidden="true">
                  {f.emoji}
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>

          {/*
            Renders only what REVIEWS actually holds. With none, the section
            invites the first one rather than faking a wall of them — which
            also reads as a launch, not as a shop nobody has bought from.
          */}
          {REVIEWS_ARE_REAL && REVIEWS.length > 0 ? (
            <div className="reviews">
              {REVIEWS.map((r) => (
                <div className="review reveal" key={r.id}>
                  <span className="stars" aria-label={`${r.rating} out of 5`}>
                    {"★".repeat(r.rating)}
                  </span>
                  <p>{r.body}</p>
                  <div className="review__who">{r.author}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="firstreview reveal">
              <div className="firstreview__emoji" aria-hidden="true">
                🫶
              </div>
              <h3>Be one of the first</h3>
              <p>
                We just launched. Order a box, open it, and tell us what you
                got — your experience could inspire someone else&rsquo;s.
              </p>
              <p className="firstreview__note">
                Every review we publish is written by a real customer.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ================================= 4. FINAL IMPULSE CTA */}
      <section className="final">
        <Floaties items={["✨", "❓", "⭐", "🎉", "💖", "🫧"]} />
        <div className="wrap" style={{ position: "relative" }}>
          <h2 className="h2">Ready to find out what&rsquo;s inside?</h2>
          <p className="final__sub">Your next squishy is waiting. 👀</p>

          <FinalOffer product={product} />

          <p className="final__foot">
            Open the box. Discover the surprise. Start collecting.
          </p>
        </div>
      </section>

      <p className="legal">
        Contents are randomly selected — designs, colours and textures vary, and
        the squishy shown may not be the one you receive. Not suitable for
        children under 3.
      </p>

      <div className="buybar-pad" aria-hidden="true" />
    </>
  );
}

/**
 * Repeats the live offer at the close.
 *
 * Resolves variants through the same helper the buy box uses. It previously
 * matched hardcoded titles, which silently missed the real variant and fell
 * back to the preview numbers — advertising "$18, 50% off" at the bottom of a
 * page whose checkout charges $4.45. Preview values are now used only when
 * there is no product at all, and the bundle block is omitted entirely unless
 * a variant exists to sell it.
 */
function FinalOffer({ product }: { product: Product | null }) {
  const single = findVariant(product, BUNDLES[0]);
  const quad = findVariant(product, BUNDLES[2]);

  const fmt = (n: number, c: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: c,
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n);

  const currency = single?.price.currencyCode ?? PRODUCT.fallback.currency;
  const now = single ? Number(single.price.amount) : PRODUCT.fallback.salePrice;

  // A compare-at only counts when it is genuinely above the selling price.
  const compareAt = single?.compareAtPrice
    ? Number(single.compareAtPrice.amount)
    : product
      ? 0
      : PRODUCT.fallback.originalPrice;

  const off = compareAt > now ? Math.round(((compareAt - now) / compareAt) * 100) : 0;
  const saving = bestBundleSaving(product);

  return (
    <div className="final__card">
      {off > 0 ? (
        <span className="flash">🔥 {off}% off flash sale</span>
      ) : saving > 0 ? (
        <span className="flash">🔥 Up to {saving}% off</span>
      ) : null}

      <div className="final__prices" style={{ marginTop: 12 }}>
        {off > 0 && <s>{fmt(compareAt, currency)}</s>}
        <b>{fmt(now, currency)}</b>
      </div>

      {/*
        Wording comes from the bundle config rather than being written twice.
        It previously read "buy 3 get 1 free" here while the offer had changed
        to buy 2 get 2 free, so the close contradicted the buy box.
      */}
      {quad && (
        <div className="final__best">
          🔥 Best value — {BUNDLES[2].heading}
          <br />
          {BUNDLES[2].boxes} boxes for {fmt(Number(quad.price.amount), currency)}
        </div>
      )}

      <a href="#offer" className="btn btn--light" style={{ marginTop: 16 }}>
        Get my surprise box →
      </a>
    </div>
  );
}
