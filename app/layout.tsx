import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import CartProvider from "@/components/CartProvider";
import CartDrawer from "@/components/CartDrawer";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { OFFER } from "@/lib/offer-config";

/**
 * Self-hosted at build time by next/font — no runtime request to Google, no
 * layout shift, and only the weights actually used are shipped.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getfit.example"),
  title: {
    default: "GetFit — Magnetite & Hematite Stretch Bracelet",
    template: "%s | GetFit",
  },
  description:
    "A minimalist magnetic stone stretch bracelet designed for everyday wear, symbolic style and effortless comfort.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#faf9f7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Deliberately synchronous.
 *
 * Awaiting the cart here would make the root layout suspend. Every Server
 * Action re-renders the current route, so the layout would re-suspend on each
 * one and React would tear down and remount the entire client tree beneath it
 * — losing the open cart drawer, the quantity selector and any in-flight state
 * on every add to cart. Keeping it synchronous also takes a blocking Shopify
 * round-trip out of the render path for every page.
 *
 * CartProvider hydrates the cart itself on mount instead.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>

        <CartProvider>
          <Header
            announcement={OFFER.announcement}
            saleEndsAt={OFFER.saleEndsAt}
          />
          <main id="main">{children}</main>
          <Footer />
          <CartDrawer
            shopHref={`/products/${OFFER.featuredHandle}`}
            freeShippingThreshold={OFFER.freeShippingThreshold}
          />
        </CartProvider>
      </body>
    </html>
  );
}
