import type { Metadata } from "next";
import "./globals.css";
import { FetchInterceptor } from "../components/FetchInterceptor";
export const metadata: Metadata = {
  title: {
    default: "Qwik Mailer — AI-Native Email Delivery Platform",
    template: "%s | Qwik Mailer",
  },
  description:
    "Email infrastructure made easy. Perfect for developers, startup founders, creators, and anyone running a hackathon. Get intelligent deliverability and AI spam protection with just a 10-minute setup.",
  keywords: [
    "email API",
    "transactional email",
    "SMTP",
    "email delivery",
    "email infrastructure",
    "developer email",
  ],
  openGraph: {
    title: "Qwik Mailer — AI-Native Email Delivery Platform",
    description:
      "Fast, affordable, developer-friendly email infrastructure with modern APIs and intelligent deliverability.",
    type: "website",
    locale: "en_US",
  },
  robots: { index: true, follow: true },
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
      </body>
    </html>
  );
}
