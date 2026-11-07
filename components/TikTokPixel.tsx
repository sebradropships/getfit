import {
  TIKTOK_PIXEL_ID,
  TIKTOK_PIXEL_READY_EVENT,
  TTCLID_COOKIE,
} from "@/lib/tiktok-pixel";

/**
 * TikTok Pixel base code, emitted INLINE in the server HTML.
 *
 * Inline for the same reason as MetaPixel: the browser runs this during parse,
 * before hydration and before first paint, so PageView never waits on a
 * JavaScript bundle we control. The sibling storefront that lost 83% of its
 * link clicks to an `afterInteractive` tag is the cautionary tale; see
 * `components/MetaPixel.tsx`.
 *
 * TWO THINGS HERE ARE NOT IN THE META VERSION.
 *
 * 1. THE CLICK ID IS CAPTURED BY HAND, FIRST.
 *    Meta's fbevents.js turns `?fbclid=` into the `_fbc` cookie on its own.
 *    TikTok's events.js does not do the equivalent — it writes `_ttp` and
 *    leaves `ttclid` in the query string. Copying the Meta pattern verbatim
 *    (load pixel, read cookie server-side) therefore captures nothing, with no
 *    error to notice. The IIFE below does that job instead, and runs BEFORE
 *    ttq.load on purpose: an ad blocker that eats analytics.tiktok.com still
 *    leaves the click id banked, so a blocked pixel costs the event but not the
 *    attribution.
 *
 * 2. THE PIXEL IS NOT THE ONE SHOPIFY INSTALLED.
 *    The TikTok channel app already injected this same pixel id on
 *    shop.viraltoys.us, which covers checkout and nothing else. Ads land on
 *    www.viraltoys.us, where until now there was no TikTok pixel at all — so
 *    ViewContent, AddToCart and InitiateCheckout were invisible and `ttclid`
 *    was dropped on arrival. Sharing one id across both domains is intended:
 *    it keeps the funnel in a single dataset.
 *
 * Renders nothing when NEXT_PUBLIC_TIKTOK_PIXEL_ID is unset, so this is safe to
 * deploy before the variable exists.
 *
 * Idempotency: the __squishyTtqInit flag guards the whole block. TikTok's stub
 * is re-entrant enough to survive a second definition, but a second `ttq.page()`
 * would post a duplicate PageView.
 *
 * Server component: markup only, no client bundle of its own.
 */
export default function TikTokPixel() {
  if (!TIKTOK_PIXEL_ID) return null;

  /* Every interpolated value is a module constant derived from an env var we
     control, never user input, so there is nothing to escape. */
  const baseCode = `if(!window.__squishyTtqInit){window.__squishyTtqInit=1;(function(){
try{var m=/[?&]ttclid=([^&#]+)/.exec(window.location.search);
if(m&&m[1]){document.cookie='${TTCLID_COOKIE}='+m[1]+';path=/;max-age=2592000;samesite=lax'+(location.protocol==='https:'?';secure':'');}}catch(e){}
!function (w, d, t) {
w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
ttq.load('${TIKTOK_PIXEL_ID}');
ttq.page();
}(window, document, 'ttq');
window.dispatchEvent(new Event('${TIKTOK_PIXEL_READY_EVENT}'));})();}`;

  /* eslint-disable-next-line react/no-danger */
  return <script dangerouslySetInnerHTML={{ __html: baseCode }} />;
}
