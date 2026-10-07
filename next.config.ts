import type { NextConfig } from "next";

// STATIC_EXPORT=1 switches the app to a fully static export (GitHub Pages).
// The demo backend (src/lib/demo-backend.ts) answers /api/* in the browser,
// so the real API route handlers are stashed away during that build.
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(isStatic
    ? {
        output: "export",
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        output: "standalone",
      }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
