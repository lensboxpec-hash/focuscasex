import type { NextConfig } from "next";

// STATIC_EXPORT=1 switches the app to a fully static export (GitHub Pages).
// In that mode there is no server: src/lib/sb-install.ts answers /api/* calls
// from Supabase directly (Auth + PostgREST) in the browser. The real API route
// handlers are stashed away during that build by scripts/build-static.mjs.
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
