import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: process.env.VERCEL ? undefined : "../frontend",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
