import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel handles output automatically — no standalone output needed
  typescript: {
    ignoreBuildErrors: false, // Enable TS checks for production builds
  },
  reactStrictMode: true,
};

export default nextConfig;
