import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@llamaindex/liteparse"],
};

export default nextConfig;
