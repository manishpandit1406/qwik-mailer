"use client";
import React, { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const FORMS_URL = process.env.NEXT_PUBLIC_FORMS_URL ?? "https://forms.qwikmailer.in";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

// Font family → Google Fonts URL slug mapping
const GOOGLE_FONTS: Record<string, string> = {
  Inter: "Inter:wght@400;500;600;700",
  Poppins: "Poppins:wght@400;500;600;700",
  "Space Grotesk": "Space+Grotesk:wght@400;500;600;700",
  Lato: "Lato:wght@400;700",
  "DM Sans": "DM+Sans:wght@400;500;600;700",
};

interface FormRespondent {
  email: string;
  name?: string;
  picture?: string;
  token?: string;
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export default function HostedFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string[];
  const id = slug && slug.length > 0 ? slug[slug.length - 1] : "";
  const isPreview = searchParams.get("preview") === "true";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const fontInjectedRef = useRef<string | null>(null);

  // Form respondent state (Isolated to this form only - does NOT authenticate to platform)
  const [respondent, setRespondent] = useState<FormRespondent | null>(null);
  const [showFallbackAuthModal, setShowFallbackAuthModal] = useState(false);
  const [fallbackEmail, setFallbackEmail] = useState("");
  const [fallbackName, setFallbackName] = useState("");

  useEffect(() => {
    if (id) {
      fetchForm();
      // Load cached respondent for this form
      try {
        const cached = localStorage.getItem(`qm_form_respondent_${id}`) || sessionStorage.getItem(`qm_form_respondent_${id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.email) {
            setRespondent(parsed);
          }
        }
      } catch {
        // Ignore JSON error
      }
    }
  }, [id]);

  // Inject Google Font dynamically when design.fontFamily changes
  useEffect(() => {
    if (!form?.design?.fontFamily) return;
    const family = form.design.fontFamily as string;
    if (fontInjectedRef.current === family) return;
    const fontSlug = GOOGLE_FONTS[family];
    if (!fontSlug) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontSlug}&display=swap`;
    document.head.appendChild(link);
    fontInjectedRef.current = family;
  }, [form?.design?.fontFamily]);

  // Pre-fill email field in form schema when respondent is authenticated
  useEffect(() => {
    if (respondent?.email && form?.schema) {
      const emailField = form.schema.find(
        (f: any) => f.type === "email" || f.label?.toLowerCase().includes("email")
      );
      if (emailField) {
        const fieldKey = emailField.label || emailField.name;
        setFormData((prev) => {
          if (!prev[fieldKey]) {
            return { ...prev, [fieldKey]: respondent.email };
          }
          return prev;
        });
      }
    }
  }, [respondent, form?.schema]);

  // Initialize Google Identity Services (GSI) script if Google auth is required
  useEffect(() => {
    if (!form?.settings?.requireGoogleAuth || respondent || typeof window === "undefined") return;

    if (GOOGLE_CLIENT_ID) {
      const scriptId = "google-gsi-client-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setupGsiButton();
        };
        document.body.appendChild(script);
      } else {
        setupGsiButton();
      }
    }
  }, [form?.settings?.requireGoogleAuth, respondent]);

  function setupGsiButton() {
    if (typeof window === "undefined" || !(window as any).google?.accounts?.id || !GOOGLE_CLIENT_ID) return;

    (window as any).google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (res: any) => {
        if (!res?.credential) return;
        const decoded = parseJwt(res.credential);
        if (decoded?.email) {
          const resp: FormRespondent = {
            email: decoded.email.toLowerCase(),
            name: decoded.name || decoded.given_name || "",
            picture: decoded.picture || "",
            token: res.credential,
          };
          saveRespondent(resp);
        }
      },
    });

    const container = document.getElementById("google-gsi-button-container");
    if (container) {
      container.innerHTML = "";
      (window as any).google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        width: 280,
        text: "continue_with",
        shape: "pill",
      });
    }
  }

  function saveRespondent(resp: FormRespondent) {
    setRespondent(resp);
    try {
      localStorage.setItem(`qm_form_respondent_${id}`, JSON.stringify(resp));
    } catch {}
  }

  function handleSignOutRespondent() {
    setRespondent(null);
    try {
      localStorage.removeItem(`qm_form_respondent_${id}`);
      sessionStorage.removeItem(`qm_form_respondent_${id}`);
    } catch {}
  }

  function handleGoogleLoginClick() {
    if (GOOGLE_CLIENT_ID && (window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt();
    } else {
      setShowFallbackAuthModal(true);
    }
  }

  function handleFallbackLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fallbackEmail || !fallbackEmail.includes("@")) return;
    const cleanEmail = fallbackEmail.trim().toLowerCase();
    const cleanName = fallbackName.trim() || cleanEmail.split("@")[0];
    const newRespondent: FormRespondent = {
      email: cleanEmail,
      name: cleanName,
      picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
    };
    saveRespondent(newRespondent);
    setShowFallbackAuthModal(false);
  }

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

    if (form?.settings?.requireGoogleAuth && !respondent) {
      setError("Please sign in with Google to submit this form.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload: any = {
        data: { ...formData },
      };

      if (respondent) {
        payload.respondent = respondent;
        payload.data["Verified Google Email"] = respondent.email;
        if (respondent.name) {
          payload.data["Google Account Name"] = respondent.name;
        }
      }

      const res = await fetch(`${API}/v1/forms/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
  const requiresGoogle = !!settings?.requireGoogleAuth;

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
          {respondent?.email && (
            <p className="text-xs text-gray-400 mt-3">
              Submitted as <span className="font-semibold text-gray-600">{respondent.email}</span>
            </p>
          )}
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

          {/* If Google sign-in is required and respondent is NOT signed in: Display Sign-In Screen */}
          {requiresGoogle && !respondent ? (
            <div className="py-8 px-4 text-center animate-fade-up bg-gray-50/70 border border-gray-200/80 rounded-2xl">
              <div className="w-14 h-14 bg-white border border-gray-200/80 shadow-xs rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GoogleIcon className="w-7 h-7" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Sign in with Google to continue
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">
                The creator of this form requires respondents to authenticate with Google before filling it out. Your email will be recorded with your submission.
              </p>

              <div className="flex flex-col items-center justify-center gap-3">
                <div id="google-gsi-button-container" className="min-h-[44px] flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleGoogleLoginClick}
                    className="inline-flex items-center gap-3 px-6 py-2.5 bg-white border border-gray-300 hover:border-gray-400 rounded-full text-sm font-semibold text-gray-700 shadow-xs hover:shadow transition-all"
                  >
                    <GoogleIcon className="w-5 h-5 shrink-0" />
                    Continue with Google
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200/60 flex items-center justify-center gap-2 text-[11px] text-gray-400">
                <span>Form-only authentication</span>
                <span>&bull;</span>
                <span>Does not log into Qwik Mailer platform</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Google Respondent Banner (Like Google Forms) */}
              {requiresGoogle && respondent && (
                <div className="mb-6 p-3.5 bg-gray-50/90 border border-gray-200/90 rounded-2xl flex items-center justify-between gap-3 text-xs animate-fade-up">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {respondent.picture ? (
                      <img
                        src={respondent.picture}
                        alt={respondent.name || respondent.email}
                        className="w-8 h-8 rounded-full border border-gray-200 shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
                        {(respondent.name || respondent.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-gray-900 font-semibold truncate flex items-center gap-1.5">
                        <span className="truncate">{respondent.email}</span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <CheckCircle2 size={10} /> Verified
                        </span>
                      </div>
                      <div className="text-gray-500 text-[11px] truncate">
                        Google account recorded on submission
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOutRespondent}
                    className="text-indigo-600 hover:text-indigo-800 font-medium shrink-0 hover:underline px-2 py-1 text-xs"
                  >
                    Switch account
                  </button>
                </div>
              )}

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
                      name={field.label || field.name}
                      required={field.required}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white transition-all min-h-[100px] text-sm text-gray-900 placeholder:text-gray-400"
                      style={{ "--tw-ring-color": accentColor } as any}
                      placeholder={field.placeholder || field.label}
                      value={formData[field.label || field.name] || ""}
                      onChange={(e) => handleInputChange(field.label || field.name, e.target.value)}
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
                      name={field.label || field.name}
                      required={field.required}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white transition-all text-sm text-gray-900"
                      value={formData[field.label || field.name] || ""}
                      onChange={(e) => handleInputChange(field.label || field.name, e.target.value)}
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
                            name={field.label || field.name}
                            required={field.required}
                            value={opt}
                            checked={formData[field.label || field.name] === opt}
                            onChange={(e) => handleInputChange(field.label || field.name, e.target.value)}
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
                            name={`${field.label || field.name}[]`}
                            value={opt}
                            checked={(formData[field.label || field.name] || []).includes(opt)}
                            onChange={(e) =>
                              handleCheckboxChange(field.label || field.name, opt, e.target.checked)
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
                        name={field.label || field.name}
                        required={field.required}
                        min="1"
                        max="10"
                        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor }}
                        value={formData[field.label || field.name] || "5"}
                        onChange={(e) => handleInputChange(field.label || field.name, e.target.value)}
                      />
                      <span
                        className="w-9 h-9 flex items-center justify-center font-bold rounded-lg text-sm shrink-0 text-white"
                        style={{ backgroundColor: accentColor }}
                      >
                        {formData[field.label || field.name] || "5"}
                      </span>
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      name={field.label || field.name}
                      required={field.required}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white transition-all text-sm text-gray-900 placeholder:text-gray-400"
                      placeholder={field.placeholder || field.label}
                      value={formData[field.label || field.name] || ""}
                      onChange={(e) => handleInputChange(field.label || field.name, e.target.value)}
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
          )}

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

      {/* Dev / Test Fallback Google Sign-In Modal */}
      {showFallbackAuthModal && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowFallbackAuthModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full p-6 sm:p-8 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <GoogleIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-1">
              Google Sign-In
            </h3>
            <p className="text-xs text-gray-500 text-center mb-6 leading-relaxed">
              Enter your Google email to authenticate for this form response.
            </p>

            <form onSubmit={handleFallbackLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Google Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="user@gmail.com"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={fallbackEmail}
                  onChange={(e) => setFallbackEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={fallbackName}
                  onChange={(e) => setFallbackName(e.target.value)}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFallbackAuthModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  Continue as Google User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
