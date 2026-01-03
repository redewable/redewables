import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/home.html',
      },
      {
        source: '/onboarding',
        destination: '/onboarding.html',
      },
      {
        source: '/litepaper',
        destination: '/litepaper/index.html',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/home.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/onboarding.html',
        destination: '/onboarding',
        permanent: true,
      },
      {
        source: '/litepaper/index.html',
        destination: '/litepaper',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;