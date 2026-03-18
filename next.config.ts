import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions are stable in Next 14
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google OAuth profile images
      },
    ],
  },
};

export default nextConfig;
