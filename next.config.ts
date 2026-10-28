import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Desligado: "Cache Components" (Next 16) usa um modelo de cache novo
  // ("use cache" + cacheLife/cacheTag) incompatível com o `revalidate` /
  // `dynamicParams` clássicos que usamos nas páginas de concelho — ficamos
  // no modelo estável/bem documentado em vez de perseguir uma API ainda
  // a mudar.
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
