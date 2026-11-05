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
 * Checked 2026-11-05: `privacy-policy` returns 200, while `terms-of-service`,
 * `refund-policy`, `shipping-policy` and `contact-information` all return 404
 * — those have never been created in Shopify. A dead link in a legal footer is
 * worse than an absent one: it reads as a policy that exists and cannot be
 * produced, which is the exact impression a low-quality-destination review is
 * looking for.
 *
 * To add the rest: Shopify admin → Settings → Policies, generate each from
 * Shopify's template, then add a line here. Nothing else needs to change.
 */
const POLICIES: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Privacy Policy", href: `${SHOP_ORIGIN}/policies/privacy-policy` },
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
