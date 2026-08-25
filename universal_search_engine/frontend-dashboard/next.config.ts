import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "../frontend",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
