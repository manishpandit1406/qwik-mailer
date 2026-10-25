import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Septet Labs — Architecting the Unseen",
  description:
    "An elite 7-member deep-tech squad building autonomous systems, AI-driven solutions, and zero-to-one startups through relentless execution.",
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
    type: "website",
  },
};

export default function SeptetLabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
