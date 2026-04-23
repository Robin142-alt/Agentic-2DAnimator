/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@napi-rs/canvas", "ffmpeg-static", "pg", "bcryptjs", "jsonwebtoken"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: []
    }
  }
};

export default nextConfig;
