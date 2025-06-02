/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    FRESHSERVICE_DOMAIN: process.env.FRESHSERVICE_DOMAIN,
    FRESHSERVICE_API_KEY: process.env.FRESHSERVICE_API_KEY,
  },
  // Disable pre-rendering for development to avoid hydration issues
  experimental: {
    forceSwcTransforms: true,
  },
  // Improve development experience
  ...(process.env.NODE_ENV === 'development' && {
    devIndicators: {
      buildActivityPosition: 'bottom-right',
    },
  }),
}

module.exports = nextConfig 