import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Septet Labs — Architecting the Unseen",
  },
  description:
    "An elite 7-member deep-tech squad building autonomous systems, AI-driven solutions, and zero-to-one startups through relentless execution.",
  icons: {
    icon: [
      { url: "/septet-logo.png", sizes: "32x32", type: "image/png" },
      { url: "/septet-logo.png", sizes: "192x192", type: "image/png" },
      { url: "/septet-logo.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/septet-logo.png",
    apple: "/septet-logo.png",
  },
  keywords: [
    "Septet Labs",
    "Deep Tech",
    "AI Research",
    "Autonomous Systems",
    "Zero-to-One",
    "AI Startup Lab",
    "High Performance Compute",
  ],
  openGraph: {
    title: "Septet Labs — Architecting the Unseen",
    description:
      "An elite 7-member deep-tech squad building autonomous systems, AI-driven solutions, and zero-to-one startups through relentless execution.",
    images: ["/septet-logo.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Septet Labs — Architecting the Unseen",
    description:
      "An elite 7-member deep-tech squad building autonomous systems, AI-driven solutions, and zero-to-one startups.",
    images: ["/septet-logo.png"],
  },
};

export default function SeptetLabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
