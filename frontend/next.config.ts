import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Producción en ORIVIA corre como servidor Node/Next en localhost:3000.
  output: "standalone",
  trailingSlash: true,
  devIndicators: false,
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
