import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const baseConfig: NextConfig = {
  trailingSlash: false,
  
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: 'http://195.88.211.54/socket.io/:path*', 
      },
      {
        source: '/api/proxy/:path*',
        destination: 'http://195.88.211.54/:path*', 
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.slingacademy.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '*',
      },
      {
        protocol: 'http',
        hostname: '195.88.211.54',
        port: '3001', 
        pathname: '/uploads/**',
      },
    ],
  },
  transpilePackages: ['geist'],
};

export default withSentryConfig(baseConfig, {
  org: process.env.NEXT_PUBLIC_SENTRY_ORG,
  project: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  tunnelRoute: '/monitoring',
  disableLogger: true,
  telemetry: false,
});