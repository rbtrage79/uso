import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
  // Allow server-only packages in server components
  serverExternalPackages: ["@prisma/client", "ioredis", "bullmq", "ws"],
};

export default nextConfig;
