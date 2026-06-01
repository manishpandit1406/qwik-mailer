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
const DOC_TYPES = [
  { value: "certificate", label: "Certificate", icon: Award },
  { value: "invoice", label: "Invoice", icon: Receipt },
  { value: "hall_ticket", label: "Hall Ticket", icon: Ticket },
  { value: "offer_letter", label: "Offer Letter", icon: FileText },
  { value: "id_card", label: "ID Card", icon: CreditCard },
  { value: "report", label: "Report", icon: BarChart2 },
];
export default function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all");
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
  const filteredCerts =
    filterType === "all"
      ? certs
      : certs.filter((c) => (c.type ?? "certificate") === filterType);
  return (
    <div className="space-y-5 animate-fade-in">
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2
            className="text-xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Attachments
          </h2>{" "}
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {" "}
            Generate dynamic attachments like certificates, invoices, and hall
            tickets — with QR codes and variable substitution.{" "}
          </p>{" "}
        </div>{" "}
        <Link
          href="/dashboard/certificates/builder"
          className="btn-primary flex items-center gap-2"
        >
          {" "}
          <Plus size={14} /> New Document{" "}
        </Link>{" "}
      </div>{" "}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          {" "}
          {error}{" "}
          <button onClick={() => setError("")} className="ml-auto">
            ✕
          </button>{" "}
        </div>
      )}{" "}
      {/* Type Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border shadow-sm ${filterType === "all" ? "bg-gray-800 text-white border-gray-800" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
        >
          All ({certs.length})
        </button>
        {DOC_TYPES.map((t) => {
          const count = certs.filter(
            (c) => (c.type ?? "certificate") === t.value,
          ).length;
          if (count === 0) return null;
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border shadow-sm ${filterType === t.value ? "bg-gray-800 text-white border-gray-800" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}
            >
              <Icon size={14} className={filterType === t.value ? "text-gray-300" : "text-gray-400"} />
              {t.label} ({count})
            </button>
          );
        })}
      </div>
      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 stagger-children">
        {" "}
        {loading ? (
          <div className="col-span-full">
            <LogoLoader fullPage text="Loading..." />
          </div>
        ) : filteredCerts.length === 0 ? (
          <div className="md:col-span-3 py-12 text-center glass-card">
            {" "}
            <Award size={32} className="mx-auto mb-3 text-indigo-300" />{" "}
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              No documents yet
            </p>{" "}
            <p
              className="text-xs mt-1 mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              Create your first dynamic PDF template.
            </p>{" "}
            <Link
              href="/dashboard/certificates/builder"
              className="btn-primary mx-auto inline-flex items-center gap-2"
            >
              {" "}
              <Plus size={14} /> Create Document{" "}
            </Link>{" "}
          </div>
        ) : (
          filteredCerts.map((cert) => {
            const docTypeInfo = DOC_TYPES.find((t) => t.value === (cert.type ?? "certificate")) ?? DOC_TYPES[0];
            const Icon = docTypeInfo.icon;
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
                      <Icon size={18} strokeWidth={2.5} />
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
                  <p className="text-xs mb-3 text-gray-500 relative">
                    {docTypeInfo.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2 relative">
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
