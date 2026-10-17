import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ProductBuy from "@/components/ProductBuy";
import ProductGallery from "@/components/ProductGallery";
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

  /*
    featuredImage first, then the rest in Shopify order and de-duplicated —
    the featured shot is usually also images[0], and listing it twice would
    put two identical thumbnails at the head of the strip.
  */
  const featured = product.featuredImage;
  const gallery = featured
    ? [featured, ...product.images.filter((i) => i.url !== featured.url)]
    : product.images;

  return (
    <section className="section pdp">
      <div className="wrap">
        <Link className="pdp__back" href="/">
          ← Back to the mystery box
        </Link>

        <div className="pdp__grid">
          <ProductGallery images={gallery} title={product.title} />

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
