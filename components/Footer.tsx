import Link from "next/link";
import { OFFER } from "@/lib/offer-config";

const SHOP_HREF = `/products/${OFFER.featuredHandle}`;

/**
 * Newsletter.
 *
 * There is no email service connected to this store yet. Rather than render an
 * input that silently discards the address — which reads to the shopper as a
 * successful signup — we show a mailto link until an endpoint is configured.
 * Set NEXT_PUBLIC_NEWSLETTER_ENDPOINT to switch this to a real form.
 */
function Newsletter() {
  const endpoint = process.env.NEXT_PUBLIC_NEWSLETTER_ENDPOINT;

  return (
    <div>
      <h4>Join the inner circle</h4>
      <p style={{ fontSize: 14, color: "var(--charcoal)", maxWidth: "34ch" }}>
        Launch offers, new drops and product updates. No noise.
      </p>

      {endpoint ? (
        <form className="news__form" action={endpoint} method="post">
          <label className="sr" htmlFor="news-email">
            Email address
          </label>
          <input
            id="news-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="Enter your email"
          />
          <button type="submit" className="btn btn--primary">
            Join
          </button>
        </form>
      ) : (
        <p style={{ marginTop: 12 }}>
          <a
            href={`mailto:${OFFER.supportEmail}?subject=Add%20me%20to%20the%20list`}
            className="btn btn--ghost"
            style={{ maxWidth: 240 }}
          >
            Email to join
          </a>
        </p>
      )}
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__grid">
          <Newsletter />

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
              <li>
                <Link href="/contact#returns">Returns</Link>
              </li>
              <li>
                <Link href={`${SHOP_HREF}#faq`}>FAQ</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Company</h4>
            <ul>
              <li>
                <Link href="/#story">Our story</Link>
              </li>
              <li>
                <a href={`mailto:${OFFER.supportEmail}`}>{OFFER.supportEmail}</a>
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
