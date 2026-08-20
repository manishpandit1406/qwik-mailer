"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, ExternalLink } from "lucide-react";

export default function FormsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Attempt automatic redirect to the forms subdomain dashboard
    const formsUrl = process.env.NEXT_PUBLIC_FORMS_URL || "https://forms.qwikmailer.in";
    window.location.href = `${formsUrl}/dashboard`;
  }, []);

  return (
    <div className="flex-1 p-4 lg:p-8 flex items-center justify-center">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ClipboardList size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          QwikForms has moved
        </h2>
        <p className="text-gray-500 mb-8">
          We've moved forms to its own dedicated dashboard for a better, more focused experience. You are being redirected automatically...
        </p>
        <button
          onClick={() => {
            const formsUrl = process.env.NEXT_PUBLIC_FORMS_URL || "https://forms.qwikmailer.in";
            window.location.href = `${formsUrl}/dashboard`;
          }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
        >
          Go to QwikForms Dashboard <ExternalLink size={16} />
        </button>
      </div>
    </div>
  );
}
