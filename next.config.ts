import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
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
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '55mb'
    }
  }
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
