import type { Metadata } from "next";
import { notFound } from "next/navigation";

import BuyBox from "@/components/BuyBox";
import ProductGallery from "@/components/ProductGallery";
import Reviews from "@/components/Reviews";
import { getProduct, getProductHandles } from "@/lib/shopify";
import { CENTREPIECE_PHOTO, OFFER, REVIEWS, reviewSummary } from "@/lib/offer-config";
import { cdnImage, discount, formatMoney, type Product } from "@/lib/catalog";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const handles = await getProductHandles();
    return handles.map((handle) => ({ handle }));
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ handle: string }> };

/**
 * Supplier titles are long and comma-stuffed. Split on the em dash so the page
 * shows a clean name with the descriptive half demoted to a subtitle, without
 * hardcoding a title that could drift from Shopify.
 */
function splitTitle(title: string): { name: string; subtitle: string | null } {
  const [name, ...rest] = title.split(/\s*[—–]\s*/);
  return { name: name.trim(), subtitle: rest.join(" — ").trim() || null };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return { title: "Not found" };

  const { name } = splitTitle(product.title);
  const description =
    "A magnetic stone bracelet you wear as a daily reminder to stay focused, motivated and consistent with your goals.";

  return {
    title: name,
    description,
    alternates: { canonical: `/products/${product.handle}` },
    openGraph: {
      title: `${name} | GetFit`,
      description,
      images: product.featuredImage ? [product.featuredImage.url] : [],
      type: "website",
    },
  };
}

/**
 * Product structured data.
 *
 * aggregateRating and review are emitted only when real reviews exist. Google
 * issues manual actions for review markup that is not backed by reviews shown
 * on the page, so this mirrors the Reviews component exactly.
 */
function productJsonLd(product: Product, url: string) {
  const variant = product.variants[0];
  const { hasReviews, average, count } = reviewSummary(REVIEWS);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: splitTitle(product.title).name,
    description: product.description.replace(/\s+/g, " ").trim(),
    image: product.images.map((i) => i.url),
    brand: { "@type": "Brand", name: "GetFit" },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: variant.price.currencyCode,
      price: Number(variant.price.amount).toFixed(2),
      availability: variant.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(hasReviews && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: average,
        reviewCount: count,
      },
    }),
  };
}

/**
 * Benefit cards.
 *
 * Each one is either a fact about how the bracelet is built, or something the
 * WEARER does. None of them assert an effect the object has on the body —
 * that line is what separates a motivational accessory from an unsubstantiated
 * health claim, and magnetic bracelets have no evidence behind the latter.
 */
const BENEFITS = [
  {
    icon: "🧲",
    title: "Magnetic stone design",
    text: "Magnetite and hematite beads with integrated magnetic elements, finished in matte black with a pentagram centrepiece.",
  },
  {
    icon: "🎯",
    title: "Wear your goal",
    text: "A goal you can see is a goal you keep. It sits on your wrist through every decision you make today.",
  },
  {
    icon: "🧘",
    title: "A daily reset",
    text: "Take a second each morning to put it on and decide what kind of day you're going to have.",
  },
  {
    icon: "🔥",
    title: "Stay consistent",
    text: "Progress isn't one workout or one meal. It's showing up again tomorrow, and the day after that.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Wear it",
    text: "Put your bracelet on every morning, before the day gets loud.",
  },
  {
    n: "02",
    title: "Remember your goal",
    text: "Let it be the cue that pulls you back to what you decided you wanted.",
  },
  {
    n: "03",
    title: "Keep moving",
    text: "Pair that mindset with healthy habits, movement and consistency. That's the part that changes things.",
  },
];

