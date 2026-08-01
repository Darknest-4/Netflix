import type { NextConfig } from 'next';

/**
 * Next.js configuration.
 *
 * `@nova/shared` ships TypeScript-compiled CommonJS from the workspace, so it is
 * transpiled here instead of being treated as an external package. The security
 * headers apply to every route and are the same set the CDN enforces in
 * production.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@nova/shared'],
  compress: true,
  images: {
    // Artwork is generated in the browser from gradients, so the optimiser only
    // ever handles the few static brand assets.
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['@nova/shared'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
