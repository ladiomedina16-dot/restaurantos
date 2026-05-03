import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel handles output automatically — no standalone output needed
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
