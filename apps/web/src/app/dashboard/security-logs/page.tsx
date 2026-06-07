"use client";
import { formatIST } from "@/lib/dateUtils";

import React, { useEffect, useState } from "react";
import { ShieldAlert, AlertTriangle, Calendar, Activity, ChevronDown, ChevronUp, RefreshCw, Shield } from "lucide-react";
import { format } from "date-fns";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("mf_access_token") ?? ""
    : "";
}

type SecurityLog = {
  id: string;
  endpoint: string;
  event: string;
  ipAddress: string;
  details: {
    spamScore?: number;
    issues?: string[];
    suggestions?: string[];
    subject?: string;
  };
  createdAt: string;
};

export default function SecurityLogsPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const res = await fetch(`${API}/v1/security-logs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      } else {
        setError(data.error || "Failed to load logs");
      }
    } catch (err: any) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const toggleRow = (id: string) => {
    if (expandedRow === id) {
      setExpandedRow(null);
    } else {
      setExpandedRow(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            API Security Logs
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Monitor blocked API requests, spam attempts, and security events originating from your API keys.
          </p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center">
            <RefreshCw size={24} className="animate-spin text-gray-400 mb-3" />
            <p className="text-gray-500 text-sm">Loading security events...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 flex flex-col items-center gap-2">
            <AlertTriangle />
            <p className="text-sm">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Shield size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>
              No Security Events
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Your account is safe. No spam attempts or malicious requests have been blocked yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b text-gray-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Endpoint</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr 
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer border-b border-gray-100/50"
                      onClick={() => toggleRow(log.id)}
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider bg-red-100 text-red-700">
                          <Activity size={12} />
                          {log.event.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{log.endpoint}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{log.ipAddress || "Unknown"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 flex items-center gap-2">
                        <Calendar size={13} />
                        {formatIST(log.createdAt, true)}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {expandedRow === log.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </td>
                    </tr>
                    {expandedRow === log.id && (
                      <tr className="bg-gray-50/30">
                        <td colSpan={5} className="px-5 py-5 border-b border-gray-100">
                          <div className="text-sm bg-white border border-red-100 rounded-xl p-5 shadow-sm">
                            <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                              <ShieldAlert size={16} /> Blocked Request Details
                            </h4>
                            <div className="grid grid-cols-2 gap-5">
                              {log.details?.subject && (
                                <div>
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Attempted Subject</div>
                                  <div className="text-gray-900 bg-gray-50/50 p-2.5 rounded-lg border font-medium text-sm">"{log.details.subject}"</div>
                                </div>
                              )}
                              {log.details?.spamScore !== undefined && (
                                <div>
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">AI Spam Score</div>
                                  <div className="text-red-700 bg-red-50 p-2 rounded-lg border border-red-100 font-bold inline-block text-sm">
                                    {log.details.spamScore} / 10
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {log.details?.issues && log.details.issues.length > 0 && (
                              <div className="mt-5">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Spam Issues Detected:</div>
                                <ul className="list-disc pl-5 space-y-1 text-red-700 text-xs font-medium">
                                  {log.details.issues.map((i, idx) => (
                                    <li key={idx}>{i}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {log.details?.suggestions && log.details.suggestions.length > 0 && (
                              <div className="mt-4">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">AI Suggestions:</div>
                                <ul className="list-disc pl-5 space-y-1 text-amber-700 text-xs font-medium">
                                  {log.details.suggestions.map((s, idx) => (
                                    <li key={idx}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
