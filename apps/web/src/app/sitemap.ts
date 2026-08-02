import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://qwikmailer.in';
  
  // Base routes of the application
  const routes = [
    '',
    '/features',
    '/pricing',
    '/docs',
    '/blog',
    '/login',
    '/register',
    '/contact',
    '/about',
    '/terms',
    '/privacy',
    '/dpa',
    '/cookie'
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString().split('T')[0],
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  return routes;
}
