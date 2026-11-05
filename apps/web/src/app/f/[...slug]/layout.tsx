import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || [];
  const isSeptet = slug.some((s) => s.toLowerCase().includes("septet"));
  const isInterview = slug.some((s) => s.toLowerCase().includes("interview"));

  if (isSeptet) {
    const pageTitle = isInterview
      ? "Septet Labs — Schedule Your Interview"
      : "Septet Labs — Remote Internship Application";
    const pageDesc = isInterview
      ? "Choose your preferred interview date and time slot for Septet Labs."
      : "Apply for the Septet Labs Remote Internship & Apprenticeship Program.";

    return {
      title: {
        absolute: pageTitle,
      },
      description: pageDesc,
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
        title: pageTitle,
        description: pageDesc,
        images: ["/septet-logo.png"],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: pageTitle,
        description: pageDesc,
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

