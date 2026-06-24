import type {MetadataRoute} from 'next';
import {absoluteUrl} from '@/content/seo/metadata';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/auth', '/account', '/tai-khoan', '/orders', '/don-hang', '/checkout', '/thanh-toan']
    },
    sitemap: absoluteUrl('/sitemap.xml')
  };
}
