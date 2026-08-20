"use client";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList, ExternalLink } from "lucide-react";

function BuilderRedirect() {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const id = searchParams.get("id");
    const formsUrl = process.env.NEXT_PUBLIC_FORMS_URL || "https://forms.qwikmailer.in";
    if (id) {
      window.location.href = `${formsUrl}/dashboard/builder?id=${id}`;
    } else {
      window.location.href = `${formsUrl}/dashboard`;
    }
  }, [searchParams]);

  return (
    <div className="flex-1 h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
          <ClipboardList size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Redirecting to QwikForms Builder...
        </h2>
        <p className="text-gray-500 text-sm">
          Please wait while we transfer you to the dedicated forms dashboard.
        </p>
      </div>
    </div>
  );
}

export default function BuilderRedirectPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-gray-50"></div>}>
      <BuilderRedirect />
    </Suspense>
  );
}
