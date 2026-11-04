import { META_PIXEL_ID, PIXEL_READY_EVENT } from "@/lib/pixel";

/**
 * Meta Pixel base code, emitted INLINE in the server HTML.
 *
 * Deliberately NOT next/script with strategy="afterInteractive", which is what
 * the brief suggested. afterInteractive injects the tag client-side only once
 * hydration is underway — on mobile that is seconds after the tap, and anyone
 * who leaves before then is never counted at all: PageView never fires, so Meta
 * logs no Landing Page View. That is not a theoretical risk; the same mistake
 * on a sibling storefront in this workspace lost 83% of its link clicks over
 * nine days, which both hid real traffic and starved the optimiser of the very
 * signal it bids on, feeding back into a CA$62+ CPM.
 *
 * Inline in the document means the browser parses and runs this during parse,
 * before React hydrates and before first paint. For a conversion campaign that
 * is the whole point: PageView must not wait for JavaScript we control.
 *
 * Renders nothing at all when NEXT_PUBLIC_META_PIXEL_ID is unset, so this is
 * safe to deploy before the pixel exists.
 *
 * Idempotency: the __squishyPixelInit flag guards the whole block, not just the
 * initialiser. Meta's own `if(f.fbq)return;` protects fbq from being rebuilt
 * but would still let a second execution fire a duplicate PageView.
 *
 * This is a server component: it emits markup and no client bundle of its own.
 * The <noscript> fallback is a raw HTML string because React does not hydrate
 * inside <noscript> — a browser with JS enabled never parses its contents — so
 * JSX children there can produce a mismatch warning while a raw string cannot.
 */
export default function MetaPixel() {
  if (!META_PIXEL_ID) return null;

  /* Every value interpolated below is a module constant derived from an env
     var we control, never user input, so there is nothing to escape. */
  const baseCode = `if(!window.__squishyPixelInit){window.__squishyPixelInit=1;(function(){
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
function eid(){return window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}
fbq('track', 'PageView', {}, {eventID: eid()});
window.dispatchEvent(new Event('${PIXEL_READY_EVENT}'));})();}`;

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script dangerouslySetInnerHTML={{ __html: baseCode }} />

      <noscript
        dangerouslySetInnerHTML={{
          __html: `<img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1" />`,
        }}
      />
    </>
  );
}
