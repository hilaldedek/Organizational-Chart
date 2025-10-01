import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true, // ESLint hatalarını ignore et
  },
};

export default nextConfig;
