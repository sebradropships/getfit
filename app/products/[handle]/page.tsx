import type { Metadata } from "next";
import { notFound } from "next/navigation";

import BuyBox from "@/components/BuyBox";
import LifestyleVideo from "@/components/LifestyleVideo";
import ProductGallery from "@/components/ProductGallery";
import { getProduct, getProductHandles } from "@/lib/shopify";
import { OFFER, REVIEWS, reviewSummary } from "@/lib/offer-config";
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
 * shows a clean name with the descriptive half dropped, without hardcoding a
 * title that could drift from Shopify.
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
 * aggregateRating is emitted only when real reviews exist. Google issues
 * manual actions for review markup not backed by reviews shown on the page,
 * and REVIEWS is still empty, so it stays off.
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
 * Each card is either a fact about how the bracelet is built, or something the
 * WEARER does. None assert an effect the object has on the body — that line is
 * what separates a motivational accessory from an unsubstantiated health
 * claim, and magnetic bracelets have no evidence behind the latter.
 */
const BENEFITS = [
  {
    icon: "🎯",
    title: "Wear your goal",
    text: "A goal you can see is a goal you keep. It sits on your wrist through every decision you make today.",
  },
  {
    icon: "🔥",
    title: "Stay consistent",
    text: "Progress isn't one workout or one meal. It's showing up again tomorrow, and the day after that.",
  },
  {
    icon: "🧲",
    title: "Magnetic stone design",
    text: "Magnetite and hematite beads with integrated magnetic elements, in matte black with a pentagram centrepiece.",
  },
  {
    icon: "🧘",
    title: "Made for every day",
    text: "Stretch fit, no clasp, sits flat against the wrist. On in a second, comfortable enough to forget.",
  },
];

/**
 * Trimmed to the five that actually block a purchase. Sizing leads because a
 * one-size stretch bracelet lives or dies on "will it fit me", and the magnet
 * question is answered straight — it is the objection a sceptical buyer is
 * really asking, and overselling it is what draws enforcement.
 */
const FAQ = [
  {
    q: "Will it fit me?",
    a: "It's one size with a stretch fit — comfortable on wrists roughly 6.5 to 8 inches around. It stretches over your hand and settles back, with no clasp to fasten.",
  },
  {
    q: "What's it made from?",
    a: "Magnetite and hematite beads — natural iron-bearing stone polished to a soft satin sheen — on an elastic stretch cord, with a carved pentagram focal bead set flush so it won't snag.",
  },
  {
    q: "Can I wear it every day?",
    a: "That's the idea — the reminder only works if it's there. Keep it away from perfume, lotions and water, take it off before swimming or showering, and store it flat so the elastic keeps its tension.",
  },
  {
    q: "Do the magnets do anything for weight loss?",
    a: "No, and we won't pretend otherwise. There's no reliable evidence that magnetic bracelets affect weight, metabolism or circulation. You're buying a piece you wear as a daily reminder of a goal you set — the results come from what you do. If you have a pacemaker, implanted defibrillator, insulin pump or other implanted electronic device, we don't recommend wearing it.",
  },
  {
    q: "How fast does it ship?",
    a: `Orders ship in ${OFFER.shipsIn} with tracking, and you'll get the tracking number by email as soon as it moves.`,
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
  // Prefer an on-wrist shot for the lifestyle image; fall back to the hero.
  const lifestyle = product.images[1] ?? product.images[0] ?? null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd(product, url)),
        }}
      />

      {/* ============================================ 1. HERO + OFFER + BUY */}
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

              <p className="hero__product">{name}</p>

              <BuyBox
                product={product}
                saleEndsAt={OFFER.saleEndsAt}
                shipsIn={OFFER.shipsIn}
              />
            </div>
          </div>
        </div>

        {/* Part of the hero block, not a section of its own. Only claims that
            are actually true — this product has no return policy. */}
        <div className="trust" style={{ marginTop: 44 }}>
          <div className="trust__i">
            <b>Free shipping</b>
            <span>On every order</span>
          </div>
          <div className="trust__i">
            <b>Secure checkout</b>
            <span>Encrypted, by Shopify</span>
          </div>
          <div className="trust__i">
            <b>Easy everyday wear</b>
            <span>Stretch fit, no clasp</span>
          </div>
          <div className="trust__i">
            <b>Customer support</b>
            <span>A human answers</span>
          </div>
        </div>
      </section>

      {/* ================================================= 2. WHY WEAR IT */}
      <section className="section" id="story">
        <div className="wrap">
          <div className="why__head reveal">
            <span className="eyebrow">Why you&rsquo;ll wear it</span>
            <h2 className="h2" style={{ marginTop: 12 }}>
              Losing weight is a journey. Wear the reminder.
            </h2>
            <p className="lede" style={{ marginTop: 16 }}>
              It never gets decided in one workout or one meal. It gets decided
              at 3pm on a difficult Tuesday, when you remember what you told
              yourself you wanted. This is a reminder you can&rsquo;t close,
              mute or scroll past — it&rsquo;s on your wrist.
            </p>
          </div>

          <div className="why__img reveal">
            <LifestyleVideo
              src="/getfit-lifestyle.mp4"
              // The on-wrist still stands in until the first frame decodes, so
              // the section never opens on an empty box.
              poster={lifestyle ? cdnImage(lifestyle.url, 1100) : ""}
              label={`${name} video`}
            />
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

      {/* ========================================== 3. OBJECTIONS + CLOSE */}
      <section className="section" id="faq" style={{ background: "var(--paper-2)" }}>
        <div className="wrap">
          <h2 className="h2 reveal">Before you order.</h2>

          <div className="faq" style={{ marginBottom: 48 }}>
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p className="faq__a">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="final reveal">
            {hasDiscount && <span className="final__flag">Limited offer</span>}

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
