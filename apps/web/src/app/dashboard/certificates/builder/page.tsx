"use client";
import { useState, useEffect, Suspense } from "react";
import {
  Upload,
  RefreshCw,
  X,
  FileText,
  QrCode,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlertTriangle,
  ArrowLeft,
  Award,
  Receipt,
  Ticket,
  CreditCard,
  BarChart2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
const PdfMapper = dynamic(() => import("../PdfMapper"), { ssr: false });
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
const DOC_TYPES = [
  { value: "certificate", label: "Certificate", icon: Award },
  { value: "invoice", label: "Invoice", icon: Receipt },
  { value: "hall_ticket", label: "Hall Ticket", icon: Ticket },
  { value: "offer_letter", label: "Offer Letter", icon: FileText },
  { value: "id_card", label: "ID Card", icon: CreditCard },
  { value: "report", label: "Report", icon: BarChart2 },
];
function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}
function CertificateBuilderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [docType, setDocType] = useState("certificate");
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([
    {
      name: "name",
      x: 200,
      y: 300,
      fontSize: 24,
      font: "HelveticaBold",
      color: "#000000",
      align: "center",
      type: "text",
    },
  ]);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    if (editId) {
      fetchCert(editId);
    }
  }, [editId]);
  async function fetchCert(id: string) {
    try {
      const res = await fetch(`${API}/v1/certificates/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setName(json.data.name);
        setDocType(json.data.type ?? "certificate");
        setPdfUrl(`${API}${json.data.fileUrl}`);
        setFields(
          json.data.config?.length > 0
            ? json.data.config.map((f: any) => ({
                type: "text" as const,
                ...f,
              }))
            : [
                {
                  name: "name",
                  x: 200,
                  y: 300,
                  fontSize: 24,
                  font: "HelveticaBold",
                  color: "#000000",
                  align: "center",
                  type: "text" as const,
                },
              ],
        );
      }
    } catch {
      setError("Failed to load document.");
    } finally {
      setLoading(false);
    }
  }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.type !== "application/pdf") {
        setError("Only PDF files are allowed");
        return;
      }
      setFile(f);
      setPdfUrl(URL.createObjectURL(f));
      setError("");
    }
  }
  async function handleSave() {
    if (!file && !editId) {
      setError("Please upload a PDF template first");
      return;
    }
    if (!name.trim()) {
      setError("Please enter a name for this document");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("type", docType);
      const reqHeaders: Record<string, string> = {
        Authorization: `Bearer ${getToken()}`,
      };
      let reqBody: any;
      if (editId) {
        reqHeaders["Content-Type"] = "application/json";
        reqBody = JSON.stringify({
          name: name.trim(),
          type: docType,
          config: fields,
        });
      } else {
        formData.append("config", JSON.stringify(fields));
        if (file) formData.append("file", file);
        reqBody = formData;
      }
      const res = await fetch(
        editId ? `${API}/v1/certificates/${editId}` : `${API}/v1/certificates`,
        { method: editId ? "PUT" : "POST", headers: reqHeaders, body: reqBody },
      );
      const json = await res.json();
      if (json.success) {
        router.push("/dashboard/certificates");
      } else {
        setError(json.error ?? "Failed to save");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }
  function addField(type: "text" | "qr") {
    const newField: Field =
      type === "qr"
        ? {
            name: `qr_${fields.length + 1}`,
            x: 200,
            y: 350,
            fontSize: 0,
            font: "Helvetica",
            color: "#000000",
            align: "left",
            type: "qr",
            size: 100,
          }
        : {
            name: `var${fields.length + 1}`,
            x: 250,
            y: 350,
            fontSize: 24,
            font: "HelveticaBold",
            color: "#000000",
            align: "center",
            type: "text",
          };
    const newFields = [...fields, newField];
    setFields(newFields);
    setActiveIndex(newFields.length - 1);
  }
  function updateField(key: keyof Field, value: any) {
    const newF = [...fields];
    (newF[activeIndex] as any)[key] = value;
    setFields(newF);
  }
  function removeActiveField() {
    if (fields.length <= 1) return;
    const newF = fields.filter((_, i) => i !== activeIndex);
    setFields(newF);
    setActiveIndex(Math.max(0, activeIndex - 1));
  }
  const activeField = fields[activeIndex];
  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <RefreshCw className="animate-spin text-gray-400" />
      </div>
    );
  }
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -m-6 animate-fade-in bg-white">
      {" "}
      {/* Header */}{" "}
      <div
        className="p-4 bg-white border-b flex items-center justify-between z-20 shadow-sm"
        style={{ borderColor: "var(--border)" }}
      >
        {" "}
        <div className="flex items-center gap-4">
          {" "}
          <Link
            href="/dashboard/certificates"
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            {" "}
            <ArrowLeft size={18} />{" "}
          </Link>{" "}
          <h3
            className="font-bold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            {" "}
            {editId ? "Edit Document Template" : "New PDF Document"}{" "}
          </h3>{" "}
        </div>{" "}
        <div className="flex items-center gap-3">
          {" "}
          {error && (
            <span className="text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle size={13} />
              {error}
            </span>
          )}{" "}
          <button
            className="btn-primary flex items-center gap-2 px-6"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {" "}
            {saving ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : null}{" "}
            {saving
              ? "Saving..."
              : editId
                ? "Update Document"
                : "Save Document"}{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex-1 overflow-hidden flex">
        {" "}
        {/* Left Sidebar */}{" "}
        <div
          className="w-80 border-r flex flex-col overflow-y-auto"
          style={{ borderColor: "var(--border)" }}
        >
          {" "}
          <div className="p-5 space-y-5 flex-1">
            {" "}
            <div>
              {" "}
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-gray-500">
                Name
              </label>{" "}
              <input
                className="input"
                placeholder="e.g. Hackathon Winner"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-gray-500">
                Document Type
              </label>{" "}
              <div className="space-y-1">
                {" "}
                {DOC_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setDocType(t.value)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${docType === t.value ? "border-gray-300 bg-gray-100 text-gray-800 shadow-sm" : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"}`}
                    >
                      <Icon size={14} className={docType === t.value ? "text-gray-700" : "text-gray-400"} />
                      {t.label}
                    </button>
                  );
                })}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-gray-500">
                PDF Template
              </label>{" "}
              {!file && !editId ? (
                <label className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                  {" "}
                  <Upload size={20} className="text-gray-400 mb-2" />{" "}
                  <span className="text-xs font-medium text-gray-500">
                    Upload Blank PDF
                  </span>{" "}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />{" "}
                </label>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-xs shadow-sm">
                  {" "}
                  <span className="truncate flex-1 font-medium">
                    {file?.name ?? "Existing PDF"}
                  </span>{" "}
                  {!editId && (
                    <button
                      onClick={() => {
                        setFile(null);
                        setPdfUrl(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 ml-2"
                    >
                      <X size={14} />
                    </button>
                  )}{" "}
                </div>
              )}{" "}
            </div>{" "}
          </div>{" "}
          {/* Field Editor (only when PDF is loaded) */}{" "}
          {pdfUrl && (
            <div
              className="border-t p-5 space-y-4"
              style={{ borderColor: "var(--border)" }}
            >
              {" "}
              {/* Field switcher */}{" "}
              <div className="flex items-center justify-between">
                {" "}
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Fields ({fields.length})
                </label>{" "}
                <div className="flex gap-1">
                  {" "}
                  <button
                    onClick={() => addField("text")}
                    className="text-[10px] px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 font-medium shadow-sm"
                    title="Add text variable"
                  >
                    {" "}
                    + Text{" "}
                  </button>{" "}
                  <button
                    onClick={() => addField("qr")}
                    className="text-[10px] px-2 py-1 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium flex items-center gap-1"
                    title="Add QR code"
                  >
                    {" "}
                    <QrCode size={10} /> QR{" "}
                  </button>{" "}
                </div>{" "}
              </div>{" "}
              {/* Field tabs */}{" "}
              <div className="flex flex-wrap gap-1.5">
                {" "}
                {fields.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all border ${i === activeIndex ? "bg-gray-800 text-white border-gray-800 shadow-sm" : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white hover:bg-gray-50"}`}
                  >
                    {" "}
                    {f.type === "qr" ? "🔲" : "T"} {f.name}{" "}
                  </button>
                ))}{" "}
              </div>{" "}
              {/* Active field settings */}{" "}
              {activeField && (
                <div className="space-y-4 pt-2">
                  {" "}
                  <div>
                    {" "}
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {" "}
                      {activeField.type === "qr"
                        ? "QR Data Variable"
                        : "Variable Name"}{" "}
                    </label>{" "}
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. name"
                      value={activeField.name}
                      onChange={(e) => updateField("name", e.target.value)}
                    />{" "}
                  </div>{" "}
                  {activeField.type === "qr" ? (
                    <div>
                      {" "}
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        QR Size (px)
                      </label>{" "}
                      <input
                        type="number"
                        className="input"
                        min={50}
                        max={300}
                        value={activeField.size ?? 100}
                        onChange={(e) =>
                          updateField("size", Number(e.target.value))
                        }
                      />{" "}
                      <p className="text-xs text-gray-400 mt-1">
                        {" "}
                        Value of{" "}
                        <code className="bg-gray-100 px-1 rounded">{`{{${activeField.name}}}`}</code>{" "}
                        will be encoded as QR{" "}
                      </p>{" "}
                    </div>
                  ) : (
                    <>
                      {" "}
                      <div className="grid grid-cols-2 gap-3">
                        {" "}
                        <div>
                          {" "}
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Font Size
                          </label>{" "}
                          <input
                            type="number"
                            className="input"
                            value={activeField.fontSize}
                            onChange={(e) =>
                              updateField("fontSize", Number(e.target.value))
                            }
                          />{" "}
                        </div>{" "}
                        <div>
                          {" "}
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Color
                          </label>{" "}
                          <input
                            type="color"
                            className="h-10 w-full rounded cursor-pointer border border-gray-200 p-0.5"
                            value={activeField.color}
                            onChange={(e) =>
                              updateField("color", e.target.value)
                            }
                          />{" "}
                        </div>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Alignment
                        </label>{" "}
                        <div className="flex gap-1">
                          {" "}
                          {(["left", "center", "right"] as const).map((a) => (
                            <button
                              key={a}
                              onClick={() => updateField("align", a)}
                              className={`flex-1 flex items-center justify-center py-2 rounded-lg border transition-all ${activeField.align === a ? "bg-gray-100 border-gray-300 text-gray-800 shadow-sm" : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"}`}
                            >
                              {" "}
                              {a === "left" ? (
                                <AlignLeft size={14} />
                              ) : a === "center" ? (
                                <AlignCenter size={14} />
                              ) : (
                                <AlignRight size={14} />
                              )}{" "}
                            </button>
                          ))}{" "}
                        </div>{" "}
                      </div>{" "}
                      <label className="flex items-center gap-2 cursor-pointer">
                        {" "}
                        <input
                          type="checkbox"
                          checked={activeField.font === "HelveticaBold"}
                          onChange={(e) =>
                            updateField(
                              "font",
                              e.target.checked ? "HelveticaBold" : "Helvetica",
                            )
                          }
                          className="rounded text-gray-800 focus:ring-gray-800"
                        />{" "}
                        <span className="text-sm font-medium text-gray-700">
                          Bold Text
                        </span>{" "}
                      </label>{" "}
                    </>
                  )}{" "}
                  {fields.length > 1 && (
                    <button
                      className="text-xs text-red-500 hover:text-red-700 font-medium pt-2 w-full text-left"
                      onClick={removeActiveField}
                    >
                      {" "}
                      Remove this field{" "}
                    </button>
                  )}{" "}
                </div>
              )}{" "}
            </div>
          )}{" "}
        </div>{" "}
        {/* PDF Canvas */}{" "}
        <div
          className="flex-1 bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden"
          style={{
            backgroundImage: "radial-gradient(#e5e7eb 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          {" "}
          {!pdfUrl ? (
            <div className="text-gray-400 flex flex-col items-center gap-3">
              {" "}
              <FileText size={64} className="opacity-30" />{" "}
              <span className="text-sm font-medium">
                Upload a PDF to start placing fields
              </span>{" "}
            </div>
          ) : (
            <PdfMapper
              pdfUrl={pdfUrl}
              fields={fields}
              activeIndex={activeIndex}
              onSelectField={setActiveIndex}
              onFieldChange={(index, x, y) => {
                const newF = [...fields];
                newF[index].x = x;
                newF[index].y = y;
                setFields(newF);
              }}
            />
          )}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
export default function CertificateBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 flex justify-center">
          <RefreshCw className="animate-spin text-gray-400" />
        </div>
      }
    >
      {" "}
      <CertificateBuilderInner />{" "}
    </Suspense>
  );
}
