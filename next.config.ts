import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : null;
const projectRoot = dirname(fileURLToPath(import.meta.url));

function securityHeaders() {
  const supabaseOrigin = supabaseUrl?.origin;
  const siteOrigin = siteUrl?.origin ?? "'self'";
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    `form-action 'self' ${siteOrigin}`,
    "script-src 'self' 'unsafe-inline' https://www.paypal.com https://www.sandbox.paypal.com https://*.paypal.com",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${supabaseOrigin ? ` ${supabaseOrigin}` : ''} https://www.paypalobjects.com https://*.paypal.com`,
    "font-src 'self' data:",
    `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ''} https://www.paypal.com https://www.sandbox.paypal.com https://*.paypal.com`,
    "frame-src https://www.paypal.com https://www.sandbox.paypal.com https://*.paypal.com",
    "upgrade-insecure-requests"
  ].join('; ');

  return [
    {key: 'Content-Security-Policy-Report-Only', value: csp},
    {key: 'X-Content-Type-Options', value: 'nosniff'},
    {key: 'X-Frame-Options', value: 'DENY'},
    {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=(self "https://www.paypal.com")'
    },
    ...(process.env.NODE_ENV === 'production'
      ? [{key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload'}]
      : [])
  ];
}

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders()
      }
    ];
  },
  turbopack: {
    root: projectRoot
  },
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: supabaseUrl.protocol === 'http:' ? 'http' : 'https',
            hostname: supabaseUrl.hostname,
            port: supabaseUrl.port,
            pathname: '/storage/v1/object/public/**'
          }
        ]
      : []
  }
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
