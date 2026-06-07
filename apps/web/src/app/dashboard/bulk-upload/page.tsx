"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Mail,
  Eye,
  ChevronRight,
  RotateCcw,
  Download,
  Sparkles,
  Info,
  X,
  Award,
} from "lucide-react";
import * as XLSX from "xlsx";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
interface Recipient {
  name: string;
  email: string;
  [key: string]: string;
}
interface PreviewError {
  row: number;
  reason: string;
  data: Record<string, string>;
}
interface PreviewData {
  total: number;
  valid: number;
  invalid: number;
  recipients: Recipient[];
  errors: PreviewError[];
  columns: string[];
}
interface SendResult {
  batchId?: string;
  queued: number;
  skipped: number;
  total: number;
  skippedDetails: { email: string; reason: string }[];
}
type Step = "upload" | "preview" | "compose" | "sending" | "done";
export default function BulkUploadPage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [lists, setLists] = useState<any[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [textBody, setTextBody] = useState("");
  const [useHtml, setUseHtml] = useState(true);
  const [result, setResult] = useState<SendResult | null>(null);
  const [liveProgress, setLiveProgress] = useState<{ total: number, delivered: number, failed: number, queued: number, sent: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<"recipients" | "errors">(
    "recipients",
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [senders, setSenders] = useState<{ id: string; email: string }[]>([]);
  const [sendersLoaded, setSendersLoaded] = useState(false);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [selectedCertificateId, setSelectedCertificateId] = useState("");
  const [attachments, setAttachments] = useState<{ filename: string; content: string; contentType: string; size: number }[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [isRestoring, setIsRestoring] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    if (attachments.length + files.length > 5) {
      alert("Maximum 5 attachments allowed.");
      return;
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 5MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          const base64 = result.split(',')[1];
          setAttachments(prev => [...prev, {
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            content: base64,
            size: file.size
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("qwikmailer_bulk_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.step) setStep(parsed.step);
        if (parsed.selectedListId) setSelectedListId(parsed.selectedListId);
        if (parsed.preview) setPreview(parsed.preview);
        if (parsed.subject) setSubject(parsed.subject);
        if (parsed.htmlBody) setHtmlBody(parsed.htmlBody);
        if (parsed.textBody) setTextBody(parsed.textBody);
        if (parsed.useHtml !== undefined) setUseHtml(parsed.useHtml);
        if (parsed.fromEmail) setFromEmail(parsed.fromEmail);
        if (parsed.fromName) setFromName(parsed.fromName);
        if (parsed.selectedCertificateId)
          setSelectedCertificateId(parsed.selectedCertificateId);
      }
    } catch (e) {
      console.error("Failed to restore bulk state", e);
    } finally {
      setIsRestoring(false);
    }
  }, []);
  useEffect(() => {
    if (isRestoring) return;
    if (step === "done" || step === "sending") {
      localStorage.removeItem("qwikmailer_bulk_state");
      return;
    }
    const stateToSave = {
      step,
      selectedListId,
      preview,
      subject,
      htmlBody,
      textBody,
      useHtml,
      fromEmail,
      fromName,
      selectedCertificateId,
    };
    localStorage.setItem("qwikmailer_bulk_state", JSON.stringify(stateToSave));
  }, [
    step,
    selectedListId,
    preview,
    subject,
    htmlBody,
    textBody,
    useHtml,
    fromEmail,
    fromName,
    selectedCertificateId,
    isRestoring,
  ]);
  useEffect(() => {
    async function loadData() {
      try {
        const token = localStorage.getItem("mf_access_token");
        fetch(`${API}/v1/templates`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success) setTemplates(json.data);
          })
          .catch(console.error);
        fetch(`${API}/v1/domains/all-senders`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success) {
              setSenders(json.data);
              setSendersLoaded(true);
              if (json.data.length > 0 && !fromEmail) {
                setFromEmail(json.data[0].email);
              }
            }
          })
          .catch(console.error);
        fetch(`${API}/v1/certificates`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success) setCertificates(json.data);
          })
          .catch(console.error);
        fetch(`${API}/v1/lists`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((json) => {
            if (json.success) setLists(json.data);
          })
          .catch(console.error);
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "done" && result?.batchId) {
      const fetchProgress = async () => {
        try {
          const res = await fetch(`${API}/v1/logs/batches`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const json = await res.json();
          if (json.success) {
            const batch = json.data.find((b: any) => b.id === result.batchId);
            if (batch) {
              setLiveProgress({
                total: Number(batch.total) || 0,
                delivered: Number(batch.delivered) || 0,
                failed: Number(batch.failed) || 0,
                queued: Number(batch.queued) || 0,
                sent: Number(batch.sent) || 0,
              });
              if (Number(batch.queued) === 0 && Number(batch.total) >= result.total) {
                 clearInterval(interval);
              }
            }
          }
        } catch (e) {}
      };
      fetchProgress();
      interval = setInterval(fetchProgress, 2000);
    }
    return () => clearInterval(interval);
  }, [step, result]);

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setSubject("");
      setHtmlBody("");
      setTextBody("");
      return;
    }
    const found = templates.find((t) => t.id === templateId);
    if (found) {
      setSubject(found.subject || "");
      setHtmlBody(found.htmlBody || "");
      setTextBody(found.textBody || "");
      setUseHtml(!!found.htmlBody);
    }
  }
  function getToken() {
    return localStorage.getItem("mf_access_token") ?? "";
  }
  const handleFile = useCallback((f: File) => {
    setFile(f);
    setSelectedListId("");
    setError("");
    setPreview(null);
    setStep("upload");
  }, []);
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }
  function downloadSample() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["name", "email", "company"],
      ["Rahul Sharma", "rahul@example.com", "Acme Corp"],
      ["Priya Singh", "priya@example.com", "TechCo"],
      ["Amit Kumar", "amit@example.com", "StartupXYZ"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "sample_contacts.xlsx");
  }
  async function handlePreview() {
    if (!file && !selectedListId) return;
    setLoading(true);
    setError("");
    try {
      let currentListId = selectedListId;
      if (file && !currentListId) {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        const uploadRes = await fetch(`${API}/v1/lists`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: uploadForm,
        });
        if (uploadRes.status === 401) {
          localStorage.removeItem("mf_access_token");
          window.location.href = "/login";
          return;
        }
        const uploadJson = await uploadRes.json();
        if (!uploadJson.success) {
          setError(uploadJson.error ?? "Failed to upload file.");
          setLoading(false);
          return;
        }
        currentListId = uploadJson.data.id;
        setSelectedListId(currentListId);
        setFile(null);
        fetch(`${API}/v1/lists`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
          .then((r) => r.json())
          .then((j) => {
            if (j.success) setLists(j.data);
          });
      }
      const formData = new FormData();
      formData.append("listId", currentListId);
      const res = await fetch(`${API}/v1/bulk-preview`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (res.status === 401) {
        localStorage.removeItem("mf_access_token");
        window.location.href = "/login";
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Failed to parse list.");
        setLoading(false);
        return;
      }
      setPreview(json.data);
      setStep("preview");
    } catch (err) {
      setError("Network error — is the API running?");
    } finally {
      setLoading(false);
    }
  }
  async function handleSend() {
    if (
      !selectedListId ||
      !subject.trim() ||
      (!htmlBody.trim() && !textBody.trim())
    )
      return;
    setLoading(true);
    setError("");
    setStep("sending");
    try {
      const formData = new FormData();
      formData.append("listId", selectedListId);
      if (fromEmail) formData.append("from", fromEmail);
      if (fromName) formData.append("fromName", fromName);
      formData.append("subject", subject);
      formData.append("htmlBody", useHtml ? htmlBody : "");
      formData.append("textBody", useHtml ? "" : textBody);
      if (selectedCertificateId)
        formData.append("certificateId", selectedCertificateId);
      if (attachments.length > 0)
        formData.append("attachments", JSON.stringify(attachments));
      if (isScheduled && scheduledDate)
        formData.append("scheduledAt", new Date(scheduledDate).toISOString());

      const res = await fetch(`${API}/v1/bulk-upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (res.status === 401) {
        localStorage.removeItem("mf_access_token");
        window.location.href = "/login";
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Failed to send.");
        setStep("compose");
        setLoading(false);
        return;
      }
      setResult(json.data);
      setLiveProgress({
        total: json.data.total || 0,
        delivered: 0,
        failed: 0,
        queued: 0,
        sent: 0,
      });
      setStep("done");
    } catch (err) {
      setError("Network error. Please try again.");
      setStep("compose");
    } finally {
      setLoading(false);
    }
  }
  function reset() {
    localStorage.removeItem("qwikmailer_bulk_state");
    setStep("upload");
    setFile(null);
    setSelectedListId("");
    setPreview(null);
    setSubject("");
    setHtmlBody("");
    setTextBody("");
    setResult(null);
    setLiveProgress(null);
    setSelectedTemplateId("");
    setAttachments([]);
    setIsScheduled(false);
    setScheduledDate("");
  }
  return (
    <div className="max-w-4xl mx-auto ">
      {" "}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shrink-0">
            <FileSpreadsheet size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 m-0">
              Bulk Email Upload
            </h2>
            <p className="text-sm text-gray-500 m-0">
              Upload an Excel or CSV file to send personalised emails to thousands of contacts
            </p>
          </div>
        </div>
        
        {step !== "upload" && step !== "done" && (
          <button 
            className="btn-secondary whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2"
            onClick={() => {
              if (confirm("Are you sure you want to cancel the current bulk upload? All progress will be lost.")) {
                reset();
              }
            }}
          >
            <X size={14} /> Cancel Upload
          </button>
        )}
      </div>
      {/* Stepper */}{" "}
      <div className="flex items-center mb-8">
        {" "}
        {(["upload", "preview", "compose", "done"] as const).map((s, i) => {
          const labels = ["Upload File", "Preview", "Compose", "Send"];
          const steps: Step[] = ["upload", "preview", "compose", "done"];
          const idx = steps.indexOf(step);
          const isActive = step === s;
          const isDone = idx > i;
          let circleClasses =
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors";
          if (isDone)
            circleClasses += " bg-emerald-500 border-emerald-500 text-white";
          else if (isActive)
            circleClasses += " bg-indigo-600 border-indigo-600 text-white";
          else circleClasses += " bg-gray-100 border-gray-300 text-gray-400";
          let lineClasses = "flex-1 h-0.5 mx-2 mb-5 transition-colors";
          if (isDone) lineClasses += " bg-emerald-500";
          else lineClasses += " bg-gray-200";
          let textClasses = "text-[11px] whitespace-nowrap";
          if (isActive) textClasses += " text-indigo-600 font-semibold";
          else textClasses += " text-gray-400 font-normal";
          return (
            <div key={s} className="flex items-center flex-1">
              {" "}
              <div className="flex flex-col items-center gap-1.5">
                {" "}
                <div className={circleClasses}>
                  {" "}
                  {isDone ? <CheckCircle2 size={16} /> : i + 1}{" "}
                </div>{" "}
                <span className={textClasses}>{labels[i]}</span>{" "}
              </div>{" "}
              {i < 3 && <div className={lineClasses} />}{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
      {/* Error banner */}{" "}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 mb-6">
          {" "}
          <XCircle size={16} className="text-red-500 shrink-0" />{" "}
          <span className="text-sm text-red-600 flex-1">{error}</span>{" "}
          <button
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            {" "}
            <X size={14} />{" "}
          </button>{" "}
        </div>
      )}{" "}
      {/* ── STEP 1: Upload ── */}{" "}
      {step === "upload" && (
        <div className="flex flex-col gap-5 ">
          {" "}
          {/* Saved Lists Dropdown */}{" "}
          {lists.length > 0 && (
            <div className="p-5 rounded-lg bg-white border border-gray-200 shadow-sm">
              {" "}
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Select an existing list
              </label>{" "}
              <select
                className="input"
                value={selectedListId}
                onChange={(e) => {
                  setSelectedListId(e.target.value);
                  setFile(null);
                }}
              >
                {" "}
                <option value="">-- Choose a saved list --</option>{" "}
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {" "}
                    {list.name} ({list.validEmails} valid emails){" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </div>
          )}{" "}
          {lists.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-gray-400 font-medium">
              {" "}
              <div className="flex-1 h-px bg-gray-200"></div> OR UPLOAD NEW{" "}
              <div className="flex-1 h-px bg-gray-200"></div>{" "}
            </div>
          )}{" "}
          {/* Drop zone */}{" "}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-14 text-center cursor-pointer transition-all ${dragOver ? "border-indigo-500 bg-indigo-50/50" : file ? "border-emerald-500 bg-emerald-50/50" : "border-gray-300 bg-gray-50 hover:bg-gray-100 :bg-gray-800"}`}
          >
            {" "}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />{" "}
            {file ? (
              <>
                {" "}
                <div className="w-14 h-14 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                  {" "}
                  <FileSpreadsheet
                    size={28}
                    className="text-emerald-500"
                  />{" "}
                </div>{" "}
                <p className="text-emerald-600 font-semibold text-base m-0 mb-1">
                  {file.name}
                </p>{" "}
                <p className="text-gray-500 text-sm m-0">
                  {(file.size / 1024).toFixed(1)} KB — click to change
                </p>{" "}
              </>
            ) : (
              <>
                {" "}
                <div className="w-14 h-14 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4">
                  {" "}
                  <Upload size={28} className="text-indigo-600" />{" "}
                </div>{" "}
                <p className="text-gray-900 font-semibold text-base m-0 mb-1.5">
                  Drop your file here
                </p>{" "}
                <p className="text-gray-500 text-sm m-0">
                  or click to browse — .xlsx, .xls, .csv supported
                </p>{" "}
              </>
            )}{" "}
          </div>{" "}
          {/* Format guide */}{" "}
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
            {" "}
            <div className="flex items-start gap-2.5">
              {" "}
              <Info
                size={16}
                className="text-indigo-600 mt-0.5 shrink-0"
              />{" "}
              <div>
                {" "}
                <p className="text-indigo-700 font-semibold text-sm m-0 mb-1.5">
                  Required format
                </p>{" "}
                <p className="text-gray-600 text-sm m-0 mb-2">
                  {" "}
                  Your file must have an{" "}
                  <strong className="text-gray-900">email</strong> column. A{" "}
                  <strong className="text-gray-900">name</strong> column is
                  optional. Any other columns (e.g.{" "}
                  <code className="text-indigo-600 bg-white px-1 py-0.5 rounded">
                    company
                  </code>
                  ,{" "}
                  <code className="text-indigo-600 bg-white px-1 py-0.5 rounded">
                    city
                  </code>
                  ) can be used as personalisation variables in your email body
                  using{" "}
                  <code className="text-indigo-600 bg-white px-1 py-0.5 rounded">{`{{column_name}}`}</code>
                  .{" "}
                </p>{" "}
                <div className="flex gap-2">
                  {" "}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadSample();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-200 border border-indigo-300 text-indigo-700 text-xs font-semibold cursor-pointer hover:bg-indigo-300 :bg-indigo-700 transition-colors"
                  >
                    {" "}
                    <Download size={13} /> Download Sample{" "}
                  </button>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <button
            onClick={handlePreview}
            disabled={(!file && !selectedListId) || loading}
            className={`flex items-center justify-center gap-2 py-3.5 px-8 rounded-xl text-base font-semibold transition-all ${file || selectedListId ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
          >
            {" "}
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                Parsing...
              </>
            ) : (
              <>
                <Eye size={16} /> Preview Recipients
              </>
            )}{" "}
          </button>{" "}
        </div>
      )}{" "}
      {/* ── STEP 2: Preview ── */}{" "}
      {step === "preview" && preview && (
        <div className="flex flex-col gap-5 ">
          {" "}
          {/* Stats */}{" "}
          <div className="grid grid-cols-3 gap-4">
            {" "}
            {[
              {
                label: "Total Rows",
                value: preview.total,
                icon: <FileSpreadsheet size={18} />,
                colorClass: "text-indigo-500",
                borderClass: "border-indigo-500",
              },
              {
                label: "Valid Emails",
                value: preview.valid,
                icon: <CheckCircle2 size={18} />,
                colorClass: "text-emerald-500",
                borderClass: "border-emerald-500",
              },
              {
                label: "Invalid / Skipped",
                value: preview.invalid,
                icon: <AlertTriangle size={18} />,
                colorClass:
                  preview.invalid > 0 ? "text-amber-500" : "text-emerald-500",
                borderClass:
                  preview.invalid > 0
                    ? "border-amber-500"
                    : "border-emerald-500",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-5 rounded-lg bg-white border border-gray-200 shadow-sm relative overflow-hidden"
              >
                {" "}
                <div
                  className={`absolute top-0 left-0 w-1 h-full ${stat.borderClass.replace("border-", "bg-")}`}
                />{" "}
                <div
                  className={`flex items-center gap-2 mb-2 ${stat.colorClass}`}
                >
                  {" "}
                  {stat.icon}{" "}
                  <span className="text-xs font-semibold text-gray-500">
                    {stat.label}
                  </span>{" "}
                </div>{" "}
                <div className={`text-3xl font-extrabold ${stat.colorClass}`}>
                  {stat.value.toLocaleString()}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
          {/* Table tabs */}{" "}
          <div className="rounded-lg bg-white border border-gray-200 overflow-hidden shadow-sm">
            {" "}
            <div className="flex border-b border-gray-200">
              {" "}
              {(["recipients", "errors"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 ${activeTab === tab ? "border-indigo-500 text-indigo-600 bg-indigo-50/50" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 :bg-gray-800"}`}
                >
                  {" "}
                  {tab === "recipients" ? (
                    <>
                      <Users size={14} />
                      Recipients ({preview.valid})
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} />
                      Issues ({preview.invalid})
                    </>
                  )}{" "}
                </button>
              ))}{" "}
            </div>{" "}
            <div style={{ maxHeight: 320, overflowY: "auto", overflowX: "auto" }}>
              {" "}
              {activeTab === "recipients" ? (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        #
                      </th>
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        Name
                      </th>
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        Email
                      </th>
                      {preview.columns
                        .filter(
                          (c) =>
                            ![
                              "name",
                              "Name",
                              "email",
                              "Email",
                              "EMAIL",
                              "NAME",
                              "email_address",
                              "full_name",
                            ].includes(c),
                        )
                        .map((c) => (
                          <th
                            key={c}
                            style={{
                              padding: "10px 16px",
                              textAlign: "left",
                              color: "var(--text-muted)",
                              fontWeight: 600,
                              borderBottom: "1px solid var(--border-subtle)",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {c}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.recipients.slice(0, 100).map((r, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <td
                          style={{
                            padding: "9px 16px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {i + 1}
                        </td>
                        <td
                          style={{
                            padding: "9px 16px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {r.name || "—"}
                        </td>
                        <td style={{ padding: "9px 16px", color: "#818cf8" }}>
                          {r.email}
                        </td>
                        {preview.columns
                          .filter(
                            (c) =>
                              ![
                                "name",
                                "Name",
                                "email",
                                "Email",
                                "EMAIL",
                                "NAME",
                                "email_address",
                                "full_name",
                              ].includes(c),
                          )
                          .map((c) => (
                            <td
                              key={c}
                              style={{
                                padding: "9px 16px",
                                color: "var(--text-muted)",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {r[c] || "—"}
                            </td>
                          ))}
                      </tr>
                    ))}
                    {preview.valid > 100 && (
                      <tr>
                        <td
                          colSpan={10}
                          style={{
                            padding: "10px 16px",
                            color: "var(--text-muted)",
                            fontSize: 12,
                            textAlign: "center",
                          }}
                        >
                          ...and {preview.valid - 100} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : preview.errors.length > 0 ? (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        Row
                      </th>
                      <th
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        Issue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.errors.map((e, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <td style={{ padding: "9px 16px", color: "#f59e0b" }}>
                          Row {e.row}
                        </td>
                        <td
                          style={{
                            padding: "9px 16px",
                            color: "var(--text-muted)",
                          }}
                        >
                          {e.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div
                  style={{ padding: 40, textAlign: "center", color: "#22c55e" }}
                >
                  {" "}
                  <CheckCircle2 size={32} style={{ marginBottom: 8 }} />{" "}
                  <p style={{ margin: 0 }}>No issues found!</p>{" "}
                </div>
              )}{" "}
            </div>{" "}
          </div>{" "}
          <div style={{ display: "flex", gap: 12 }}>
            {" "}
            <button
              onClick={() => setStep("upload")}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: 50,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-muted)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {" "}
              ← Change File{" "}
            </button>{" "}
            <button
              onClick={() => setStep("compose")}
              disabled={preview.valid === 0}
              style={{
                flex: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "13px",
                borderRadius: 50,
                background:
                  preview.valid > 0
                    ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                    : "rgba(255,255,255,0.05)",
                border: "none",
                color: preview.valid > 0 ? "white" : "var(--text-muted)",
                fontSize: 14,
                fontWeight: 600,
                cursor: preview.valid > 0 ? "pointer" : "not-allowed",
              }}
            >
              {" "}
              Compose Email <ChevronRight size={16} />{" "}
            </button>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* ── STEP 3: Compose ── */}{" "}
      {step === "compose" && (
        <div className="glass-card p-6 space-y-5 ">
          {" "}
          {/* Recipients summary */}{" "}
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{
              background: "rgba(16,185,129,0.05)",
              border: "1px solid rgba(16,185,129,0.15)",
            }}
          >
            {" "}
            <Users size={16} className="text-emerald-500" />{" "}
            <span className="text-sm font-semibold text-emerald-600">
              {" "}
              {preview?.valid.toLocaleString()} recipients ready to receive your
              email{" "}
            </span>{" "}
          </div>{" "}
          {/* Personalisation hint */}{" "}
          {preview && preview.columns.length > 0 && (
            <div
              className="p-4 rounded-xl border"
              style={{
                background: "rgba(99,102,241,0.04)",
                borderColor: "rgba(99,102,241,0.15)",
              }}
            >
              {" "}
              <div className="flex items-center gap-1.5 mb-2">
                {" "}
                <Sparkles size={14} className="text-indigo-500" />{" "}
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Personalisation variables available
                </span>{" "}
              </div>{" "}
              <div className="flex gap-2 flex-wrap">
                {" "}
                {preview.columns.map((col) => (
                  <code
                    key={col}
                    className="px-2 py-0.5 rounded text-xs font-mono bg-indigo-50 text-indigo-600 border border-indigo-100"
                  >{`{{${col}}}`}</code>
                ))}{" "}
              </div>{" "}
            </div>
          )}{" "}
          {/* Attachments Section */}{" "}
          <div className="grid grid-cols-2 gap-4">
            {" "}
            {/* Template Selector */}{" "}
            {templates.length > 0 && (
              <div>
                {" "}
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Use Saved Template
                </label>{" "}
                <select
                  className="input"
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                >
                  {" "}
                  <option value="">
                    -- Select a template (optional) --
                  </option>{" "}
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {" "}
                      {t.name}{" "}
                    </option>
                  ))}{" "}
                </select>{" "}
              </div>
            )}{" "}
            {/* Certificate Selector */}{" "}
            <div>
              {" "}
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                Attach Certificate
              </label>{" "}
              {certificates.length > 0 ? (
                <select
                  className="input"
                  value={selectedCertificateId}
                  onChange={(e) => setSelectedCertificateId(e.target.value)}
                >
                  {" "}
                  <option value="">
                    -- Select a certificate (optional) --
                  </option>{" "}
                  {certificates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {" "}
                      {c.name}{" "}
                    </option>
                  ))}{" "}
                </select>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-500">
                  {" "}
                  <Award size={16} />{" "}
                  <span>
                    No certificates found.{" "}
                    <a
                      href="/dashboard/certificates"
                      className="text-indigo-500 hover:underline"
                    >
                      Create one
                    </a>
                    .
                  </span>{" "}
                </div>
              )}{" "}
            </div>{" "}
          </div> 
          {/* From */}
          {sendersLoaded && senders.length === 0 && (
            <div className="p-4 rounded-xl text-sm mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              <div className="font-semibold mb-1">Sender Identity Required</div>
              <p>You must create a sender identity before you can send emails.</p>
              <a href="/dashboard/domains" className="inline-block mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                Create Sender Identity
              </a>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                From Email
              </label>
              <select
                className="input"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
              >
                {senders.length === 0 && <option value="">No senders found</option>}
                {senders.map((s) => (
                  <option key={s.id} value={s.email}>
                    {s.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--text-muted)" }}
              >
                From Name <span className="normal-case font-normal">(optional)</span>
              </label>
              <input
                className="input"
                type="text"
                placeholder="Leave empty to use sender default"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
              />
            </div>
          </div>
          {/* Subject */}{" "}
          <div>
            {" "}
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Email Subject *
            </label>{" "}
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={`e.g."Hey {{name}}, special offer just for you!"`}
              className="input"
            />{" "}
          </div>{" "}
          {/* Body toggle */}{" "}
          <div>
            {" "}
            <div className="flex items-center justify-between mb-2">
              {" "}
              <label
                className="block text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                Email Body *
              </label>{" "}
              <div
                className="flex rounded-lg overflow-hidden border"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                {" "}
                {(["HTML", "Plain Text"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setUseHtml(t === "HTML")}
                    className={`px-3 py-1 text-xs font-medium capitalize transition-all ${useHtml === (t === "HTML") ? "text-white" : ""}`}
                    style={{
                      background:
                        useHtml === (t === "HTML")
                          ? "rgba(99,102,241,0.3)"
                          : "transparent",
                      color:
                        useHtml === (t === "HTML")
                          ? "#fff"
                          : "var(--text-muted)",
                    }}
                  >
                    {" "}
                    {t === "HTML" ? "HTML" : "Plain Text"}{" "}
                  </button>
                ))}{" "}
              </div>{" "}
            </div>{" "}
            <textarea
              value={useHtml ? htmlBody : textBody}
              onChange={(e) =>
                useHtml
                  ? setHtmlBody(e.target.value)
                  : setTextBody(e.target.value)
              }
              placeholder={
                useHtml
                  ? `<h1>Hi {{name}},</h1>\n<p>Your personalised message here...</p>`
                  : `Hi {{name}},\n\nYour personalised message here...`
              }
              rows={12}
              className="input resize-none font-mono text-xs"
              style={{ fontFamily: useHtml ? "monospace" : "inherit" }}
            />{" "}
          </div>{" "}
          {/* Attachments Section */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                Attachments <span className="normal-case font-normal">(Max 5MB each)</span>
              </label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    Attach Files
                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
                {attachments.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {attachments.map((att, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-gray-50 rounded-lg text-gray-500 border border-gray-100">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-gray-800 truncate">{att.filename}</span>
                            <span className="text-xs text-gray-400">{(att.size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeAttachment(i)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div> 
          
          {/* Scheduling Section */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-3 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="accent-indigo-600"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
              />
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Schedule this email for later
              </span>
            </label>
            {isScheduled && (
              <div className="animate-fade-up">
                <input
                  type="datetime-local"
                  className="input"
                  required={isScheduled}
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Select the date and time when you want this bulk campaign to be sent.
                </p>
              </div>
            )}
          </div>

          <div
            className="flex gap-3 pt-2 border-t mt-4"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            {" "}
            <button
              onClick={() => setStep("preview")}
              className="btn-secondary flex-1"
            >
              {" "}
              ← Back{" "}
            </button>{" "}
            <button
              onClick={handleSend}
              disabled={
                !subject.trim() ||
                (!htmlBody.trim() && !textBody.trim()) ||
                loading ||
                senders.length === 0
              }
              className={`flex-2 flex items-center justify-center gap-2 py-3 px-8 rounded-xl text-base font-semibold shadow-md transition-all ${
                senders.length === 0 
                ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                : "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
              }`}
              style={{ flex: 2 }}
            >
              {" "}
              <Send size={14} /> Send to {preview?.valid.toLocaleString()}{" "}
              recipients{" "}
            </button>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* ── STEP: Sending ── */}{" "}
      {step === "sending" && (
        <div style={{ textAlign: "center", padding: "80px 32px" }}>
          {" "}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(99,102,241,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            {" "}
            <div
              style={{
                width: 40,
                height: 40,
                border: "3px solid rgba(99,102,241,0.3)",
                borderTop: "3px solid #6366f1",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />{" "}
          </div>{" "}
          <h3
            style={{
              color: "var(--text-primary)",
              fontSize: 20,
              fontWeight: 700,
              margin: "0 0 8px",
            }}
          >
            Queueing emails...
          </h3>{" "}
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            Adding {preview?.valid.toLocaleString()} emails to the send queue.
            This may take a moment.
          </p>{" "}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>{" "}
        </div>
      )}{" "}
      {/* ── STEP: Done ── */}{" "}
      {step === "done" && result && (
        <div className="flex flex-col gap-6 ">
          {" "}
          {/* Success card */}{" "}
          <div className="text-center p-12 rounded-xl bg-emerald-50/50 border border-emerald-100">
            {" "}
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
              {" "}
              <CheckCircle2 size={40} className="text-emerald-500" />{" "}
            </div>{" "}
            <h3 className="text-emerald-600 text-3xl font-black m-0 mb-2">
              Emails Queued!
            </h3>{" "}
            <p className="text-gray-500 text-base m-0">
              Your emails are being sent in the background. Check Email Logs to
              monitor delivery.
            </p>{" "}
          </div>{" "}
          {/* Result stats */}{" "}
          <div className="grid grid-cols-3 gap-4">
            {" "}
            {[
              {
                label: "Total Rows",
                value: result.total,
                colorClass: "text-indigo-500",
                borderClass: "border-indigo-500",
              },
              {
                label: "Queued to Send",
                value: result.queued,
                colorClass: "text-emerald-500",
                borderClass: "border-emerald-500",
              },
              {
                label: "Skipped",
                value: result.skipped,
                colorClass:
                  result.skipped > 0 ? "text-amber-500" : "text-emerald-500",
                borderClass:
                  result.skipped > 0
                    ? "border-amber-500"
                    : "border-emerald-500",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="p-6 rounded-lg bg-white border border-gray-200 shadow-sm relative overflow-hidden text-center flex flex-col justify-center items-center"
              >
                {" "}
                <div
                  className={`absolute top-0 left-0 w-full h-1 ${s.borderClass.replace("border-", "bg-")}`}
                />{" "}
                <div className={`text-4xl font-black ${s.colorClass}`}>
                  {s.value.toLocaleString()}
                </div>{" "}
                <div className="text-xs font-semibold text-gray-500 mt-2 uppercase tracking-wide">
                  {s.label}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
          
          {/* Live Progress Tracker */}
          {liveProgress && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-2">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-gray-900 font-bold m-0 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${liveProgress.queued > 0 ? "bg-indigo-500 animate-pulse" : "bg-emerald-500"}`} />
                  Live Sending Progress
                </h4>
                <div className="text-sm font-semibold text-gray-500">
                  {liveProgress.delivered + liveProgress.failed} / {liveProgress.total} Processed
                </div>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                {liveProgress.total > 0 && (
                  <>
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500" 
                      style={{ width: `${(liveProgress.delivered / liveProgress.total) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-red-500 transition-all duration-500" 
                      style={{ width: `${(liveProgress.failed / liveProgress.total) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div className="flex justify-between mt-3 text-xs font-semibold text-gray-500">
                <span className="text-emerald-600">{liveProgress.delivered} Delivered</span>
                <span className="text-indigo-600">{liveProgress.queued} Queued</span>
                <span className="text-red-600">{liveProgress.failed} Failed</span>
              </div>
            </div>
          )}
          
          {/* Skipped details */}{" "}
          {result.skippedDetails.length > 0 && (
            <div className="rounded-lg bg-white border border-gray-200 overflow-hidden shadow-sm">
              {" "}
              <div className="p-4 border-b border-gray-200 flex items-center gap-2 bg-amber-50/50">
                {" "}
                <AlertTriangle size={16} className="text-amber-500" />{" "}
                <span className="text-gray-800 text-sm font-bold">
                  Skipped Emails
                </span>{" "}
              </div>{" "}
              <div className="max-h-52 overflow-y-auto">
                {" "}
                {result.skippedDetails.map((s, i) => (
                  <div
                    key={i}
                    className="flex justify-between p-3.5 px-4 border-b border-gray-100 text-sm last:border-b-0 hover:bg-gray-50 :bg-gray-800/50"
                  >
                    {" "}
                    <span className="text-indigo-600 font-medium">
                      {s.email}
                    </span>{" "}
                    <span className="text-gray-500 text-xs mt-0.5">
                      {s.reason}
                    </span>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </div>
          )}{" "}
          <div className="flex gap-4">
            {" "}
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-full bg-white border border-gray-200 text-gray-700 text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors"
            >
              {" "}
              <RotateCcw size={16} /> Send Another{" "}
            </button>{" "}
            <a
              href="/dashboard/logs"
              className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-full bg-gray-50 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all hover:scale-[1.01]"
            >
              {" "}
              <Mail size={16} /> View Email Logs{" "}
            </a>{" "}
          </div>{" "}
        </div>
      )}{" "}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>{" "}
    </div>
  );
}
