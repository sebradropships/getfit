/**
 * Site-wide footer carrying the legal links.
 *
 * This exists for a specific reason: the Meta pixel collects on US traffic,
 * and Meta's Business Tools Terms require a privacy disclosure reachable from
 * the pages where that collection happens. The homepage already had a
 * blind-box disclaimer, but it is a single paragraph on `/` only — the product
 * pages the ads actually land on carried no policy link of any kind.
 *
 * Rendered from the root layout rather than per page so it cannot be missed on
 * a route added later.
 *
 * Server component by design: this is static markup and must not add a
 * kilobyte to the client bundle. Mobile JavaScript arriving late is what cost
 * a sibling storefront 83% of its link clicks, and a footer is the last thing
 * worth spending that budget on.
 */

const SHOP_ORIGIN = "https://shop.viraltoys.us";

/**
 * Only policies that actually resolve are listed.
 *
 * Re-checked after the owner generated the missing ones: privacy-policy,
 * terms-of-service, refund-policy and shipping-policy all return 200.
 *
 * `contact-information` still returns 404 and is deliberately NOT linked — it
 * is the one policy Shopify has no template for, so it stays empty until
 * filled in by hand. Contact details live inside the policy documents
 * themselves, which is why no separate contact link appears here.
 *
 * A dead link in a legal footer is worse than an absent one: it reads as a
 * policy that exists and cannot be produced, which is the exact impression a
 * low-quality-destination review is looking for. Verify a 200 before adding
 * anything to this list.
 */
const POLICIES: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Privacy Policy", href: `${SHOP_ORIGIN}/policies/privacy-policy` },
  { label: "Terms of Service", href: `${SHOP_ORIGIN}/policies/terms-of-service` },
  { label: "Refund Policy", href: `${SHOP_ORIGIN}/policies/refund-policy` },
  { label: "Shipping Policy", href: `${SHOP_ORIGIN}/policies/shipping-policy` },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <nav className="site-footer__links" aria-label="Legal">
        {POLICIES.map((policy) => (
          <a
            key={policy.href}
            href={policy.href}
            /* The policies live on the Shopify domain, so these leave the
               storefront. rel="noreferrer" keeps the referrer off a
               third-party origin we do not control. */
            target="_blank"
            rel="noopener noreferrer"
          >
            {policy.label}
          </a>
        ))}
      </nav>

      <p className="site-footer__note">
        Squishbox ships to the United States only. Prices are in USD.
      </p>

      <p className="site-footer__note">© {year} Squishbox</p>
    </footer>
  );
}
