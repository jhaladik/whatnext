import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  // Disable API routes since we're using Pages Functions
  skipTrailingSlashRedirect: true,
  trailingSlash: true
};

export default nextConfig;
