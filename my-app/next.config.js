/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
        has: [
          {
            type: 'header',
            key: 'content-type',
            value: '(.*)'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
