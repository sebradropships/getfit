/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com" }],
    // Served to any browser that accepts them; JPEG is the automatic fallback.
    // AVIF first because it is materially smaller than WebP on flat, saturated
    // artwork like this, which is most of the page weight on mobile.
    formats: ["image/avif", "image/webp"],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
