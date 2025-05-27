/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    FRESHSERVICE_DOMAIN: process.env.FRESHSERVICE_DOMAIN,
    FRESHSERVICE_API_KEY: process.env.FRESHSERVICE_API_KEY,
  },
}

module.exports = nextConfig 