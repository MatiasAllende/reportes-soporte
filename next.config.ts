import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sql.js"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
