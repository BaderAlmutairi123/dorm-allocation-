import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize package imports for better tree-shaking and faster builds
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-label',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      'lucide-react',
    ],
  },
  // Compiler optimizations
  compiler: {
    // Remove console logs in production (optional, can help with bundle size)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Reduce build output verbosity for faster builds
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
