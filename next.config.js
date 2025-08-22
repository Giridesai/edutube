/** @type {import('next').NextConfig} */
const nextConfig = {
  // Move serverComponentsExternalPackages to the root level as per Next.js 15
  serverExternalPackages: ['@prisma/client'],
  // Re-enable strict mode for production
  reactStrictMode: true,
  // Optimize for Netlify deployment
  output: 'standalone',
  // Enable experimental features for better performance
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.netlify.app',
      ]
    }
  },
  // Image optimization
  images: {
    domains: ['i.ytimg.com', 'yt3.ggpht.com'],
    unoptimized: true // Required for Netlify static deployment
  },
  // Environment variables
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  }
}

module.exports = nextConfig
