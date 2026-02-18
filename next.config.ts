import type { NextConfig } from 'next'

const isReactCompilerEnabled = process.env.REACT_COMPILER === 'true'

const nextConfig: NextConfig = {
  reactCompiler: isReactCompilerEnabled,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
