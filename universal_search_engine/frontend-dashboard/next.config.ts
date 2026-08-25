import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BACKEND_URL || "http://localhost:3000";

const nextConfig: NextConfig = {
  // No `output: "export"` — we need SSR rewrites for the API proxy
  images: {
    unoptimized: true,
  },
  turbopack: {
    // Explicitly set the root so Turbopack doesn't pick up the parent workspace lockfile
    root: __dirname,
  },
  async rewrites() {
    return [
      {
        // Proxy all /api/v1/* requests server-side to the NestJS backend.
        // This keeps everything same-origin from the browser's perspective:
        // - No CORS headers needed in the browser
        // - No hardcoded backend URL in client-side JS
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
