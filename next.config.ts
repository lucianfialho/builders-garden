import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Phaser precisa rodar apenas no client-side
    // Faz fallback de módulos Node.js que não existem no browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    return config;
  },
};

export default nextConfig;
