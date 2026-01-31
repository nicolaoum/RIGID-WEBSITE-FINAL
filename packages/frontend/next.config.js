/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed 'standalone' output for Amplify compatibility
  distDir: '.next',
}

module.exports = nextConfig
