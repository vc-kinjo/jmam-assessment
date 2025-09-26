/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // SWCとfetchの問題を解決
  experimental: {
    forceSwcTransforms: false,
    esmExternals: false,
  },
  
  // SWCの使用を完全に無効化
  swcMinify: false,
  
  // オフライン環境での開発を有効化
  generateEtags: false,
  
  // Compiler options
  compiler: {
    removeConsole: false,
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fix for fetch issues in Docker
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
      };
    }

    return config;
  },

  // Environment variables
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },

  // Output configuration for Docker
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  
  // API rewrites
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://bff:8000/api/v1/:path*',
      },
    ]
  },
}

module.exports = nextConfig