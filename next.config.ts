import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    const authUrl = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL) : null;
    if (!authUrl || !["localhost", "127.0.0.1"].includes(authUrl.hostname)) return [];
    const alternateHost = authUrl.hostname === "localhost" ? "127.0.0.1" : "localhost";
    return [{
      source: "/:path*",
      has: [{ type: "host" as const, value: alternateHost.replaceAll(".", "\\.") }],
      destination: `${authUrl.origin}/:path*`,
      permanent: false
    }];
  },
  serverExternalPackages: ["yahoo-finance2"],
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
    ] }, ...['/login/:path*', '/signup/:path*', '/signin/:path*', '/complete-account/:path*', '/workspace/:path*', '/dashboard/:path*', '/admin/:path*', '/account/:path*', '/preview/:path*', '/subscription-success', '/subscription-failed', '/api/:path*'].map(source => ({
      source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]
    }))];
  }
};
export default config;
