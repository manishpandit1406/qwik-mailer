"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import Head from "next/head";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const FORMS_URL = process.env.NEXT_PUBLIC_FORMS_URL ?? "https://forms.qwikmailer.in";

// Font family → Google Fonts URL slug mapping
const GOOGLE_FONTS: Record<string, string> = {
  Inter: "Inter:wght@400;500;600;700",
  Poppins: "Poppins:wght@400;500;600;700",
  "Space Grotesk": "Space+Grotesk:wght@400;500;600;700",
  Lato: "Lato:wght@400;700",
  "DM Sans": "DM+Sans:wght@400;500;600;700",
};

export default function HostedFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isPreview = searchParams.get("preview") === "true";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const fontInjectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (id) fetchForm();
  }, [id]);

  // Inject Google Font dynamically when design.fontFamily changes
  useEffect(() => {
    if (!form?.design?.fontFamily) return;
    const family = form.design.fontFamily as string;
    if (fontInjectedRef.current === family) return;
    const slug = GOOGLE_FONTS[family];
    if (!slug) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${slug}&display=swap`;
    document.head.appendChild(link);
    fontInjectedRef.current = family;
  }, [form?.design?.fontFamily]);

  async function fetchForm() {
    try {
      let sessionId = typeof window !== "undefined"
        ? sessionStorage.getItem(`qm_form_session_${id}`)
        : null;
      if (!sessionId && typeof window !== "undefined") {
        sessionId =
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem(`qm_form_session_${id}`, sessionId);
      }

      const queryParams = new URLSearchParams();
      if (isPreview) queryParams.append("preview", "true");
      if (sessionId) queryParams.append("sessionId", sessionId);

      const res = await fetch(
        `${API}/v1/forms/${id}/public?${queryParams.toString()}`
      );
      const json = await res.json();
      if (json.success) {
        setForm(json.data);
      } else {
        setError(json.error || "Form not found");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API}/v1/forms/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formData }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem(`qm_form_session_${id}`);
        }
      } else {
        setError(json.error || "Failed to submit form");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleInputChange(name: string, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleCheckboxChange(name: string, value: string, checked: boolean) {
    setFormData((prev) => {
      const current = Array.isArray(prev[name]) ? prev[name] : [];
      return {
        ...prev,
        [name]: checked
          ? [...current, value]
          : current.filter((v: string) => v !== value),
      };
    });
  }

  // ── Derive styling from design object ──────────────────────────────────────

  function getBgStyle(design: any): React.CSSProperties {
    const bgType = design?.bgType ?? "solid";
    if (bgType === "gradient" && design?.bgGradient) {
      return { background: design.bgGradient };
    }
    if (bgType === "image" && design?.bgImageUrl) {
      return {
        backgroundImage: `url(${design.bgImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    // solid (default) — fallback to light gray if no color set
    return { backgroundColor: design?.bgColor || "#f9fafb" };
  }

  function getCardClass(cardStyle: string | undefined) {
    if (cardStyle === "fullscreen") return "w-full min-h-screen p-8 sm:p-14";
    if (cardStyle === "minimal")
      return "bg-white/70 backdrop-blur-sm p-6 sm:p-10 rounded-2xl shadow-sm border border-white/60 max-w-lg w-full";
    // default: card
    return "bg-white p-6 sm:p-10 rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full";
  }

  function getAccent(design: any) {
    return design?.accentColor || design?.buttonColor || "#4f46e5";
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-gray-400" size={24} />
          <div className="space-y-2 w-72">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-11 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error (no form) ────────────────────────────────────────────────────────

  if (error && !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Form Unavailable</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const { design = {}, schema = [], settings = {} } = form ?? {};
  const fontFamily = design.fontFamily || "Inter";
  const accentColor = getAccent(design);
  const cardStyle = design.cardStyle || "card";
  const bgStyle = getBgStyle(design);
  const cardClass = getCardClass(cardStyle);
  const isFullscreen = cardStyle === "fullscreen";

  // ── Success ────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ ...bgStyle, fontFamily }}>
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full text-center animate-fade-up">
          {/* Animated checkmark */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}18` }}
            >
              <CheckCircle2 size={40} style={{ color: accentColor }} />
            </div>
            {/* Ping rings */}
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ backgroundColor: accentColor }}
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {settings?.successTitle || "You're all set!"}
          </h2>
          <p className="text-gray-500">
            {settings?.successMessage || "Thank you for your submission."}
          </p>
          <a
            href={`${FORMS_URL}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-8 text-xs text-gray-300 hover:text-gray-500 transition-colors"
          >
            Powered by <b>QwikForms</b>
          </a>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Dynamic meta tags */}
      {design.title && (
        <title>{design.title}</title>
      )}

      <div
        className="min-h-screen flex items-center justify-center p-4 sm:p-8"
        style={{ ...bgStyle, fontFamily }}
      >
        <div className={isFullscreen ? "w-full max-w-lg mx-auto" : cardClass}>
          {/* Form header */}
          {design.title && (
            <h1
              className="text-3xl font-bold text-gray-900 mb-3 animate-fade-up"
              style={{ animationDelay: "0ms" }}
            >
              {design.title}
            </h1>
          )}
          {design.description && (
            <p
              className="text-gray-500 mb-8 leading-relaxed animate-fade-up"
              style={{ animationDelay: "40ms" }}
            >
              {design.description}
            </p>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {schema.map((field: any, idx: number) => (
              <div
                key={field.id}
                className="animate-fade-up"
                style={{ animationDelay: `${80 + idx * 50}ms` }}
              >
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {field.label}{" "}
                  {field.required && <span style={{ color: accentColor }}>*</span>}
                </label>

                {field.type === "textarea" ? (
                  <textarea
                    name={field.name}
                    required={field.required}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white transition-all min-h-[100px] text-sm text-gray-900 placeholder:text-gray-400"
                    style={{ "--tw-ring-color": accentColor } as any}
                    placeholder={field.placeholder || field.label}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    onFocus={(e) => {
                      e.target.style.borderColor = accentColor;
                      e.target.style.boxShadow = `0 0 0 2px ${accentColor}22`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "";
                      e.target.style.boxShadow = "";
                    }}
                  />
                ) : field.type === "select" ? (
                  <select
                    name={field.name}
                    required={field.required}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white transition-all text-sm text-gray-900"
                    value={formData[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    onFocus={(e) => {
                      e.target.style.borderColor = accentColor;
                      e.target.style.boxShadow = `0 0 0 2px ${accentColor}22`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "";
                      e.target.style.boxShadow = "";
                    }}
                  >
                    <option value="">Select an option</option>
                    {(field.options || []).map((opt: string, i: number) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === "radio" ? (
                  <div className="space-y-2">
                    {(field.options || []).map((opt: string, i: number) => (
                      <label
                        key={i}
                        className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors group"
                      >
                        <input
                          type="radio"
                          name={field.name}
                          required={field.required}
                          value={opt}
                          checked={formData[field.name] === opt}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          className="w-4 h-4"
                          style={{ accentColor }}
                        />
                        <span className="text-sm font-medium text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : field.type === "checkbox" ? (
                  <div className="space-y-2">
                    {(field.options || []).map((opt: string, i: number) => (
                      <label
                        key={i}
                        className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <input
                          type="checkbox"
                          name={`${field.name}[]`}
                          value={opt}
                          checked={(formData[field.name] || []).includes(opt)}
                          onChange={(e) =>
                            handleCheckboxChange(field.name, opt, e.target.checked)
                          }
                          className="w-4 h-4 rounded"
                          style={{ accentColor }}
                        />
                        <span className="text-sm font-medium text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : field.type === "range" ? (
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <input
                      type="range"
                      name={field.name}
                      required={field.required}
                      min="1"
                      max="10"
                      className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                      style={{ accentColor }}
                      value={formData[field.name] || "5"}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                    />
                    <span
                      className="w-9 h-9 flex items-center justify-center font-bold rounded-lg text-sm shrink-0 text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      {formData[field.name] || "5"}
                    </span>
                  </div>
                ) : (
                  <input
                    type={field.type}
                    name={field.name}
                    required={field.required}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white transition-all text-sm text-gray-900 placeholder:text-gray-400"
                    placeholder={field.placeholder || field.label}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    onFocus={(e) => {
                      e.target.style.borderColor = accentColor;
                      e.target.style.boxShadow = `0 0 0 2px ${accentColor}22`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "";
                      e.target.style.boxShadow = "";
                    }}
                  />
                )}
              </div>
            ))}

            <div
              className="pt-2 animate-fade-up"
              style={{ animationDelay: `${80 + schema.length * 50}ms` }}
            >
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-0.5"
                style={{
                  backgroundColor: design.buttonColor || accentColor,
                  color: design.buttonTextColor || "#ffffff",
                }}
              >
                {submitting && <RefreshCw size={18} className="animate-spin" />}
                {submitting ? "Submitting..." : design.buttonText || "Submit"}
              </button>
            </div>
          </form>

          {/* Branding badge */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <a
              href={FORMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 font-medium hover:text-gray-600 transition-colors"
            >
              Powered by <b>QwikForms</b>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
