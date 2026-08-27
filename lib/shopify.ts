import "server-only";

import type { Product, ProductImage, Variant } from "./catalog";

const API_VERSION = "2025-07";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`
    );
  }
  return value;
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

async function storefront<T>(
  query: string,
  variables: Record<string, unknown> = {},
  revalidate: number | false = 60
): Promise<T> {
  const domain = requireEnv("SHOPIFY_STORE_DOMAIN");
  const token = requireEnv("SHOPIFY_STOREFRONT_ACCESS_TOKEN");

  const res = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
    ...(revalidate === false
      ? { cache: "no-store" as const }
      : { next: { revalidate } }),
  });

  if (!res.ok) {
    throw new Error(`Shopify Storefront API returned ${res.status}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new Error("Shopify Storefront API returned no data");
  }
  return json.data;
}

const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    handle
    title
    descriptionHtml
    featuredImage { url altText width height }
    images(first: 10) { nodes { url altText width height } }
    variants(first: 25) {
      nodes {
        id
        title
        availableForSale
        quantityAvailable
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
      }
    }
  }
`;

type RawProduct = Omit<Product, "images" | "variants"> & {
  images: { nodes: ProductImage[] };
  variants: { nodes: Variant[] };
};

function normalize(raw: RawProduct): Product {
  return { ...raw, images: raw.images.nodes, variants: raw.variants.nodes };
}

export async function getProduct(handle: string): Promise<Product | null> {
  const data = await storefront<{ product: RawProduct | null }>(
    `${PRODUCT_FRAGMENT}
     query Product($handle: String!) {
       product(handle: $handle) { ...ProductFields }
     }`,
    { handle }
  );
  return data.product ? normalize(data.product) : null;
}

export async function getProductHandles(): Promise<string[]> {
  const data = await storefront<{ products: { nodes: { handle: string }[] } }>(
    `query Handles { products(first: 100) { nodes { handle } } }`,
    {},
    300
  );
  return data.products.nodes.map((n) => n.handle);
}

/**
 * Creates a Shopify cart and returns the hosted checkout URL.
 *
 * Payment is handled entirely by Shopify's checkout. This application never
 * sees, stores, or transmits card data, which keeps it out of PCI scope.
 */
export async function createCheckout(
  variantId: string,
  quantity = 1
): Promise<string> {
  const data = await storefront<{
    cartCreate: {
      cart: { checkoutUrl: string } | null;
      userErrors: Array<{ field: string[] | null; message: string }>;
    };
  }>(
    `mutation CartCreate($lines: [CartLineInput!]!) {
       cartCreate(input: { lines: $lines }) {
         cart { checkoutUrl }
         userErrors { field message }
       }
     }`,
    { lines: [{ merchandiseId: variantId, quantity }] },
    false
  );

  const { cart, userErrors } = data.cartCreate;
  if (userErrors.length) {
    throw new Error(userErrors.map((e) => e.message).join("; "));
  }
  if (!cart) {
    throw new Error("Shopify did not return a checkout URL");
  }
  return cart.checkoutUrl;
}
