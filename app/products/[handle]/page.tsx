import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import BuyBox from "@/components/BuyBox";
import ProductGallery from "@/components/ProductGallery";
import Reviews from "@/components/Reviews";
import { getProduct, getProductHandles } from "@/lib/shopify";
import { CENTREPIECE_PHOTO, OFFER, REVIEWS, reviewSummary } from "@/lib/offer-config";
import { cdnImage, discount, type Product } from "@/lib/catalog";

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
  const description = product.description.replace(/\s+/g, " ").trim().slice(0, 155);

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

const BENEFITS = [
  {
    title: "Everyday comfort",
    text: "Stretch construction slips on in about a second, with no clasp to fasten or lose.",
  },
  {
    title: "Distinctive design",
    text: "Matte-black stone and a symbolic centrepiece give it a look you can recognise across a room.",
  },
  {
    title: "Easy styling",
    text: "Unisex and deliberately low-key. Works with tailoring, denim and everything between.",
  },
  {
    title: "Made for daily ritual",
    text: "Something tactile to reach for — a small, repeatable moment in an ordinary day.",
  },
];

const FAQ = [
  {
    q: "Is the bracelet adjustable?",
    a: "It is one size with a stretch fit rather than an adjustable clasp. The elastic core lets it slip over the hand and settle back against the wrist.",
  },
  {
    q: "What size will it fit?",
    a: "It is comfortable on wrists roughly 6.5 to 8 inches around. Outside that range the fit will be either tight or loose, since there is no clasp to adjust.",
  },
  {
    q: "What materials are used?",
    a: "Magnetite and hematite beads — natural iron-bearing stone polished to a soft satin sheen — strung on an elastic stretch cord.",
  },
  {
    q: "Is it waterproof?",
    a: "No. Keep it away from perfume, lotions and prolonged water exposure, and take it off before swimming or showering.",
  },
  {
    q: "Can I wear it every day?",
    a: "Yes. It is built for daily wear. Store it flat rather than hanging so the elastic keeps its tension over time.",
  },
  {
    q: "How do I clean it?",
    a: "Wipe it with a dry, soft cloth. Do not soak it or use chemical cleaners.",
  },
  {
    q: "Do the magnets have proven health benefits?",
    a: "No — and we will not tell you otherwise. There is no reliable scientific evidence that magnetic bracelets aid weight loss, circulation, metabolism, detoxification or pain. We sell this as a design object for everyday wear, nothing more. If you have a pacemaker, implanted defibrillator, insulin pump or other implanted electronic device, we do not recommend wearing it.",
  },
];

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product || product.variants.length === 0) notFound();

  const { name, subtitle } = splitTitle(product.title);
  const variant = product.variants[0];
  const { hasDiscount, percent } = discount(variant);
  const url = `/products/${product.handle}`;
  const lifestyle = product.images.slice(1);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd(product, url)),
        }}
      />

      {/* 1–11. Images, name, price, offer, quantity, add to cart, buy now */}
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
              <span className="eyebrow">
                Ancient symbolism. Modern everyday wear.
              </span>

              <h1>{name}</h1>
              {subtitle && (
                <p className="hero__sub" style={{ marginTop: 8 }}>
                  {subtitle}
                </p>
              )}

              <p className="hero__sub">
                A refined stretch bracelet in genuine magnetite and hematite —
                real stone weight, matte black, and no clasp to fumble with.
              </p>

              <BuyBox
                product={product}
                saleEndsAt={OFFER.saleEndsAt}
                shipsIn={OFFER.shipsIn}
                returnWindowDays={OFFER.returnWindowDays}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section style={{ marginTop: 44 }}>
        <div className="trust">
          <div className="trust__i">
            <b>Lightweight &amp; comfortable</b>
            <span>Designed for everyday wear</span>
          </div>
          <div className="trust__i">
            <b>Stretch fit</b>
            <span>On and off in a second</span>
          </div>
          <div className="trust__i">
            <b>Unisex design</b>
            <span>Complements any style</span>
          </div>
          <div className="trust__i">
            <b>Secure checkout</b>
            <span>Encrypted, handled by Shopify</span>
          </div>
        </div>
      </section>

      {/* 12. Benefits */}
      <section className="section">
        <div className="wrap">
          <div className="reveal">
            <span className="eyebrow">Why it stays on</span>
            <h2 className="h2" style={{ marginTop: 10 }}>
              Why you&rsquo;ll reach for it every day.
            </h2>
          </div>
          <div className="cards cards--4">
            {BENEFITS.map((b) => (
              <div className="card reveal" key={b.title}>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 13. Story */}
      <section className="section" id="story" style={{ background: "var(--paper-2)" }}>
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
            <span className="eyebrow">The idea</span>
            <h2 className="h2" style={{ marginTop: 10 }}>
              More than an accessory.
            </h2>
            <p className="lede" style={{ marginTop: 16 }}>
              Designed around balance, symbolism and everyday ritual, this
              bracelet brings a distinctive visual identity to a simple piece of
              daily wear. It is not trying to be loud. It is trying to be the
              one you keep putting back on.
            </p>
          </div>
        </div>
      </section>

      {/* 14. Crafted details */}
      <section className="section">
        <div className="wrap">
          <div className="reveal">
            <span className="eyebrow">The details</span>
            <h2 className="h2" style={{ marginTop: 10 }}>
              Crafted with intention.
            </h2>
          </div>

          <div className="cards cards--3">
            <div className="card reveal">
              <div className="card__n">01 — Symbolic detail</div>
              <h3>A centrepiece with meaning</h3>
              <p>
                A distinctive pentagram-inspired centrepiece adds character and
                symbolic depth, set flush so it will not snag on a sleeve or a
                cuff.
              </p>
              {CENTREPIECE_PHOTO && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={CENTREPIECE_PHOTO.url}
                  alt={CENTREPIECE_PHOTO.alt}
                  loading="lazy"
                  decoding="async"
                  style={{ marginTop: 16, borderRadius: 10 }}
                />
              )}
            </div>

            <div className="card reveal">
              <div className="card__n">02 — Magnetic elements</div>
              <h3>Magnetic by design</h3>
              <p>
                Integrated magnetic elements are part of the bracelet&rsquo;s
                construction, for people who like magnetic-style accessories. We
                make no health claims for them.
              </p>
            </div>

            <div className="card reveal">
              <div className="card__n">03 — Everyday comfort</div>
              <h3>Built to be worn</h3>
              <p>
                A flexible stretch construction makes it easy to wear all day —
                no clasp, no pinching, and it sits flat against the wrist.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 15. Lifestyle imagery */}
      {lifestyle.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="reveal">
              <span className="eyebrow">Closer look</span>
              <h2 className="h2" style={{ marginTop: 10, marginBottom: 24 }}>
                Meet your new everyday essential.
              </h2>
            </div>
            <ProductGallery images={lifestyle} title={name} />
          </div>
        </section>
      )}

      {/* 16. Reviews */}
      <Reviews />

      {/* Full description from Shopify */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <h2 className="h2 reveal">The specifics.</h2>
          <div
            className="rich reveal"
            style={{ marginTop: 20 }}
            dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
          />
        </div>
      </section>

      {/* 17. FAQ */}
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

      {/* 18. Shipping / returns */}
      <section className="section">
        <div className="wrap">
          <h2 className="h2 reveal">Ordering with us.</h2>
          <div className="cards cards--4">
            <div className="card reveal">
              <h3>Fast shipping</h3>
              <p>Ships in {OFFER.shipsIn}, with tracking on every order.</p>
            </div>
            <div className="card reveal">
              <h3>Easy returns</h3>
              <p>
                {OFFER.returnWindowDays}-day returns on unworn pieces in their
                original condition.
              </p>
            </div>
            <div className="card reveal">
              <h3>Secure payment</h3>
              <p>
                Checkout is encrypted and handled entirely by Shopify. We never
                see your card details.
              </p>
            </div>
            <div className="card reveal">
              <h3>Customer support</h3>
              <p>
                Questions go to{" "}
                <a
                  href={`mailto:${OFFER.supportEmail}`}
                  style={{ textDecoration: "underline" }}
                >
                  {OFFER.supportEmail}
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 19. Final CTA */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="final reveal">
            <h2>Your everyday symbol of balance.</h2>
            <p>
              Real stone, a distinctive centrepiece, and a fit that takes a
              second. Ready to make it yours?
            </p>
            <Link href="#main" className="btn btn--primary">
              Get yours today
              {hasDiscount && (
                <span className="btn__sub">Save {percent}% during launch</span>
              )}
            </Link>
            <p className="final__meta">
              Secure checkout • {OFFER.returnWindowDays}-day returns • Ships in{" "}
              {OFFER.shipsIn}
            </p>
          </div>

          <p className="disclaimer">{OFFER.disclaimer}</p>
        </div>
      </section>

      <div className="sticky-pad" aria-hidden="true" />
    </>
  );
}
