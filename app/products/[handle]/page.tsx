import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import ProductBuy from "@/components/ProductBuy";
import { blurb } from "@/components/ProductCarousel";
import { getProduct } from "@/lib/shopify";
import { MORE_PRODUCTS, TRUST } from "@/lib/squishy-config";

export const revalidate = 60;

/**
 * Only the handles the landing page actually features get a page.
 *
 * The store holds products that are deliberately not listed — near-duplicates,
 * and anything whose supplier imagery has not been cleared. Without this gate
 * a dynamic route would quietly publish a page for every handle in Shopify,
 * including those, which is the opposite of what this route is for.
 */
function isFeatured(handle: string): boolean {
  return MORE_PRODUCTS.includes(handle);
}

export function generateStaticParams() {
  return MORE_PRODUCTS.map((handle) => ({ handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  if (!isFeatured(handle)) return {};

  const product = await getProduct(handle).catch(() => null);
  if (!product) return {};

  const description = blurb(product.description ?? "", 150);

  return {
    title: `${product.title} — Squishbox`,
    description: description || undefined,
    alternates: { canonical: `/products/${handle}` },
    openGraph: {
      title: product.title,
      description: description || undefined,
      type: "website",
      images: product.featuredImage ? [product.featuredImage.url] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  if (!isFeatured(handle)) notFound();

  const product = await getProduct(handle).catch(() => null);
  if (!product) notFound();

  const hero = product.featuredImage ?? product.images[0] ?? null;
  const rest = product.images.filter((i) => i.url !== hero?.url).slice(0, 5);

  return (
    <section className="section pdp">
      <div className="wrap">
        <Link className="pdp__back" href="/">
          ← Back to the mystery box
        </Link>

        <div className="pdp__grid">
          <div className="pdp__media">
            {hero && (
              <Image
                className="pdp__hero"
                src={hero.url}
                alt={hero.altText || product.title}
                width={hero.width}
                height={hero.height}
                sizes="(min-width: 900px) 460px, 92vw"
                priority
              />
            )}

            {rest.length > 0 && (
              <div className="pdp__thumbs">
                {rest.map((img, i) => (
                  <Image
                    key={img.url}
                    className="pdp__thumb"
                    src={img.url}
                    alt={img.altText || `${product.title} view ${i + 2}`}
                    width={img.width}
                    height={img.height}
                    sizes="(min-width: 900px) 86px, 20vw"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="pdp__info">
            <h1 className="pdp__title">{product.title}</h1>

            {product.description && (
              <p className="pdp__desc">{product.description}</p>
            )}

            <ProductBuy product={product} />

            <ul className="pdp__trust">
              {TRUST.map((t) => (
                <li key={t.label}>
                  <span aria-hidden="true">{t.icon}</span> {t.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
