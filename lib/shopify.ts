import "server-only";

import type {
  Cart,
  CartLine,
  Money,
  Product,
  ProductImage,
  Variant,
} from "./catalog";
import { isImageAllowed } from "./offer-config";

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

type GraphQLError = {
  message: string;
  extensions?: { code?: string };
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

let warnedAboutInventoryScope = false;

/**
 * The `quantityAvailable` and `totalInventory` fields require the
 * `unauthenticated_read_product_inventory` scope. When that scope is absent
 * Shopify still returns the rest of the payload and reports ACCESS_DENIED for
 * just those fields, so we degrade to `quantityAvailable: null` instead of
 * failing the page. Every stock indicator hides itself when it sees null.
 */
function isOnlyInventoryScopeErrors(errors: GraphQLError[]): boolean {
  return errors.every(
    (e) =>
      e.extensions?.code === "ACCESS_DENIED" &&
      /quantityAvailable|totalInventory/i.test(e.message)
  );
}

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
    if (json.data && isOnlyInventoryScopeErrors(json.errors)) {
      if (!warnedAboutInventoryScope) {
        warnedAboutInventoryScope = true;
        console.warn(
          "[shopify] Storefront token lacks unauthenticated_read_product_inventory. " +
            "Live stock indicators are hidden. Grant the scope and regenerate the " +
            "token to enable them."
        );
      }
    } else {
      throw new Error(json.errors.map((e) => e.message).join("; "));
    }
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
    description
    descriptionHtml
    featuredImage { url altText width height }
    images(first: 30) { nodes { url altText width height } }
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

type RawVariant = Omit<Variant, "quantityAvailable"> & {
  quantityAvailable: number | null;
};

type RawProduct = Omit<Product, "images" | "variants"> & {
  images: { nodes: ProductImage[] };
  variants: { nodes: RawVariant[] };
};

/**
 * Strips images that carry an implied health claim. This is a second line of
 * defence — the offending media should also be deleted in Shopify, since
 * product feeds and the Shopify-hosted storefront never run this code.
 */
function normalize(raw: RawProduct): Product {
  const images = raw.images.nodes.filter((img) => isImageAllowed(img.url));
  const featured =
    raw.featuredImage && isImageAllowed(raw.featuredImage.url)
      ? raw.featuredImage
      : (images[0] ?? null);

  return {
    ...raw,
    featuredImage: featured,
    images,
    variants: raw.variants.nodes.map((v) => ({
      ...v,
      quantityAvailable: v.quantityAvailable ?? null,
    })),
  };
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

/* ------------------------------------------------------------------ cart */

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost { subtotalAmount { amount currencyCode } }
    lines(first: 50) {
      nodes {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            quantityAvailable
            image { url altText width height }
            price { amount currencyCode }
            product { title }
          }
        }
      }
    }
  }
`;

type RawCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: Money };
  lines: {
    nodes: Array<{
      id: string;
      quantity: number;
      merchandise: {
        id: string;
        title: string;
        quantityAvailable: number | null;
        image: ProductImage | null;
        price: Money;
        product: { title: string };
      };
    }>;
  };
};

function normalizeCart(raw: RawCart): Cart {
  const lines: CartLine[] = raw.lines.nodes.map((line) => ({
    id: line.id,
    quantity: line.quantity,
    merchandiseId: line.merchandise.id,
    title: line.merchandise.product.title,
    variantTitle: line.merchandise.title,
    image:
      line.merchandise.image && isImageAllowed(line.merchandise.image.url)
        ? line.merchandise.image
        : null,
    price: line.merchandise.price,
    quantityAvailable: line.merchandise.quantityAvailable ?? null,
  }));

  return {
    id: raw.id,
    checkoutUrl: raw.checkoutUrl,
    totalQuantity: raw.totalQuantity,
    subtotal: raw.cost.subtotalAmount,
    lines,
  };
}

type UserErrors = { userErrors: Array<{ message: string }> };

function assertNoUserErrors(result: UserErrors) {
  if (result.userErrors.length) {
    throw new Error(result.userErrors.map((e) => e.message).join("; "));
  }
}

export async function getCart(cartId: string): Promise<Cart | null> {
  const data = await storefront<{ cart: RawCart | null }>(
    `${CART_FRAGMENT}
     query GetCart($id: ID!) { cart(id: $id) { ...CartFields } }`,
    { id: cartId },
    false
  );
  return data.cart ? normalizeCart(data.cart) : null;
}

export async function createCart(
  merchandiseId: string,
  quantity: number
): Promise<Cart> {
  const data = await storefront<{
    cartCreate: { cart: RawCart | null } & UserErrors;
  }>(
    `${CART_FRAGMENT}
     mutation CartCreate($lines: [CartLineInput!]!) {
       cartCreate(input: { lines: $lines }) {
         cart { ...CartFields }
         userErrors { message }
       }
     }`,
    { lines: [{ merchandiseId, quantity }] },
    false
  );

  assertNoUserErrors(data.cartCreate);
  if (!data.cartCreate.cart) throw new Error("Shopify did not return a cart");
  return normalizeCart(data.cartCreate.cart);
}

export async function addCartLine(
  cartId: string,
  merchandiseId: string,
  quantity: number
): Promise<Cart> {
  const data = await storefront<{
    cartLinesAdd: { cart: RawCart | null } & UserErrors;
  }>(
    `${CART_FRAGMENT}
     mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
       cartLinesAdd(cartId: $cartId, lines: $lines) {
         cart { ...CartFields }
         userErrors { message }
       }
     }`,
    { cartId, lines: [{ merchandiseId, quantity }] },
    false
  );

  assertNoUserErrors(data.cartLinesAdd);
  if (!data.cartLinesAdd.cart) throw new Error("Shopify did not return a cart");
  return normalizeCart(data.cartLinesAdd.cart);
}

export async function updateCartLine(
  cartId: string,
  lineId: string,
  quantity: number
): Promise<Cart> {
  const data = await storefront<{
    cartLinesUpdate: { cart: RawCart | null } & UserErrors;
  }>(
    `${CART_FRAGMENT}
     mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
       cartLinesUpdate(cartId: $cartId, lines: $lines) {
         cart { ...CartFields }
         userErrors { message }
       }
     }`,
    { cartId, lines: [{ id: lineId, quantity }] },
    false
  );

  assertNoUserErrors(data.cartLinesUpdate);
  if (!data.cartLinesUpdate.cart)
    throw new Error("Shopify did not return a cart");
  return normalizeCart(data.cartLinesUpdate.cart);
}

export async function removeCartLine(
  cartId: string,
  lineId: string
): Promise<Cart> {
  const data = await storefront<{
    cartLinesRemove: { cart: RawCart | null } & UserErrors;
  }>(
    `${CART_FRAGMENT}
     mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
       cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
         cart { ...CartFields }
         userErrors { message }
       }
     }`,
    { cartId, lineIds: [lineId] },
    false
  );

  assertNoUserErrors(data.cartLinesRemove);
  if (!data.cartLinesRemove.cart)
    throw new Error("Shopify did not return a cart");
  return normalizeCart(data.cartLinesRemove.cart);
}
