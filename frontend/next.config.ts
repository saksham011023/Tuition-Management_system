import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "https://tms-backend0.onrender.com/api",
  },
  // Enable standalone output for optimized Docker images.
  // Only copies the minimal files needed to run the server.
  output: "standalone",

  // Explicitly configure allowed remote image domains if using next/image
  images: {
    remotePatterns: [],
  },

  // Rewrites API calls in production Docker so SSR goes via internal hostname
  // but browser calls still use NEXT_PUBLIC_API_URL
  async rewrites() {
    return [];
  },
};

export default nextConfig;
