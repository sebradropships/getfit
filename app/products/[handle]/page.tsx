import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FlashOffer, {
  type Benefit,
  type Trust,
} from "@/components/FlashOffer";
import { getProduct, getProductHandles } from "@/lib/shopify";
import { OFFER } from "@/lib/offer-config";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return { title: "Not found" };

  const plain = product.descriptionHtml
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);

  return {
    title: product.title,
    description: plain,
    openGraph: {
      title: product.title,
      description: plain,
      images: product.featuredImage ? [product.featuredImage.url] : [],
      type: "website",
    },
  };
}

const BENEFITS: Benefit[] = [
  {
    icon: "◆",
    title: "Real Magnetite & Hematite",
    text: "Not plated plastic. Genuine stone beads with the cool, substantial weight you can feel the moment you put it on.",
  },
  {
    icon: "◇",
    title: "Goes With Everything",
    text: "Matte black, low-profile, unisex. Reads as sharp with a suit and just as easy with a t-shirt.",
  },
  {
    icon: "●",
    title: "One-Second On, All-Day Comfort",
    text: "Durable stretch cord means no clasp to fumble with and no pinching — most people forget they are wearing it.",
  },
  {
    icon: "◐",
    title: "A Grounding Daily Ritual",
    text: "Many wearers use it as a mindfulness cue — something tactile to reach for when they want to slow down and reset.",
  },
];

const TRUST: Trust[] = [
  { icon: "★", label: "Best Price Guarantee" },
  { icon: "↩", label: "30-Day Returns" },
  { icon: "■", label: "Secure Checkout" },
  { icon: "▶", label: "Tracked Shipping" },
];

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (!product || product.variants.length === 0) notFound();

  return (
    <FlashOffer
      product={product}
      saleEndsAt={OFFER.saleEndsAt}
      stockPercent={OFFER.stockPercent}
      benefits={BENEFITS}
      trust={TRUST}
      reviewSummary={OFFER.reviewSummary}
      disclaimer={OFFER.disclaimer}
    />
  );
}
