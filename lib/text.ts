/**
 * A one-line blurb from Shopify's plain-text description.
 *
 * `description` is already HTML-stripped by Shopify — `descriptionHtml` is the
 * markup version — so this only has to shorten it. It cuts at a word boundary
 * rather than mid-word, and returns "" for the supplier dumps that are nothing
 * but spec tables, so the card drops the line instead of printing debris.
 *
 * This lives here rather than beside the card that first needed it because the
 * product page imports it too. ProductCarousel now pulls in a client component
 * for the autoplay, and importing a value from that module would drag the
 * controller into every page that wants to shorten a string — measured at
 * roughly a kilobyte of first-load JS a product page never runs.
 */
export function blurb(text: string, max = 95): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length === 0) return "";
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "") + "…";
}
