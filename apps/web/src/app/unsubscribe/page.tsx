"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MailX, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  useEffect(() => {
    if (!id) {
      setStatus("error");
      return;
    }
    async function doUnsubscribe() {
      try {
        const res = await fetch(`${API}/v1/track/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailId: id }),
        });
        const json = await res.json();
        if (json.success) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch (err) {
        setStatus("error");
      }
    }
    doUnsubscribe();
  }, [id]);
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      {" "}
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-gray-100 p-8 text-center">
        {" "}
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            {" "}
            <Loader2 className="animate-spin text-indigo-500" size={40} />{" "}
            <h2 className="text-xl font-bold text-gray-800">Processing...</h2>{" "}
            <p className="text-sm text-gray-500">
              Please wait while we update your preferences.
            </p>{" "}
          </div>
        )}{" "}
        {status === "success" && (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            {" "}
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
              {" "}
              <CheckCircle2 className="text-emerald-500" size={32} />{" "}
            </div>{" "}
            <h2 className="text-2xl font-bold text-gray-800">
              Unsubscribed Successfully
            </h2>{" "}
            <p className="text-gray-500 mb-4">
              {" "}
              You have been successfully removed from this mailing list. You
              will no longer receive emails from this sender.{" "}
            </p>{" "}
            <p className="text-sm text-gray-400">
              {" "}
              You can now safely close this window.{" "}
            </p>{" "}
          </div>
        )}{" "}
        {status === "error" && (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            {" "}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
              {" "}
              <AlertTriangle className="text-red-500" size={32} />{" "}
            </div>{" "}
            <h2 className="text-2xl font-bold text-gray-800">Invalid Link</h2>{" "}
            <p className="text-gray-500">
              {" "}
              The unsubscribe link appears to be invalid or has already been
              used.{" "}
            </p>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-500" size={40} />
        </div>
      }
    >
      {" "}
      <UnsubscribeContent />{" "}
    </Suspense>
  );
}
