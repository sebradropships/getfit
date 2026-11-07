import crypto from "node:crypto";

/**
 * Shopify `orders/paid` → Meta Conversions API `Purchase`.
 *
 * Checkout happens on shop.viraltoys.us, which is Shopify's own domain, so the
 * browser pixel on viraltoys.us structurally cannot fire Purchase — it never
 * runs on the page where the sale completes. Server-side is the only path, and
 * without it a Sales campaign optimising for Purchase has nothing to optimise
 * toward and no sale can be attributed back to an ad.
 *
 * Every secret is read at call time, never at module load, so a deploy that
 * predates the environment variables still builds and still serves the rest of
 * the site. Until they exist this route answers 503, which Shopify retries —
 * so the first delivery after the vars land succeeds on its own.
 */

/* node:crypto for the HMAC, and the raw request bytes — neither is available
   on the Edge runtime. */
export const runtime = "nodejs";

/* A webhook is never a cacheable page. */
export const dynamic = "force-dynamic";

const GRAPH_VERSION = "v21.0";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/**
 * The dataset is the same one the browser pixel posts to, so it defaults to
 * the public id rather than making someone set the same number twice.
 * META_DATASET_ID is the escape hatch if the two ever need to diverge.
 */
function datasetId(): string {
  return env("META_DATASET_ID") || env("NEXT_PUBLIC_META_PIXEL_ID");
}

/**
 * TikTok's equivalent, defaulting to the same pixel the browser posts to for
 * the same reason as above. TIKTOK_EVENT_SOURCE_ID is the escape hatch.
 */
function tiktokEventSourceId(): string {
  return env("TIKTOK_EVENT_SOURCE_ID") || env("NEXT_PUBLIC_TIKTOK_PIXEL_ID");
}

function tiktokConfigured(): boolean {
  return Boolean(env("TIKTOK_EVENTS_API_TOKEN") && tiktokEventSourceId());
}

/** What one platform's relay attempt came back with. */
type Relay = {
  platform: "meta" | "tiktok";
  sent: boolean;
  /** True only for failures worth a Shopify redelivery. */
  retry: boolean;
  status?: number;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/* ---------------------------------------------------------------- hashing */

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Meta requires SHA-256 hex of a normalised value for every user_data field
 * except client_ip_address, client_user_agent, fbp and fbc. Normalisation is
 * not cosmetic: "Ada@Example.com " and "ada@example.com" hash differently, and
 * a mismatched hash is simply an unmatched customer — which surfaces as a
 * lower match quality score rather than as an error.
 */
function hashed(
  value: unknown,
  normalise: (s: string) => string = (s) => s.trim().toLowerCase()
): string | undefined {
  if (value === null || value === undefined) return undefined;
  const normalised = normalise(String(value));
  return normalised ? sha256(normalised) : undefined;
}

const plain = (s: string) => s.trim().toLowerCase();

/* Letters only, so "O'Brien" and "obrien" agree. */
const nameish = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-zÀ-ɏ]/g, "");

/* No spaces or punctuation: "New York" becomes "newyork". */
const placeish = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

/* US ZIPs match on the 5-digit prefix; ZIP+4 would not. */
const zipish = (s: string) => {
  const z = s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return /^\d{9}$/.test(z) ? z.slice(0, 5) : z;
};

/**
 * Digits only, with a country code. Shopify stores US numbers in a mix of
 * shapes; a bare 10-digit number is assumed US because this store ships only
 * to the US, and sending it without the leading 1 would never match.
 */
const phoneish = (s: string) => {
  let d = s.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10) d = `1${d}`;
  return d;
};

/* ------------------------------------------------------------ order shape */

type Address = {
  first_name?: string | null;
  last_name?: string | null;
  city?: string | null;
  province_code?: string | null;
  zip?: string | null;
  country_code?: string | null;
  phone?: string | null;
};

type LineItem = {
  variant_id?: number | string | null;
  quantity?: number | null;
  price?: string | number | null;
};

