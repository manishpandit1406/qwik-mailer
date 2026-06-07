"use client";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { RefreshCw, CheckCircle2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

  useEffect(() => {
    if (id) fetchForm();
  }, [id]);

  async function fetchForm() {
    try {
      // Get or create session ID for unique view tracking (better than just IP)
      let sessionId = typeof window !== 'undefined' ? sessionStorage.getItem(`qm_form_session_${id}`) : null;
      if (!sessionId && typeof window !== 'undefined') {
        sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem(`qm_form_session_${id}`, sessionId);
      }

      const queryParams = new URLSearchParams();
      if (isPreview) queryParams.append("preview", "true");
      if (sessionId) queryParams.append("sessionId", sessionId);

      const res = await fetch(`${API}/v1/forms/${id}/public?${queryParams.toString()}`);
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
      const payload: any = { data: formData };

      const res = await fetch(`${API}/v1/forms/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        // Clear session ID so if they submit another response, it counts as a new view
        if (typeof window !== 'undefined') {
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
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleCheckboxChange(name: string, value: string, checked: boolean) {
    setFormData(prev => {
      const current = Array.isArray(prev[name]) ? prev[name] : [];
      if (checked) {
        return { ...prev, [name]: [...current, value] };
      } else {
        return { ...prev, [name]: current.filter((v: string) => v !== value) };
      }
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Form Unavailable</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const { design, schema, settings } = form;

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full text-center animate-fade-up">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
          <p className="text-gray-500">{settings?.successMessage || "Thank you for your submission."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8">
      <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full">
        {design.title && <h1 className="text-3xl font-bold text-gray-900 mb-3">{design.title}</h1>}
        {design.description && <p className="text-gray-500 mb-8 leading-relaxed">{design.description}</p>}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {schema.map((field: any) => (
            <div key={field.id}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  name={field.name}
                  required={field.required}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all min-h-[100px]"
                  placeholder={field.label}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                />
              ) : field.type === 'select' ? (
                <select
                  name={field.name}
                  required={field.required}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                  value={formData[field.name] || ""}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                >
                  <option value="">Select an option</option>
                  {(field.options || []).map((opt: string, i: number) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'radio' ? (
                <div className="space-y-2">
                  {(field.options || []).map((opt: string, i: number) => (
                    <label key={i} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                      <input 
                        type="radio" 
                        name={field.name} 
                        required={field.required} 
                        value={opt}
                        checked={formData[field.name] === opt}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        className="text-indigo-600 focus:ring-indigo-500 w-4 h-4" 
                      />
                      <span className="text-sm font-medium text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              ) : field.type === 'checkbox' ? (
                <div className="space-y-2">
                  {(field.options || []).map((opt: string, i: number) => (
                    <label key={i} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                      <input 
                        type="checkbox" 
                        name={`${field.name}[]`} 
                        value={opt}
                        checked={(formData[field.name] || []).includes(opt)}
                        onChange={(e) => handleCheckboxChange(field.name, opt, e.target.checked)}
                        className="text-indigo-600 rounded focus:ring-indigo-500 w-4 h-4" 
                      />
                      <span className="text-sm font-medium text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              ) : field.type === 'range' ? (
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <input
                    type="range"
                    name={field.name}
                    required={field.required}
                    min="1"
                    max="10"
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    value={formData[field.name] || "5"}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                  />
                  <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-700 font-bold rounded-lg text-sm shrink-0">
                    {formData[field.name] || "5"}
                  </span>
                </div>
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  required={field.required}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                  placeholder={field.label}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                />
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 mt-8 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-0.5"
            style={{ backgroundColor: design.buttonColor || "#4f46e5", color: design.buttonTextColor || "#ffffff" }}
          >
            {submitting && <RefreshCw size={18} className="animate-spin" />}
            {submitting ? "Submitting..." : (design.buttonText || "Submit")}
          </button>
        </form>
        
        {/* Simple Branding / Badge (Optional) */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <a href="https://qwikmailer.in" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 font-medium hover:text-gray-600 transition-colors">
            Powered by <b>Qwik Mailer</b>
          </a>
        </div>
      </div>
    </div>
  );
}
