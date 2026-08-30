import Link from "next/link";
import { OFFER } from "@/lib/offer-config";

const SHOP_HREF = `/products/${OFFER.featuredHandle}`;

/**
 * Newsletter and the Company column were removed deliberately.
 *
 * The newsletter had no email service behind it, so its only action was a
 * mailto fallback; a signup pitch with nothing to click is worse than no
 * pitch. If an ESP is connected later, reinstate a real form here rather than
 * an input that discards the address — see git history for the previous
 * version. Support contact still lives on /contact.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__grid">
          <div>
            <h4>Shop</h4>
            <ul>
              <li>
                <Link href={SHOP_HREF}>The Bracelet</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Help</h4>
            <ul>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
              <li>
                <Link href="/contact#shipping">Shipping</Link>
              </li>
              {/* No returns link: this product has no return policy. */}
              <li>
                <Link href={`${SHOP_HREF}#faq`}>FAQ</Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="disclaimer">{OFFER.disclaimer}</p>

        <div className="footer__base">
          <span>© {year} GetFit. All rights reserved.</span>
          <span>Secure checkout by Shopify</span>
        </div>
      </div>
    </footer>
  );
}