type ShopifyOrder = {
  id?: number | string;
  admin_graphql_api_id?: string | null;
  email?: string | null;
  phone?: string | null;
  currency?: string | null;
  total_price?: string | null;
  current_total_price?: string | null;
  created_at?: string | null;
  processed_at?: string | null;
  landing_site?: string | null;
  customer?: {
    id?: number | string | null;
    admin_graphql_api_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  shipping_address?: Address | null;
  billing_address?: Address | null;
  client_details?: { browser_ip?: string | null; user_agent?: string | null } | null;
  note_attributes?: Array<{ name?: string | null; value?: string | null }> | null;
  line_items?: LineItem[] | null;
};

/**
 * The exact id, as a string, without going through a double.
 *
 * Shopify ids are int64 and arrive as bare JSON numbers, so `JSON.parse` hands
 * back a double and silently rounds anything past 2^53 — 820982911946154508
 * becomes 820982911946154500. Current order ids are short enough to survive
 * that, but the damage would be invisible and would land on the two fields
 * least able to take it: the deduplication key and order_id. Every webhook
 * payload also carries `admin_graphql_api_id` as a *string*, so take the id
 * from there and fall back only if it is missing.
 */
function exactId(
  entity: { id?: number | string | null; admin_graphql_api_id?: string | null } | null | undefined
): string {
  if (!entity) return "";
  const gid = entity.admin_graphql_api_id;
  if (typeof gid === "string" && gid.includes("/")) {
    const tail = gid.split("/").pop();
    if (tail) return tail;
  }
  return entity.id === null || entity.id === undefined ? "" : String(entity.id);
}

function noteAttr(order: ShopifyOrder, ...names: string[]): string | undefined {
  const attrs = Array.isArray(order.note_attributes) ? order.note_attributes : [];
  for (const name of names) {
    const hit = attrs.find(
      (a) =>
        a && typeof a.name === "string" && a.name.toLowerCase() === name.toLowerCase()
    );
    if (hit && hit.value) return String(hit.value);
  }
  return undefined;
}

/**
 * Rebuild the click id from the landing URL when the storefront managed to
 * pass one through.
 *
 * Best-effort by design: the headless storefront does not currently forward
 * fbclid into Shopify, so this is usually absent and the match leans on the
 * hashed email, phone and address instead. It costs nothing to read, and it
 * starts working the day the storefront does forward it.
 */
function fbcFrom(order: ShopifyOrder, eventTimeMs: number): string | undefined {
  const direct = noteAttr(order, "_fbc", "fbc");
  if (direct) return direct;

  const landing = order.landing_site;
  if (!landing) return undefined;
  try {
    const url = new URL(landing, "https://viraltoys.us");
    const fbclid = url.searchParams.get("fbclid");
    return fbclid ? `fb.1.${eventTimeMs}.${fbclid}` : undefined;
  } catch {
    return undefined;
  }
}

/* --------------------------------------------------------------- the event */

function buildEvent(order: ShopifyOrder) {
  const address = order.shipping_address ?? order.billing_address ?? null;
  const id = exactId(order);

  const createdMs = Date.parse(order.processed_at ?? order.created_at ?? "");
  const nowMs = Date.now();
  /* Never send a future timestamp — Meta rejects the whole event for it. */
  const eventTimeMs = Number.isFinite(createdMs) ? Math.min(createdMs, nowMs) : nowMs;

  const userData: Record<string, string> = {};
  const put = (key: string, value: string | undefined) => {
    if (value) userData[key] = value;
  };

  put("em", hashed(order.email, plain));
  put("ph", hashed(order.phone ?? address?.phone, phoneish));
  put("fn", hashed(order.customer?.first_name ?? address?.first_name, nameish));
  put("ln", hashed(order.customer?.last_name ?? address?.last_name, nameish));
  put("ct", hashed(address?.city, placeish));
  put("st", hashed(address?.province_code, placeish));
  put("zp", hashed(address?.zip, zipish));
  put("country", hashed(address?.country_code, placeish));
  put("external_id", hashed(exactId(order.customer) || undefined, plain));

  /* Not hashed — Meta wants these two raw, and they materially lift match
     quality because they tie the order back to the browsing session. */
  const ip = order.client_details?.browser_ip;
  const ua = order.client_details?.user_agent;
  if (ip) userData.client_ip_address = String(ip);
  if (ua) userData.client_user_agent = String(ua);

  const fbp = noteAttr(order, "_fbp", "fbp");
  if (fbp) userData.fbp = fbp;
  const fbc = fbcFrom(order, eventTimeMs);
  if (fbc) userData.fbc = fbc;

  const lines = Array.isArray(order.line_items) ? order.line_items : [];
  /*
    Shopify's webhook gives a numeric variant id, but the browser's AddToCart
    and ViewContent send the Storefront GID. Formatting it back to a GID here
    keeps one id space across browser and server, so content-level reporting
    and retargeting audiences line up instead of silently splitting in two.
  */
  const contents = lines
    .filter((l) => l && l.variant_id !== null && l.variant_id !== undefined)
    .map((l) => ({
      id: `gid://shopify/ProductVariant/${l.variant_id}`,
      quantity: Number(l.quantity) || 0,
      item_price: Number(l.price) || 0,
    }));

  const numItems = contents.reduce((n, c) => n + c.quantity, 0);
  const value = Number(order.current_total_price ?? order.total_price ?? 0) || 0;

  return {
    event_name: "Purchase",
    event_time: Math.floor(eventTimeMs / 1000),
    /*
      Stable per order, so Shopify's retries (it re-delivers for up to 48h on a
      non-2xx) collapse into one Purchase instead of inflating revenue. Meta
      deduplicates on event_name + event_id. If a browser Purchase is ever
      added via a Shopify checkout script, it must use this exact key.
    */
    event_id: `order_${id}`,
    action_source: "website",
    event_source_url: env("SITE_URL") || "https://viraltoys.us/",
    user_data: userData,
    custom_data: {
      currency: String(order.currency ?? "USD").toUpperCase(),
      value,
      content_type: "product",
      content_ids: contents.map((c) => c.id),
      contents,
      num_items: numItems,
      order_id: id,
    },
  };
}

/* ----------------------------------------------------------------- tiktok */

/**
 * TikTok's click id for this order.
 *
 * Mirrors `fbcFrom`, with one difference worth knowing: there is no wrapper
 * format. Meta wants `fb.1.<ms>.<fbclid>`; TikTok wants the raw `ttclid`
 * exactly as it appeared in the URL, so nothing is assembled around it.
 *
 * `_ttclid` is written into cart attributes by `clickAttribution()` in
 * app/actions.ts, which reads the cookie that our own inline script banks —
 * TikTok's events.js never writes one. The `landing_site` fallback covers
 * orders placed before that shipped, and costs nothing to keep.
 */
function ttclidFrom(order: ShopifyOrder): string | undefined {
  const direct = noteAttr(order, "_ttclid", "ttclid");
  if (direct) return direct;

  const landing = order.landing_site;
  if (!landing) return undefined;
  try {
    const url = new URL(landing, "https://viraltoys.us");
    return url.searchParams.get("ttclid") ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * The same Purchase, in TikTok's shape.
 *
 * Built separately from the Meta event rather than mapped from it. The two
 * APIs agree on the hard part — SHA-256 hex of a normalised value, which is
 * why every `hashed()` helper above is reused verbatim — and disagree on
 * nearly every name around it:
 *
 *   Meta                        TikTok
 *   event_name                  event
 *   user_data                   user
 *   custom_data                 properties
 *   em / ph / fn / ln           email / phone / first_name / last_name
 *   ct / st / zp                city / state / zip_code
 *   client_ip_address           ip
 *   client_user_agent           user_agent
 *   fbp / fbc                   ttp / ttclid
 *   content_ids + contents      contents only, with content_id inside
 *   ?access_token= query param  Access-Token request header
 *
 * Sending Meta's field names to TikTok yields a 200 with an event that has no
 * user and no products attached — accepted, counted, and useless. That is the
 * failure this file is written to avoid.
 */
function buildTikTokEvent(order: ShopifyOrder) {
  const address = order.shipping_address ?? order.billing_address ?? null;
  const id = exactId(order);

  const createdMs = Date.parse(order.processed_at ?? order.created_at ?? "");
  const nowMs = Date.now();
  const eventTimeMs = Number.isFinite(createdMs) ? Math.min(createdMs, nowMs) : nowMs;

  const user: Record<string, string> = {};
  const put = (key: string, value: string | undefined) => {
    if (value) user[key] = value;
  };

  put("email", hashed(order.email, plain));
  put("phone", hashed(order.phone ?? address?.phone, phoneish));
  put("first_name", hashed(order.customer?.first_name ?? address?.first_name, nameish));
  put("last_name", hashed(order.customer?.last_name ?? address?.last_name, nameish));
  put("city", hashed(address?.city, placeish));
  put("state", hashed(address?.province_code, placeish));
  put("zip_code", hashed(address?.zip, zipish));
  put("country", hashed(address?.country_code, placeish));
  put("external_id", hashed(exactId(order.customer) || undefined, plain));

  /* Raw, like Meta's two exceptions — TikTok hashes neither of these. */
  const ip = order.client_details?.browser_ip;
  const ua = order.client_details?.user_agent;
  if (ip) user.ip = String(ip);
  if (ua) user.user_agent = String(ua);

  put("ttp", noteAttr(order, "_ttp", "ttp"));
  put("ttclid", ttclidFrom(order));

  const lines = Array.isArray(order.line_items) ? order.line_items : [];
  /* Same GID normalisation as the Meta path, so browser and server share one
     id space on this platform too. */
  const contents = lines
    .filter((l) => l && l.variant_id !== null && l.variant_id !== undefined)
    .map((l) => ({
      content_id: `gid://shopify/ProductVariant/${l.variant_id}`,
      content_type: "product",
      quantity: Number(l.quantity) || 0,
      price: Number(l.price) || 0,
    }));

  const value = Number(order.current_total_price ?? order.total_price ?? 0) || 0;

  return {
    event: "CompletePayment",
    event_time: Math.floor(eventTimeMs / 1000),
    /* Same key as the Meta event on purpose: TikTok also dedupes on
       event + event_id, and Shopify redelivers for up to 48h. */
    event_id: `order_${id}`,
    user,
    properties: {
      currency: String(order.currency ?? "USD").toUpperCase(),
      value,
      content_type: "product",
      contents,
      order_id: id,
    },
    page: { url: env("SITE_URL") || "https://viraltoys.us/" },
  };
}

/**
 * Post the Purchase to TikTok's Events API.
 *
 * Never throws, and a TikTok failure never costs the Meta relay — Meta is the
 * channel currently carrying spend, and it had better not go dark because
 * TikTok 500s.
 */
async function sendTikTok(order: ShopifyOrder): Promise<Relay> {
  const token = env("TIKTOK_EVENTS_API_TOKEN");
  const sourceId = tiktokEventSourceId();

  if (!token || !sourceId) {
    /* Not an error: TikTok is simply not switched on yet. No retry — the Meta
       relay already succeeded and redelivering would not help. */
    return { platform: "tiktok", sent: false, retry: false };
  }

  const payload: Record<string, unknown> = {
    event_source: "web",
    event_source_id: sourceId,
    data: [buildTikTokEvent(order)],
  };
  const testCode = env("TIKTOK_TEST_EVENT_CODE");
  if (testCode) payload.test_event_code = testCode;

  let response: Response;
  try {
    response = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/event/track/",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          /* A header, not a query parameter. This is the single most common way
             to get a confusing 40105 out of this endpoint. */
          "Access-Token": token,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      }
    );
  } catch (error) {
    console.error("[tiktok-capi] network error reaching TikTok", error);
    return { platform: "tiktok", sent: false, retry: true };
  }

  const body = await response.text();

  /*
    TikTok returns HTTP 200 with a non-zero `code` in the body for most
    application errors, so the HTTP status alone is not the answer. An
    unparseable body is treated as a failure rather than a success.
  */
  let code: number | null = null;
  try {
    const parsed = JSON.parse(body || "{}") as { code?: number };
    code = typeof parsed.code === "number" ? parsed.code : null;
  } catch {
    code = null;
  }

  if (!response.ok || code !== 0) {
    console.error(
      `[tiktok-capi] rejected CompletePayment (http ${response.status}, code ${code})`,
      body.slice(0, 500)
    );
    /* Retry only server-side trouble, as on the Meta path: a bad payload fails
       identically forever and a retry storm just hides the log. */
    return {
      platform: "tiktok",
      sent: false,
      retry: response.status >= 500,
      status: response.status,
    };
  }

  console.log(
    `[tiktok-capi] CompletePayment sent for order ${exactId(order) || "?"}`
  );
  return { platform: "tiktok", sent: true, retry: false, status: 200 };
}

/* ------------------------------------------------------------ verification */

function signatureValid(
  raw: Buffer,
  header: string | null,
  secret: string
): boolean {
  if (!header) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest();
  const received = Buffer.from(header, "base64");
  /* timingSafeEqual throws on a length mismatch, so check that first. */
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
}

/**
 * Post the Purchase to Meta's Conversions API.
 *
 * Lifted verbatim out of POST when the TikTok relay was added. The semantics
 * are deliberately unchanged — which failures retry, what gets logged, what
 * never gets logged — because this path is currently carrying live attribution
 * and a refactor is not the place to alter it.
 */
async function sendMeta(
  order: ShopifyOrder,
  token: string,
  dataset: string
): Promise<Relay> {
  const event = buildEvent(order);
  const testCode = env("META_CAPI_TEST_EVENT_CODE");

  const payload: Record<string, unknown> = { data: [event] };
  if (testCode) payload.test_event_code = testCode;

  const endpoint =
    `https://graph.facebook.com/${GRAPH_VERSION}/${dataset}/events` +
    `?access_token=${encodeURIComponent(token)}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    /* Network trouble is transient, so ask for the retry. The stable event_id
       means a retry that duplicates a delivery still counts once. */
    console.error("[capi] network error reaching Meta", error);
    return { platform: "meta", sent: false, retry: true };
  }

  const body = await response.text();

  if (!response.ok) {
    /*
      A 4xx is our payload's fault and will fail identically forever, so take
      the 200 and stop the retry storm — the log is the thing to act on. A 5xx
      is Meta's and is worth retrying.
    */
    console.error(
      `[capi] Meta rejected Purchase (${response.status})`,
      body.slice(0, 500)
    );
    return {
      platform: "meta",
      sent: false,
      retry: response.status >= 500,
      status: response.status,
    };
  }

  /* Order id only. Never log the payload: it carries hashed PII plus a raw IP
     and user agent. */
  console.log(`[capi] Purchase sent for order ${exactId(order) || "?"}`);
  return { platform: "meta", sent: true, retry: false, status: 200 };
}

/* ------------------------------------------------------------------ routes */

/**
 * A configuration probe, so the route can be confirmed deployed and wired
 * before a real order is risked against it. Booleans only — it never reveals a
 * token, an id, or whether a token is actually valid.
 */
export async function GET(): Promise<Response> {
  return json(200, {
    ok: true,
    route: "shopify orders/paid -> Meta CAPI Purchase + TikTok CompletePayment",
    configured: {
      shopifyWebhookSecret: Boolean(env("SHOPIFY_WEBHOOK_SECRET")),
      metaAccessToken: Boolean(env("META_CAPI_ACCESS_TOKEN")),
      datasetId: Boolean(datasetId()),
      testEventCode: Boolean(env("META_CAPI_TEST_EVENT_CODE")),
      tiktokAccessToken: Boolean(env("TIKTOK_EVENTS_API_TOKEN")),
      tiktokEventSourceId: Boolean(tiktokEventSourceId()),
      tiktokTestEventCode: Boolean(env("TIKTOK_TEST_EVENT_CODE")),
      tiktokRelayActive: tiktokConfigured(),
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const secret = env("SHOPIFY_WEBHOOK_SECRET");
  const token = env("META_CAPI_ACCESS_TOKEN");
  const dataset = datasetId();

  if (!secret || !token || !dataset) {
    /* 503 rather than 200: Shopify keeps retrying, so the first delivery after
       the environment variables land goes through without anyone replaying it. */
    console.error("[capi] not configured; refusing so Shopify retries");
    return json(503, { error: "not_configured" });
  }

  const raw = Buffer.from(await request.arrayBuffer());

  if (!signatureValid(raw, request.headers.get("x-shopify-hmac-sha256"), secret)) {
    /* Anyone can POST here; without this check anyone could also mint revenue
       in the ad account. */
    return json(401, { error: "bad_signature" });
  }

  const topic = request.headers.get("x-shopify-topic") ?? "";
  if (topic && topic !== "orders/paid") {
    return json(202, { skipped: topic });
  }

  let order: ShopifyOrder;
  try {
    order = JSON.parse(raw.toString("utf8")) as ShopifyOrder;
  } catch {
    return json(400, { error: "bad_json" });
  }

  /*
    Both relays, in parallel, each isolated from the other.

    Meta is the channel actually carrying spend, so a TikTok outage must never
    stop it — hence Promise.all across two functions that are written never to
    throw, rather than a sequential chain where the first failure skips the
    second.

    Asking Shopify to redeliver is safe for both: each sends the same stable
    `order_<id>` event id and both platforms dedupe on it, so a duplicate
    delivery cannot double-count revenue on either side.
  */
  const [metaRelay, tiktokRelay] = await Promise.all([
    sendMeta(order, token, dataset),
    sendTikTok(order),
  ]);

  if (metaRelay.retry || tiktokRelay.retry) {
    return json(502, {
      error: metaRelay.retry ? "meta_retry" : "tiktok_retry",
      meta: metaRelay,
      tiktok: tiktokRelay,
    });
  }

  /*
    `ok` tracks Meta alone, deliberately. TikTok not being switched on yet is a
    normal state, not a failed delivery, and must not read as a broken webhook
    in Shopify's delivery log.
  */
  return json(200, {
    ok: metaRelay.sent,
    event_id: `order_${exactId(order)}`,
    meta: metaRelay,
    tiktok: { ...tiktokRelay, configured: tiktokConfigured() },
  });
}
