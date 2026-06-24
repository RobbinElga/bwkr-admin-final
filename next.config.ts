import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: process.env.NODE_ENV === "development",
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "https", hostname: "kyai-apiii-bro-merdeka.bwkr.org", pathname: "/storage/**" },
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/storage/**" },
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/**" },
      { protocol: "https", hostname: "img.youtube.com", pathname: "/**" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/bff/:path*",
        destination: `${process.env.BACKEND_ORIGIN ?? "http://localhost:8000"}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;