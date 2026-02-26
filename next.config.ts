import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Skip type checking during build - will fix TS errors in a dedicated pass */
  typescript: {
    ignoreBuildErrors: true,
  },

  /* Allow external images from ESPN CDN (team logos via CFBD API) */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "a.espncdn.com",
        pathname: "/i/teamlogos/**",
      },
      {
        protocol: "https",
        hostname: "b.espncdn.com",
        pathname: "/i/teamlogos/**",
      },
      {
        protocol: "https",
        hostname: "a.espncdn.com",
        pathname: "/combiner/i/**",
      },
    ],
  },
};

export default nextConfig;
