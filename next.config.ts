import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Les captures es comprimeixen al navegador, però deixem marge.
    serverActions: { bodySizeLimit: "12mb" },
  },
  serverExternalPackages: ["sharp"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
