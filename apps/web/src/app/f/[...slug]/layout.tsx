import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || [];
  const isSeptet = slug.some((s) => s.toLowerCase().includes("septet"));

  if (isSeptet) {
    return {
      title: {
        absolute: "Septet Labs — Remote Internship Application",
      },
      description:
        "Apply for the Septet Labs Remote Internship & Apprenticeship Program.",
      icons: {
        icon: [
          { url: "/septet-logo.png", sizes: "32x32", type: "image/png" },
          { url: "/septet-logo.png", sizes: "192x192", type: "image/png" },
          { url: "/septet-logo.png", sizes: "512x512", type: "image/png" },
        ],
        shortcut: "/septet-logo.png",
        apple: "/septet-logo.png",
      },
      openGraph: {
        title: "Septet Labs — Remote Internship Application",
        description:
          "Apply for the Septet Labs Remote Internship & Apprenticeship Program.",
        images: ["/septet-logo.png"],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Septet Labs — Remote Internship Application",
        description:
          "Apply for the Septet Labs Remote Internship & Apprenticeship Program.",
        images: ["/septet-logo.png"],
      },
    };
  }

  return {
    title: {
      default: "Form | QwikForms",
      template: "%s | QwikForms",
    },
  };
}

export default function HostedFormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
