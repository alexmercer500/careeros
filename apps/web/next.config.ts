import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source; Next compiles them in place.
  transpilePackages: ["@careeros/core", "@careeros/database", "@careeros/validation"],
  poweredByHeader: false,
  // Keeps the dev overlay out of screenshots and out of the product surface.
  devIndicators: false,
};

export default nextConfig;
