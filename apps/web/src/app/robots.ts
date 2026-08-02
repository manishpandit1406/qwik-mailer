import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/admin/', '/api/', '/_next/', '/forgot-password', '/reset-password', '/verify-email'],
    },
    sitemap: 'https://qwikmailer.in/sitemap.xml',
  };
}
