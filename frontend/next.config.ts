import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow builds to succeed even with TypeScript errors during rapid dev
  typescript: {
    ignoreBuildErrors: false,
  },
  // Proxy API calls in dev to avoid CORS issues
  async rewrites() {
    return [];
  },
};

export default nextConfig;