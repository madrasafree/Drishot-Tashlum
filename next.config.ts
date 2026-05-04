import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
