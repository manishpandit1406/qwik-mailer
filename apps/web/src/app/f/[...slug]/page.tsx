"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Star,
  Calendar,
  Clock,
  Phone,
  Link2,
  Layers,
  ChevronRight,
  ChevronLeft,
  UploadCloud,
  FileText,
  X,
  ExternalLink,
  Lock,
  PenTool,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.qwikmailer.in";
const FORMS_URL = process.env.NEXT_PUBLIC_FORMS_URL || "https://forms.qwikmailer.in";
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

interface FormSection {
  index: number;
  id: string;
  title: string;
  description?: string;
  fields: any[];
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024 * 1024 && bytes % (1024 * 1024 * 1024) === 0) {
    return `${bytes / (1024 * 1024 * 1024)} GB`;
  }
  if (bytes >= 1024 * 1024 && bytes % (1024 * 1024) === 0) {
    return `${bytes / (1024 * 1024)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
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

function SignatureField({
  value,
  onChange,
  accentColor,
}: {
  value?: string;
  onChange: (dataUrl: string) => void;
  accentColor: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(!!value);

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCoordinates(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-dashed border-gray-300 rounded-2xl bg-white overflow-hidden shadow-2xs hover:border-gray-400 transition-colors">
        <canvas
          ref={canvasRef}
          width={500}
          height={160}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-36 touch-none cursor-crosshair block"
        />
        {!hasDrawn && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-400 text-xs gap-1.5">
            <PenTool size={13} className="text-gray-400" />
            <span>Draw your signature here with touch or mouse</span>
          </div>
        )}
        <div className="absolute bottom-6 left-6 right-6 border-b border-gray-200 pointer-events-none"></div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-400">Digital verification of submission</span>
        {hasDrawn && (
          <button
            type="button"
            onClick={clearSignature}
            className="text-xs text-red-600 hover:text-red-700 font-medium py-0.5 px-2 rounded-md hover:bg-red-50 transition-colors"
          >
            Clear signature
          </button>
        )}
      </div>
    </div>
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
  // Track per-field upload state: { [fieldKey]: "idle" | "uploading" | "done" | "error" }
  const [fileUploadState, setFileUploadState] = useState<Record<string, "idle" | "uploading" | "done" | "error">>({});
  const [hoverRating, setHoverRating] = useState<Record<string, number>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const [form, setForm] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const fontInjectedRef = useRef<string | null>(null);

  const isSeptet = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.location.hostname.includes("septetlabs") ||
      window.location.pathname.includes("septet") ||
      id === "ab27b2af-2811-4ad1-8c62-1aaa1523d27c" ||
      form?.design?.theme === "septet-labs"
    );
  }, [id, form?.design?.theme]);

  // Suppress cookie banner on form pages
  useEffect(() => {
    document.body.classList.add("no-cookie-banner");
    return () => {
      document.body.classList.remove("no-cookie-banner");
    };
  }, []);

  // Set tab title and favicon dynamically (custom brand / Septet Labs support)
  useEffect(() => {
    if (isSeptet) {
      document.title =
        form?.design?.title ||
        form?.title ||
        "Septet Labs — Remote Internship Application";

      const existingIcons = document.querySelectorAll("link[rel*='icon']");
      existingIcons.forEach((el) => el.setAttribute("href", "/septet-logo.png"));
      if (existingIcons.length === 0) {
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = "/septet-logo.png";
        document.head.appendChild(link);
      }
    } else if (form) {
      const title = form?.design?.title || form?.title;
      if (title) {
        document.title = `${title} | QwikForms`;
      }
      if (form?.design?.logoUrl) {
        const existingIcons = document.querySelectorAll("link[rel*='icon']");
        existingIcons.forEach((el) => el.setAttribute("href", form.design.logoUrl));
      }
    }
  }, [form, id, isSeptet]);

  // Form respondent state (Isolated to this form only - does NOT authenticate to platform)
  const [respondent, setRespondent] = useState<FormRespondent | null>(null);

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
            recordGoogleView(parsed.email);
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
    const isGoogleRequired = form ? form.settings?.requireGoogleAuth !== false : false;
    if (!isGoogleRequired || respondent || typeof window === "undefined") return;

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
  }, [form, respondent]);

  function setupGsiButton() {
    if (typeof window === "undefined" || !(window as any).google?.accounts?.id || !GOOGLE_CLIENT_ID) return;

    try {
      (window as any).google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        auto_select: false,
        cancel_on_tap_outside: true,
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
        const containerWidth = Math.min(280, container.clientWidth || 280);
        (window as any).google.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          width: Math.max(220, containerWidth),
          text: "continue_with",
          shape: "pill",
        });
      }
    } catch {
      // Non-fatal if GSI fails
    }
  }

  function recordGoogleView(email: string) {
    if (!id || !email) return;
    try {
      fetch(`${API}/v1/forms/${id}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respondentEmail: email }),
      }).catch(() => {});
    } catch {}
  }

  function saveRespondent(resp: FormRespondent) {
    setRespondent(resp);
    try {
      localStorage.setItem(`qm_form_respondent_${id}`, JSON.stringify(resp));
    } catch {}
    if (resp.email) {
      recordGoogleView(resp.email);
    }
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
      try {
        (window as any).google.accounts.id.prompt();
      } catch {}
    }
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
      if (respondent?.email) queryParams.append("respondentEmail", respondent.email);

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

  // ── Multi-Step Section Computation ──────────────────────────────────────────
  const sections: FormSection[] = useMemo(() => {
    if (!form?.schema || form.schema.length === 0) return [];
    const rawSchema: any[] = form.schema;
    const hasSectionBreaks = rawSchema.some((f: any) => f.type === "section");

    if (!hasSectionBreaks) {
      // Single-page form
      return [
        {
          index: 0,
          id: "section_0",
          title: form?.design?.title || "",
          description: form?.design?.description || "",
          fields: rawSchema.filter((f: any) => f.type !== "section"),
        },
      ];
    }

    const res: FormSection[] = [];
    let currentTitle = form?.design?.title || "";
    let currentDesc = form?.design?.description || "";
    let currentId = "section_0";
    let currentFields: any[] = [];

    for (let i = 0; i < rawSchema.length; i++) {
      const item = rawSchema[i];
      if (item.type === "section") {
        if (i === 0) {
          // If first item is a section, it configures Section 1
          currentTitle = item.title || item.label || currentTitle;
          currentDesc = item.description || currentDesc;
          currentId = item.id;
        } else {
          res.push({
            index: res.length,
            id: currentId,
            title: currentTitle,
            description: currentDesc,
            fields: currentFields,
          });
          currentId = item.id;
          currentTitle = item.title || item.label || `Section ${res.length + 1}`;
          currentDesc = item.description || "";
          currentFields = [];
        }
      } else {
        currentFields.push(item);
      }
    }

    res.push({
      index: res.length,
      id: currentId,
      title: currentTitle,
      description: currentDesc,
      fields: currentFields,
    });

    return res;
  }, [form?.schema, form?.design?.title, form?.design?.description]);

  const activeSection: FormSection | undefined = sections[currentStep] || sections[0];
  const isMultiStep = sections.length > 1;

  function validateCurrentSection(): boolean {
    if (!activeSection) return true;
    for (const field of activeSection.fields) {
      const fieldKey = field.label || field.name;
      const val = formData[fieldKey];

      // 1. File upload in-progress check
      if (field.type === "file" && fileUploadState[fieldKey] === "uploading") {
        setError(`Please wait for "${field.label || 'file'}" to finish uploading.`);
        return false;
      }

      // 2. Required field check
      if (field.required) {
        if (
          val === undefined ||
          val === null ||
          val === "" ||
          (Array.isArray(val) && val.length === 0)
        ) {
          setError(`Please fill in required question: "${field.label}"`);
          return false;
        }
      }
    }
    setError("");
    return true;
  }

  function handleNextStep(e?: React.MouseEvent) {
    if (e) e.preventDefault();
    if (!validateCurrentSection()) return;

    if (currentStep < sections.length - 1) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handlePrevStep(e?: React.MouseEvent) {
    if (e) e.preventDefault();
    setError("");
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // If multi-step and not on the last section, proceed to next step
    if (isMultiStep && currentStep < sections.length - 1) {
      handleNextStep();
      return;
    }

    if (!validateCurrentSection()) {
      return;
    }

    const isGoogleRequired = form ? form.settings?.requireGoogleAuth !== false : false;
    if (isGoogleRequired && !respondent) {
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

  function handleInputChange(name: string, value: any) {
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
    if (cardStyle === "fullscreen") return "w-full min-h-screen p-4 sm:p-8 md:p-14";
    if (cardStyle === "minimal")
      return "bg-white/70 backdrop-blur-sm p-4 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl shadow-sm border border-white/60 w-full max-w-xl sm:max-w-2xl lg:max-w-3xl";
    // default: card
    return "bg-white p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-gray-100 w-full max-w-xl sm:max-w-2xl lg:max-w-3xl";
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

  const { design = {}, settings = {} } = form ?? {};
  const fontFamily = design.fontFamily || "Inter";
  const accentColor = getAccent(design);
  const cardStyle = design.cardStyle || "card";
  const bgStyle = getBgStyle(design);
  const cardClass = getCardClass(cardStyle);
  const isFullscreen = cardStyle === "fullscreen";
  const requiresGoogle = form ? form.settings?.requireGoogleAuth !== false : false;

  // ── Success ────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ ...bgStyle, fontFamily }}>
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full text-center animate-fade-up">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}18` }}
            >
              <CheckCircle2 size={40} style={{ color: accentColor }} />
            </div>
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
          {isSeptet ? (
            <a
              href="https://septetlabs.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-8 text-xs text-gray-400 hover:text-black transition-colors"
            >
              Created by <b>Septet Labs</b>
            </a>
          ) : (
            <a
              href={`${FORMS_URL}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-8 text-xs text-gray-300 hover:text-gray-500 transition-colors"
            >
              Powered by <b>QwikForms</b>
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <>
      {design.title && (
        <title>{design.title}</title>
      )}

      <div
        data-qwik-form="true"
        className="min-h-screen flex items-center justify-center p-3 sm:p-6 md:p-8"
        style={{ ...bgStyle, fontFamily }}
      >
        <div className={isFullscreen ? "w-full max-w-xl sm:max-w-2xl lg:max-w-3xl mx-auto" : cardClass}>
          {/* Form Banner - Full uncropped image */}
          {design.bannerUrl && (
            <div className="w-full -mt-2 mb-6 sm:mb-8 overflow-hidden rounded-2xl border border-gray-100 shadow-xs bg-gray-50 flex items-center justify-center animate-fade-up">
              <img
                src={design.bannerUrl}
                alt={design.title || "Form Banner"}
                className="w-full h-auto max-h-[460px] object-contain rounded-2xl block"
              />
            </div>
          )}

          {/* Header Row: Logo & Form Title Side-by-Side (Step 0) */}
          {currentStep === 0 ? (
            <div className="mb-5 sm:mb-6 animate-fade-up">
              <div className="flex items-center gap-3.5 sm:gap-4.5 mb-3 sm:mb-4">
                {(design.logoUrl || isSeptet) && (
                  <div className="shrink-0">
                    <img
                      src={design.logoUrl || "/septet-logo.png"}
                      alt="Logo"
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-contain border border-gray-100 shadow-xs p-1 bg-white"
                    />
                  </div>
                )}
                {design.title && (
                  <h1
                    className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight"
                    style={{ animationDelay: "0ms" }}
                  >
                    {design.title}
                  </h1>
                )}
              </div>

              {design.description && (
                <div
                  className="text-sm sm:text-base text-gray-600 leading-relaxed whitespace-pre-line space-y-2"
                  style={{ animationDelay: "40ms" }}
                >
                  {design.description}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 pb-4 border-b border-gray-100 animate-fade-up">
              {activeSection?.title && (
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1.5">
                  {activeSection.title}
                </h2>
              )}
              {activeSection?.description && (
                <div className="text-xs sm:text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                  {activeSection.description}
                </div>
              )}
            </div>
          )}

          {/* Progress Bar for Multi-Step Sections */}
          {isMultiStep && (
            <div className="mb-6 animate-fade-up">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
                <span className="flex items-center gap-1.5 text-gray-700">
                  <Layers size={13} style={{ color: accentColor }} />
                  Page {currentStep + 1} of {sections.length}
                </span>
                <span className="text-[11px] font-mono text-gray-400">
                  {Math.round(((currentStep + 1) / sections.length) * 100)}% Completed
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${((currentStep + 1) / sections.length) * 100}%`,
                    backgroundColor: accentColor,
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-3.5 sm:p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Form Closed or Already Submitted Message */}
          {form?.isClosed || form?.alreadySubmitted ? (
            <div className="py-10 px-6 text-center animate-fade-up bg-amber-50/60 border border-amber-200/90 rounded-2xl w-full shadow-xs">
              <div className="w-12 h-12 bg-white border border-amber-200 shadow-xs rounded-2xl flex items-center justify-center mx-auto mb-3 text-amber-700">
                <Lock size={22} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1.5">
                {form.alreadySubmitted ? "Response Already Recorded" : "Form Closed"}
              </h2>
              <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                {form.closedMessage || (form.alreadySubmitted ? "You have already submitted a response to this form. Only 1 response is permitted per respondent." : "This form is no longer accepting responses.")}
              </p>
              {respondent && (
                <div className="mt-5 pt-4 border-t border-amber-200/70 inline-flex items-center gap-2 text-xs text-gray-500">
                  <span>Signed in as <strong>{respondent.email}</strong></span>
                  <button
                    type="button"
                    onClick={handleSignOutRespondent}
                    className="text-amber-800 font-semibold underline hover:text-amber-950 ml-1 cursor-pointer"
                  >
                    Switch account
                  </button>
                </div>
              )}
            </div>
          ) : requiresGoogle && !respondent && !isPreview ? (
            <div className="py-5 px-4 sm:px-6 text-center animate-fade-up bg-gray-50/80 border border-gray-200/90 rounded-2xl w-full shadow-xs">
              <div className="w-10 h-10 bg-white border border-gray-200/80 shadow-xs rounded-xl flex items-center justify-center mx-auto mb-2.5">
                <GoogleIcon className="w-5 h-5" />
              </div>

              <h2 className="text-base font-bold text-gray-900 mb-1">
                Sign in with Google to continue
              </h2>
              <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4 leading-normal">
                Your verified Google email will be recorded with your submission.
              </p>

              <div className="flex flex-col items-center justify-center gap-2 w-full">
                <div id="google-gsi-button-container" className="min-h-[40px] w-full max-w-[260px] flex items-center justify-center overflow-hidden">
                  <button
                    type="button"
                    onClick={handleGoogleLoginClick}
                    className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2 bg-white border border-gray-300 hover:border-gray-400 rounded-full text-xs font-semibold text-gray-700 shadow-xs hover:shadow transition-all"
                  >
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                    Continue with Google
                  </button>
                </div>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-gray-200/60 flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
                <span>Form-only authentication</span>
                <span>&bull;</span>
                <span>Does not log into platform</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Google Respondent Banner (Clean, Modern Card with Zero Truncation Glitches) */}
              {requiresGoogle && respondent && (
                <div className="mb-6 p-3 sm:p-3.5 bg-gray-50/90 hover:bg-gray-50 border border-gray-200/90 rounded-2xl flex flex-col xs:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-up transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {respondent.picture ? (
                      <img
                        src={respondent.picture}
                        alt={respondent.name || respondent.email}
                        className="w-9 h-9 rounded-full border border-gray-200 shrink-0 object-cover ring-2 ring-white shadow-xs"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">
                        {(respondent.name || respondent.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-gray-900 font-semibold text-xs sm:text-sm break-all leading-snug">
                          {respondent.email}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <CheckCircle2 size={11} className="text-emerald-600" /> Verified
                        </span>
                      </div>
                      <div className="text-gray-500 text-[11px] mt-0.5">
                        Google account recorded on submission
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOutRespondent}
                    className="self-end xs:self-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/70 border border-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                  >
                    Switch account
                  </button>
                </div>
              )}

              {/* In Preview mode without actual respondent: Show mock verified badge */}
              {requiresGoogle && !respondent && isPreview && (
                <div className="mb-4 p-2.5 bg-gray-50/90 border border-gray-200/80 rounded-xl flex items-center justify-between text-xs animate-fade-up">
                  <div className="flex items-center gap-2">
                    <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] text-gray-600 font-medium">Google Sign-In Enabled</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 font-semibold uppercase">
                    Preview
                  </span>
                </div>
              )}

              {/* Active Section Questions */}
              {(activeSection?.fields || []).map((field: any, idx: number) => (
                <div
                  key={field.id}
                  id={`field-${field.id}`}
                  className="animate-fade-up"
                  style={{ animationDelay: `${80 + idx * 40}ms` }}
                >
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      {field.label}{" "}
                      {field.required && <span style={{ color: accentColor }}>*</span>}
                    </label>
                    {field.helperText && (
                      <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                        {field.helperText.includes("http") ? (
                          field.helperText.split(/(https?:\/\/[^\s]+)/g).map((part: string, idx: number) =>
                            part.startsWith("http") ? (
                              <a
                                key={idx}
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline font-medium inline-flex items-center gap-0.5"
                              >
                                {part} <ExternalLink size={11} className="inline ml-0.5" />
                              </a>
                            ) : (
                              part
                            )
                          )
                        ) : (
                          field.helperText
                        )}
                      </p>
                    )}

                    {/* Signature Field */}
                    {field.type === "signature" ? (
                      <SignatureField
                        value={formData[field.label || field.name] || ""}
                        onChange={(dataUrl) => handleInputChange(field.label || field.name, dataUrl)}
                        accentColor={accentColor}
                      />
                    ) : field.type === "textarea" ? (
                      <textarea
                      name={field.label || field.name}
                      required={field.required}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white transition-all min-h-[100px] text-sm text-gray-900 placeholder:text-gray-400"
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
                    /* 2. Dropdown List */
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
                    /* 3. Multiple Choice Radio */
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
                    /* 4. Checkboxes */
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
                  ) : field.type === "rating" ? (
                    /* 5. Star Rating */
                    <div className="bg-gray-50/80 border border-gray-200/90 rounded-2xl p-4 sm:p-5">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        {[1, 2, 3, 4, 5].map((starNum) => {
                          const fieldKey = field.label || field.name;
                          const currentVal = Number(formData[fieldKey]) || 0;
                          const hovered = hoverRating[fieldKey] || 0;
                          const isFilled = hovered > 0 ? starNum <= hovered : starNum <= currentVal;

                          return (
                            <button
                              key={starNum}
                              type="button"
                              onClick={() => handleInputChange(fieldKey, starNum)}
                              onMouseEnter={() =>
                                setHoverRating((prev) => ({ ...prev, [fieldKey]: starNum }))
                              }
                              onMouseLeave={() =>
                                setHoverRating((prev) => ({ ...prev, [fieldKey]: 0 }))
                              }
                              className="p-1 rounded-lg transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-1"
                              style={{ "--tw-ring-color": accentColor } as any}
                              title={`${starNum} Star${starNum > 1 ? "s" : ""}`}
                            >
                              <Star
                                size={32}
                                className={`transition-colors ${
                                  isFilled
                                    ? "fill-amber-400 text-amber-400 filter drop-shadow-xs"
                                    : "text-gray-300 hover:text-gray-400"
                                }`}
                              />
                            </button>
                          );
                        })}
                        {formData[field.label || field.name] && (
                          <span className="ml-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-2.5 py-1 rounded-full shadow-2xs">
                            {formData[field.label || field.name]} of 5 Stars
                          </span>
                        )}
                      </div>
                    </div>
                  ) : field.type === "range" || field.type === "scale" ? (
                    /* 6. Linear Scale */
                    <div className="bg-gray-50/80 border border-gray-200/90 rounded-2xl p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-2 text-xs font-medium text-gray-500 mb-3 px-1">
                        <span className="text-gray-700 font-semibold">{field.minLabel || "1 - Low"}</span>
                        <span className="text-gray-700 font-semibold">{field.maxLabel || "5 - High"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1 sm:gap-2">
                        {[1, 2, 3, 4, 5].map((num) => {
                          const fieldKey = field.label || field.name;
                          const isSelected = String(formData[fieldKey]) === String(num);
                          return (
                            <label
                              key={num}
                              className={`flex-1 flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-white border-indigo-600 shadow-sm font-bold text-indigo-700 scale-[1.02]"
                                  : "bg-white/80 border-gray-200 hover:border-gray-300 text-gray-700"
                              }`}
                              style={isSelected ? { borderColor: accentColor, color: accentColor } : {}}
                            >
                              <input
                                type="radio"
                                name={fieldKey}
                                value={num}
                                checked={isSelected}
                                onChange={() => handleInputChange(fieldKey, num)}
                                className="sr-only"
                              />
                              <span className="text-base sm:text-lg font-bold">{num}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : field.type === "date" ? (
                    /* 7. Date Picker */
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Calendar size={18} />
                      </div>
                      <input
                        type="date"
                        name={field.label || field.name}
                        required={field.required}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white transition-all text-sm text-gray-900"
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
                    </div>
                  ) : field.type === "time" ? (
                    /* 8. Time Picker */
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Clock size={18} />
                      </div>
                      <input
                        type="time"
                        name={field.label || field.name}
                        required={field.required}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white transition-all text-sm text-gray-900"
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
                    </div>
                  ) : field.type === "tel" ? (
                    /* 9. Phone Number */
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Phone size={18} />
                      </div>
                      <input
                        type="tel"
                        name={field.label || field.name}
                        required={field.required}
                        placeholder={field.placeholder || "+91 98765 43210"}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white transition-all text-sm text-gray-900 placeholder:text-gray-400"
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
                    </div>
                  ) : field.type === "url" ? (
                    /* 10. Website / URL */
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Link2 size={18} />
                      </div>
                      <input
                        type="url"
                        name={field.label || field.name}
                        required={field.required}
                        placeholder={field.placeholder || "https://..."}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white transition-all text-sm text-gray-900 placeholder:text-gray-400"
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
                    </div>
                  ) : field.type === "file" ? (
                    /* 11. File Upload */
                    <div className="space-y-3">
                      <div className="border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl p-5 transition-all bg-gray-50/60 hover:bg-gray-50 flex flex-col items-center justify-center text-center">
                        <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-indigo-600 mb-2 shadow-2xs">
                          <UploadCloud size={20} />
                        </div>
                        <label className="cursor-pointer">
                          <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                            Click to upload
                          </span>{" "}
                          <span className="text-xs text-gray-500">or drag and drop</span>
                          <input
                            type="file"
                            accept={field.accept || ".pdf"}
                            name={field.label || field.name}
                            required={field.required && !formData[field.label || field.name]}
                            disabled={fileUploadState[field.label || field.name] === "uploading"}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              // Parse configured size limits (both min and max)
                              const configuredLimitMb = field.maxSizeMb || (field.helperText?.match(/(\d+)\s*gb/i)?.[1] ? parseInt(field.helperText.match(/(\d+)\s*gb/i)[1], 10) * 1024 : (field.helperText?.match(/(\d+)\s*mb/i)?.[1] ? parseInt(field.helperText.match(/(\d+)\s*mb/i)[1], 10) : 10));
                              const maxSizeBytes = field.maxSizeBytes || (configuredLimitMb * 1024 * 1024);
                              const minSizeBytes = field.minSizeBytes || 0;

                              // 1. Check size limits FIRST (Min and Max)
                              if (minSizeBytes > 0 && file.size < minSizeBytes) {
                                alert(`File size is too small. Minimum required size is ${formatBytes(minSizeBytes)}.`);
                                e.target.value = "";
                                return;
                              }

                              if (file.size > maxSizeBytes) {
                                alert(`File size exceeds maximum allowed limit of ${formatBytes(maxSizeBytes)}.`);
                                e.target.value = "";
                                return;
                              }

                              // 2. Client-side format validation against field.accept
                              if (field.accept && field.accept !== "*" && field.accept.trim() !== "") {
                                const allowedParts = field.accept.split(",").map((p: string) => p.trim().toLowerCase());
                                const lowerName = file.name.toLowerCase();
                                const lowerType = (file.type || "").toLowerCase();
                                const isMatch = allowedParts.some((part: string) => {
                                  if (part === "*") return true;
                                  if (part.startsWith(".")) return lowerName.endsWith(part);
                                  if (part.endsWith("/*")) {
                                    const prefix = part.slice(0, -2);
                                    return lowerType.startsWith(prefix + "/");
                                  }
                                  return lowerType === part;
                                });

                                if (!isMatch) {
                                  alert(`File type not allowed. Please upload a file matching: ${field.accept}`);
                                  e.target.value = "";
                                  return;
                                }
                              }

                              const fieldKey = field.label || field.name;
                              setFileUploadState((prev) => ({ ...prev, [fieldKey]: "uploading" }));
                              try {
                                const base64 = await new Promise<string>((resolve, reject) => {
                                  const reader = new FileReader();
                                  reader.onload = () => resolve(reader.result as string);
                                  reader.onerror = reject;
                                  reader.readAsDataURL(file);
                                });
                                const res = await fetch(`${API}/v1/uploads/submission-file`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    base64,
                                    contentType: file.type || "application/octet-stream",
                                    filename: file.name,
                                    formId: id,
                                    maxSizeMb: configuredLimitMb,
                                    maxSizeBytes,
                                    minSizeBytes,
                                    accept: field.accept || "*",
                                  }),
                                });
                                const json = await res.json();
                                if (json.success && (json.url || json.key)) {
                                  const permanentUrl = json.key
                                    ? `${API}/v1/uploads/file?key=${encodeURIComponent(json.key)}`
                                    : json.url;
                                  handleInputChange(fieldKey, {
                                    name: file.name,
                                    size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                                    type: file.type,
                                    url: permanentUrl,
                                    key: json.key,
                                  });
                                  setFileUploadState((prev) => ({ ...prev, [fieldKey]: "done" }));
                                } else {
                                  setFileUploadState((prev) => ({ ...prev, [fieldKey]: "error" }));
                                  alert(json.error || "File upload failed. Please try again.");
                                  e.target.value = "";
                                }
                              } catch {
                                setFileUploadState((prev) => ({ ...prev, [fieldKey]: "error" }));
                                alert("File upload failed. Please check your connection and try again.");
                                e.target.value = "";
                              }
                            }}
                            className="sr-only"
                          />
                        </label>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Supports: {field.accept || "Any file"} ({field.minSizeBytes && field.minSizeBytes > 0 ? `Min ${formatBytes(field.minSizeBytes)} • ` : ""}Max {formatBytes(field.maxSizeBytes || (field.maxSizeMb ? field.maxSizeMb * 1024 * 1024 : 10 * 1024 * 1024))})
                        </p>
                      </div>

                      {/* Upload in progress */}
                      {fileUploadState[field.label || field.name] === "uploading" && (
                        <div className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-3.5 py-2.5 rounded-xl flex items-center gap-2 animate-pulse">
                          <RefreshCw size={14} className="animate-spin shrink-0 text-indigo-600" />
                          <span>Uploading securely, please wait...</span>
                        </div>
                      )}

                      {/* Uploaded File Pill */}
                      {formData[field.label || field.name]?.name && fileUploadState[field.label || field.name] !== "uploading" && (
                        <div className="text-xs text-emerald-800 bg-emerald-50/90 border border-emerald-200 p-3 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={16} className="text-emerald-600 shrink-0" />
                            <span className="font-semibold truncate">
                              {formData[field.label || field.name].name}
                            </span>
                            <span className="text-[11px] text-emerald-600 font-mono shrink-0">
                              ({formData[field.label || field.name].size})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleInputChange(field.label || field.name, "");
                              setFileUploadState((prev) => ({ ...prev, [field.label || field.name]: "idle" }));
                            }}
                            className="p-1 rounded-md text-emerald-700 hover:text-red-600 hover:bg-emerald-100/60 transition-colors shrink-0"
                            title="Remove file"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Default text, email, number input */
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

              {/* Navigation & Submit Buttons */}
              <div className="pt-4 flex items-center justify-between gap-3 animate-fade-up">
                {isMultiStep && currentStep > 0 ? (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-5 py-3 rounded-xl border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs"
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                ) : (
                  <div />
                )}

                {isMultiStep && currentStep < sections.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 hover:shadow-lg hover:-translate-y-0.5 ml-auto"
                    style={{
                      backgroundColor: design.buttonColor || accentColor,
                      color: design.buttonTextColor || "#ffffff",
                    }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`${
                      isMultiStep ? "px-7 py-3 ml-auto" : "w-full py-3.5"
                    } rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-0.5`}
                    style={{
                      backgroundColor: design.buttonColor || accentColor,
                      color: design.buttonTextColor || "#ffffff",
                    }}
                  >
                    {submitting && <RefreshCw size={16} className="animate-spin" />}
                    {submitting ? "Submitting..." : design.buttonText || "Submit"}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Branding badge */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            {isSeptet ? (
              <a
                href="https://septetlabs.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 font-medium hover:text-black transition-colors"
              >
                Created by <b>Septet Labs</b>
              </a>
            ) : (
              <a
                href={FORMS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 font-medium hover:text-gray-600 transition-colors"
              >
                Powered by <b>QwikForms</b>
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
