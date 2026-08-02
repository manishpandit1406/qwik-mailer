import type { Metadata } from "next";
import "./globals.css";
import { FetchInterceptor } from "../components/FetchInterceptor";
import { CookieBanner } from "../components/CookieBanner";
export const metadata: Metadata = {
  metadataBase: new URL('https://qwikmailer.in'),
  title: {
    default: "Qwik Mailer — AI-Native Email Delivery Platform",
    template: "%s | Qwik Mailer",
  },
  description:
    "Fast, affordable, developer-friendly email infrastructure. Perfect for startups and creators. Get intelligent deliverability and AWS-backed routing with just a 10-minute setup.",
  keywords: [
    "email API",
    "transactional email",
    "SMTP",
    "email delivery",
    "bulk email marketing",
    "AWS SES alternative",
    "developer email API"
  ],
  authors: [{ name: "Qwik Mailer Team" }],
  creator: "Qwik Mailer",
  publisher: "Qwik Mailer",
  openGraph: {
    title: "Qwik Mailer — AI-Native Email Delivery Platform",
    description:
      "Fast, affordable, developer-friendly email infrastructure with modern APIs and intelligent deliverability.",
    url: 'https://qwikmailer.in',
    siteName: 'Qwik Mailer',
    images: [
      {
        url: '/og-image.png', // Assuming you will add an og-image later
        width: 1200,
        height: 630,
        alt: 'Qwik Mailer Dashboard',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qwik Mailer — AI-Native Email Delivery Platform',
    description: 'Fast, affordable, developer-friendly email infrastructure.',
    images: ['/og-image.png'], // Assuming you will add an og-image later
  },
  alternates: {
    canonical: '/',
  },
  robots: { 
    index: true, 
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    }
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        <FetchInterceptor />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
