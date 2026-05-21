import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["edge-tts"],
  async redirects() {
    return [];
  },
};

export default nextConfig;
