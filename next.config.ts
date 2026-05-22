import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript errors තිබුණත් build එක Fail නොකර ඉස්සරහට යන්න දෙනවා
    ignoreBuildErrors: true,
  },
};

export default nextConfig;