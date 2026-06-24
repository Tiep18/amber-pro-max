import {sitemapIndexXml} from '@/content/seo/metadata';

export const dynamic = 'force-dynamic';

export function GET() {
  return new Response(sitemapIndexXml(['/sitemaps/en', '/sitemaps/vi']), {
    headers: {
      'content-type': 'application/xml; charset=utf-8'
    }
  });
}
