import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hostinger sirve el frontend como archivos estáticos. Todas las rutas
  // públicas y de panel tienen su HTML generado en `out/`.
  output: "export",
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
