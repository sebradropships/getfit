import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

import { SITE_URL } from "@/lib/squishy-config";

import AnnouncementStrip from "@/components/AnnouncementStrip";
import MetaPixel from "@/components/MetaPixel";
import TikTokPixel from "@/components/TikTokPixel";
import CartProvider from "@/components/CartProvider";
import CartDrawer from "@/components/CartDrawer";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";

/**
 * Self-hosted at build time by next/font — no runtime request to Google, no
 * layout shift, and only the weights used are shipped.
 */
const display = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Blind Box Squishy Mystery Box",
  description:
    "Endless surprise styles. Every box is different. Open, squish, collect.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ff3fa4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Deliberately synchronous.
 *
 * Awaiting the cart here would make the layout suspend, and since every Server
 * Action re-renders the route it would re-suspend on each one — tearing down
 * and remounting the client tree, which closes the cart drawer mid-purchase.
 * CartProvider hydrates the cart itself on mount.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        {/* First thing in the body: the base code runs during parse, before
            hydration and before first paint, so PageView never waits on the
            React bundle. Renders null until NEXT_PUBLIC_META_PIXEL_ID is set. */}
        <MetaPixel />

        {/* Inline for the same reason, and ordered after Meta only because Meta
            is the channel currently spending. The TikTok leg additionally banks
            `ttclid` from the query string before its own script loads, because
            TikTok's events.js never writes a `_fbc` equivalent itself — see
            components/TikTokPixel.tsx. Renders null until
            NEXT_PUBLIC_TIKTOK_PIXEL_ID is set. */}
        <TikTokPixel />

        <a className="skip" href="#main">
          Skip to content
        </a>

        <CartProvider>
          <AnnouncementStrip />
          <Header />
          <main id="main">{children}</main>
          {/* Inside CartProvider only because it sits in the same tree; it
              holds no cart state. Outside <main> so it is not announced as
              page content and the skip link still lands correctly. */}
          <SiteFooter />
          <CartDrawer shopHref="#offer" freeShippingThreshold={null} />
        </CartProvider>
      </body>
    </html>
  );
}
