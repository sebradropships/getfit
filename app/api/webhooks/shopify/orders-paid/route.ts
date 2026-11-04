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

/* ------------------------------------------------------------------ routes */

/**
 * A configuration probe, so the route can be confirmed deployed and wired
 * before a real order is risked against it. Booleans only — it never reveals a
 * token, an id, or whether a token is actually valid.
 */
export async function GET(): Promise<Response> {
  return json(200, {
    ok: true,
    route: "shopify orders/paid -> Meta CAPI Purchase",
    configured: {
      shopifyWebhookSecret: Boolean(env("SHOPIFY_WEBHOOK_SECRET")),
      metaAccessToken: Boolean(env("META_CAPI_ACCESS_TOKEN")),
      datasetId: Boolean(datasetId()),
      testEventCode: Boolean(env("META_CAPI_TEST_EVENT_CODE")),
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
    return json(502, { error: "meta_unreachable" });
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
    return response.status >= 500
      ? json(502, { error: "meta_server_error" })
      : json(200, { ok: false, status: response.status });
  }

  /* Order id only. Never log the payload: it carries hashed PII plus a raw IP
     and user agent. */
  console.log(`[capi] Purchase sent for order ${exactId(order) || "?"}`);

  let meta: unknown = null;
  try {
    meta = JSON.parse(body || "{}");
  } catch {
    meta = null;
  }

  return json(200, { ok: true, event_id: event.event_id, meta });
}
