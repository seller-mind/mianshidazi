import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/profile', '/report', '/payment/'],
      },
    ],
    sitemap: 'https://www.mianshidazi.com/sitemap.xml',
  };
}
