import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

import CartProvider from "@/components/CartProvider";
import CartDrawer from "@/components/CartDrawer";
import Header from "@/components/Header";

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
  metadataBase: new URL("https://squishy.example"),
  title: "Blind Box Squishy Mystery Box",
  description:
    "100+ possible squishy styles. Every box is a surprise. Open, squish, collect.",
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
        <a className="skip" href="#main">
          Skip to content
        </a>

        <CartProvider>
          <Header />
          <main id="main">{children}</main>
          <CartDrawer shopHref="#offer" freeShippingThreshold={null} />
        </CartProvider>
      </body>
    </html>
  );
}
