const { withSentryConfig } = require('@sentry/nextjs');
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});


/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'elnlegunapxogcovwqcs.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: true,
    instrumentationHook: true,
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
    ];
  },
};

// module.exports = withSentryConfig(
//   withPWA(nextConfig),
//   {
//     // For all available options, see:
//     // https://github.com/getsentry/sentry-webpack-plugin#options
//     // Suppresses source map uploading logs during build
//     silent: true,
//     org: "rootloom", // TODO: Update with actual org
//     project: "javascript-nextjs", // TODO: Update with actual project
//   },
//   {
//     // For all available options, see:
//     // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
//     // Upload a larger set of source maps for prettier stack traces (increases build time)
//     widenClientFileUpload: true,
//     // Transpiles SDK to be compatible with IE11 (increases bundle size)
//     transpileClientSDK: false,
//     // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
//     tunnelRoute: "/monitoring",
//     // Hides source maps from generated client bundles
//     hideSourceMaps: true,
//     // Automatically tree-shake Sentry logger statements to reduce bundle size
//     disableLogger: true,
//   }
// );

module.exports = withPWA(nextConfig);

