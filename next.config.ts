import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      // allow arbitrary https hosts for user-provided URLs
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // empty turbopack configuration silences warnings/errors when building
  // with --turbopack (default in Next.js 16+)
  turbopack: {},
};

export default withPWA(nextConfig);