const FAQ = [
  {
    q: "How does this fit into a weight-loss routine?",
    a: "Think of it as a cue, not a shortcut. You wear it as a physical reminder of the goal you've set, so it stays with you through the decisions that actually move the needle — what you eat, whether you move, and whether you show up again tomorrow. The bracelet doesn't do the work. It keeps you company while you do.",
  },
  {
    q: "What is the bracelet made from?",
    a: "Magnetite and hematite beads — natural iron-bearing stone polished to a soft satin sheen — strung on an elastic stretch cord, with a carved pentagram focal bead set flush so it won't snag.",
  },
  {
    q: "What stones are used?",
    a: "Magnetite and hematite. Both are natural iron-bearing stones with a dense, cool feel and a dark metallic lustre you don't get from plated metal or resin imitations.",
  },
  {
    q: "Is it comfortable for everyday wear?",
    a: "Yes. It's lightweight for a stone bracelet, sits flat against the wrist and has no clasp to dig in. Most people stop noticing it within a few minutes.",
  },
  {
    q: "Is it adjustable?",
    a: "It's one size with a stretch fit rather than an adjustable clasp. It's comfortable on wrists roughly 6.5 to 8 inches around.",
  },
  {
    q: "How does the stretch design work?",
    a: "The beads are strung on a strong elastic core, so it stretches over your hand and settles back against the wrist. On and off in about a second, with nothing to fasten.",
  },
  {
    q: "Can I wear it every day?",
    a: "That's the idea — the reminder only works if it's there. Store it flat rather than hanging so the elastic keeps its tension over time.",
  },
  {
    q: "How should I clean it?",
    a: "Wipe it with a dry, soft cloth. Keep it away from perfume, lotions and prolonged water, and take it off before swimming or showering.",
  },
  {
    q: "What comes with my order?",
    a: "One Pentagram Magnetic Stone Bracelet, shipped with tracking. Because it contains magnets, we don't recommend it for anyone with a pacemaker, implanted defibrillator, insulin pump or other implanted electronic device.",
  },
];

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product || product.variants.length === 0) notFound();

  const { name } = splitTitle(product.title);
  const variant = product.variants[0];
  const { hasDiscount, percent } = discount(variant);
  const url = `/products/${product.handle}`;
  const lifestyle = product.images.slice(1);
  const heroImage = product.images[0] ?? product.featuredImage;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd(product, url)),
        }}
      />

      {/* ---------------------------------------- 1. HOOK + PRODUCT + OFFER */}
      <section className="hero">
        <div className="wrap">
          <div className="hero__grid">
            <div>
              <ProductGallery
                images={product.images}
                title={name}
                layout="hero"
              />
            </div>

            <div className="hero__body">
              <span className="eyebrow">For the journey, not the shortcut</span>

              <h1>Wear your weight-loss journey.</h1>

              <p className="hero__sub">
                A magnetic stone bracelet designed to become your everyday
                reminder to stay focused, motivated and committed to your goals.
              </p>

              {/*
                The marketing headline carries the H1, but the shopper still
                needs to know what the thing is actually called — for
                recognition at checkout, and so the page names the product it
                sells.
              */}
              <p className="hero__product">{name}</p>

              <BuyBox
                product={product}
                saleEndsAt={OFFER.saleEndsAt}
                shipsIn={OFFER.shipsIn}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip — only claims that are actually true. No returns. */}
      <section style={{ marginTop: 44 }}>
        <div className="trust">
          <div className="trust__i">
            <b>Free shipping</b>
            <span>On every order</span>
          </div>
          <div className="trust__i">
            <b>Secure checkout</b>
            <span>Encrypted, handled by Shopify</span>
          </div>
          <div className="trust__i">
            <b>Easy everyday wear</b>
            <span>Stretch fit, no clasp</span>
          </div>
          <div className="trust__i">
            <b>Customer support</b>
            <span>A human answers every email</span>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- 2. WHY WEAR IT */}
      <section className="section band">
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "22ch" }}>
            <span className="eyebrow eyebrow--on-dark">The idea</span>
            <h2 className="h2" style={{ marginTop: 12 }}>
              Your goals should never leave your side.
            </h2>
          </div>
          <div className="band__cols">
            <p className="band__lede reveal">
              Losing weight is never decided in one workout or one meal. It gets
              decided in the small moments — the afternoon you nearly skipped
              it, the evening you almost ordered in, the morning the alarm went
              off and you got up anyway.
            </p>
            <p className="band__lede reveal">
              The hard part isn&rsquo;t knowing what to do. It&rsquo;s
              remembering, at 3pm on a difficult Tuesday, that you decided to.
              This is a reminder you can&rsquo;t close, mute or scroll past.
              It&rsquo;s on your wrist.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------ 3. MOTIVATION / BENEFITS */}
      <section className="section">
        <div className="wrap">
          <div className="reveal">
            <span className="eyebrow">Why people wear it</span>
            <h2 className="h2" style={{ marginTop: 10 }}>
              Built to keep you honest.
            </h2>
          </div>
          <div className="cards cards--4">
            {BENEFITS.map((b) => (
              <div className="card reveal" key={b.title}>
                <div className="card__ico" aria-hidden="true">
                  {b.icon}
                </div>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ 4. EMOTIONAL BEAT */}
      <section className="feature">
        {heroImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            className="feature__bg"
            src={cdnImage(heroImage.url, 1200)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
          />
        )}
        <div className="wrap feature__inner">
          <h2 className="feature__h reveal">
            Losing weight is a journey. Wear the reminder.
          </h2>
          <p className="feature__p reveal">
            Discipline isn&rsquo;t a personality trait. It&rsquo;s a stack of
            small decisions, most of them boring, most of them made when nobody
            is watching. Confidence is what you get on the other side of making
            them consistently. This is for the version of you that keeps going.
          </p>
        </div>
      </section>

      {/* -------------------------------------------- 5. STONES AND DESIGN */}
      <section className="section" id="story">
        <div className="wrap story">
          <div className="story__img reveal">
            {product.featuredImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={cdnImage(product.featuredImage.url, 800)}
                srcSet={`${cdnImage(product.featuredImage.url, 500)} 500w, ${cdnImage(product.featuredImage.url, 800)} 800w`}
                alt={product.featuredImage.altText ?? name}
                width={product.featuredImage.width}
                height={product.featuredImage.height}
                loading="lazy"
                decoding="async"
                sizes="(min-width: 900px) 46vw, 100vw"
              />
            )}
          </div>
          <div className="reveal">
            <span className="eyebrow">Stones &amp; design</span>
            <h2 className="h2" style={{ marginTop: 10 }}>
              Not ordinary jewelry.
            </h2>
            <p className="lede" style={{ marginTop: 16 }}>
              Magnetite and hematite are natural iron-bearing stones — dense,
              cool to the touch, with a dark metallic lustre that plated metal
              and resin can&rsquo;t fake. They&rsquo;re strung on an elastic
              core, so there&rsquo;s no clasp to fasten and nothing to dig in.
            </p>
            <p className="lede" style={{ marginTop: 14 }}>
              A carved pentagram centrepiece sits flush in the line of beads,
              set so it won&rsquo;t catch on a sleeve. Matte black, unisex, and
              quiet enough to wear with anything — which matters, because the
              one you actually wear every day is the one that works.
            </p>

            {CENTREPIECE_PHOTO && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={CENTREPIECE_PHOTO.url}
                alt={CENTREPIECE_PHOTO.alt}
                loading="lazy"
                decoding="async"
                style={{ marginTop: 20, borderRadius: 12 }}
              />
            )}
          </div>
        </div>
      </section>

      {/* --------------------------------- 6. HOW IT FITS INTO YOUR JOURNEY */}
      <section className="section" style={{ background: "var(--paper-2)" }}>
        <div className="wrap">
          <div className="reveal">
            <span className="eyebrow">The routine</span>
            <h2 className="h2" style={{ marginTop: 10 }}>
              How it fits your journey.
            </h2>
          </div>
          <div className="steps">
            {STEPS.map((s) => (
              <div className="step reveal" key={s.n}>
                <div className="step__n">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- 7. LIFESTYLE IMAGES */}
      {lifestyle.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="wrap">
            <div className="reveal">
              <span className="eyebrow">Closer look</span>
              <h2 className="h2" style={{ marginTop: 10, marginBottom: 24 }}>
                On the wrist.
              </h2>
            </div>
            <ProductGallery images={lifestyle} title={name} />
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ 8. REVIEWS */}
      <Reviews />

      {/* ---------------------------------------------------------- 9. FAQ */}
      <section className="section" id="faq" style={{ background: "var(--paper-2)" }}>
        <div className="wrap">
          <h2 className="h2 reveal">Questions, answered.</h2>
          <div className="faq">
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p className="faq__a">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------- 10. FINAL OFFER + BUY */}
      <section className="section">
        <div className="wrap">
          <div className="final reveal">
            {hasDiscount && (
              <span className="final__flag">Limited offer</span>
            )}

            <h2>Ready to start your journey?</h2>
            <p>
              Make today the day you start taking your goals seriously — and
              give yourself something to hold on to while you do.
            </p>

            <div className="final__price">
              {hasDiscount && variant.compareAtPrice && (
                <s>{formatMoney(variant.compareAtPrice)}</s>
              )}
              <b>{formatMoney(variant.price)}</b>
              {hasDiscount && <em>Save {percent}%</em>}
            </div>

            <a href="#main" className="btn btn--primary">
              Get yours today →
            </a>

            <p className="final__meta">
              Free shipping • Secure checkout • Ships in {OFFER.shipsIn}
            </p>
          </div>

          <p className="disclaimer">{OFFER.disclaimer}</p>
        </div>
      </section>

      <div className="sticky-pad" aria-hidden="true" />
    </>
  );
}
