/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable x-powered-by header to avoid leaking framework info
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          // Prevent clickjacking by disallowing framing
          { key: 'X-Frame-Options', value: 'DENY' },
          // Block MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Enable XSS filter in older browsers
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Control referrer leakage
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Enforce HTTPS for 1 year including subdomains
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // Restrict browser features/permissions
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          // Content Security Policy — whitelist only trusted sources
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requires these for dev/hydration
              "style-src 'self' 'unsafe-inline'",  // Tailwind injects inline styles
              "img-src 'self' data: blob: https://*.amazonaws.com",
              "font-src 'self'",
              "connect-src 'self' https://*.amazonaws.com https://*.amazoncognito.com https://cognito-idp.*.amazonaws.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://*.amazoncognito.com",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
