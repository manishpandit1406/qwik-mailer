"use client";
import { useState, useEffect } from "react";
import { Plus, Award, Trash2, QrCode, Receipt, Ticket, FileText, CreditCard, BarChart2, RefreshCw } from "lucide-react";
import { LogoLoader } from "@/components/LogoLoader";
import Link from "next/link";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
interface Field {
  name: string;
  x: number;
  y: number;
  fontSize: number;
  font: string;
  color: string;
  align: string;
  type?: "text" | "qr";
  size?: number;
}
interface Certificate {
  id: string;
  name: string;
  type?: string;
  fileUrl: string;
  config: Field[];
  createdAt: string;
}

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCerts();
  }, []);
  async function fetchCerts() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/certificates`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("mf_access_token")}`,
        },
      });
      const json = await res.json();
      if (json.success) setCerts(json.data);
    } catch {
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }
  async function deleteCert(id: string) {
    if (!confirm("Delete this document template?")) return;
    await fetch(`${API}/v1/certificates/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("mf_access_token")}`,
      },
    });
    setCerts(certs.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-5 ">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-bl-full -z-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-50/50 to-transparent rounded-tr-full -z-10" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <FileText className="text-indigo-600" size={24} /> Attachments
            </h2>
            <p className="text-sm text-gray-500 mt-1.5 max-w-xl leading-relaxed">
              Generate dynamic attachments like certificates, invoices, and hall tickets — with QR codes and variable substitution.
            </p>
          </div>
          <Link
            href="/dashboard/certificates/builder"
            className="btn-primary flex items-center gap-2 shadow-md shadow-indigo-500/20 whitespace-nowrap"
          >
            <Plus size={16} strokeWidth={2.5} /> New Document
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3 animate-fade-in shadow-sm">
          <div className="p-1 bg-red-100 rounded-lg"><Trash2 size={14} className="text-red-600" /></div>
          <span className="font-medium">{error}</span>
          <button onClick={() => setError("")} className="ml-auto hover:bg-red-100 p-1.5 rounded-lg transition-colors">
            ✕
          </button>
        </div>
      )}

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 stagger-children">
        {" "}
        {loading ? (
          <div className="col-span-full py-20 flex justify-center">
            <LogoLoader fullPage={false} text="Loading documents..." />
          </div>
        ) : certs.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white border border-dashed border-gray-200 rounded-3xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-5 ring-8 ring-indigo-50/50 group-hover:scale-110 transition-transform duration-500">
                <FileText size={32} className="text-indigo-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No documents found</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed">
                You haven't created any document templates yet. Start by creating a certificate or document.
              </p>
              <Link
                href="/dashboard/certificates/builder"
                className="btn-primary inline-flex items-center gap-2 shadow-md shadow-indigo-500/20"
              >
                <Plus size={16} strokeWidth={2.5} /> Create Document
              </Link>
            </div>
          </div>
        ) : (
          certs.map((cert) => {
            const hasQR = cert.config?.some((f) => f.type === "qr");
            return (
              <div
                key={cert.id}
                className="glass-card p-5 group flex flex-col justify-between animate-fade-up relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-500/10 hover:border-gray-300 transition-all duration-300 bg-white"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-50 to-white border border-gray-200 text-gray-700 shadow-sm">
                      <Award size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/dashboard/certificates/builder?id=${cert.id}`}
                        className="p-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                        onClick={() => deleteCert(cert.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1 relative">
                    {cert.name}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mb-2 mt-2 relative">
                    <span className="text-xs px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-full font-medium">
                      {cert.config?.length ?? 0} fields
                    </span>
                    {hasQR && (
                      <span className="text-xs px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-full flex items-center gap-1 font-medium">
                        <QrCode size={10} /> QR
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-gray-100 relative">
                  <a
                    href={`${API}${cert.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
                  >
                    View Base PDF →
                  </a>
                </div>
              </div>
            );
          })
        )}{" "}
      </div>{" "}
    </div>
  );
}
