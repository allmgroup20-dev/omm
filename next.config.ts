import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // For Cloudflare Workers via OpenNext
  // output: "export" not needed; OpenNext handles adapter
  experimental: {
    serverActions: { allowedOrigins: ["*"] },
  },
};

export default nextConfig;
