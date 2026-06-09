"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface SandboxContextType {
  sandboxMode: boolean;
  sandboxUnread: number;
  sandboxToggling: boolean;
  toggleSandbox: () => Promise<void>;
  fetchSettings: () => Promise<void>;
}

const SandboxContext = createContext<SandboxContextType | null>(null);

export function SandboxProvider({ children }: { children: ReactNode }) {
  const [sandboxMode, setSandboxMode] = useState(false);
  const [sandboxUnread, setSandboxUnread] = useState(0);
  const [sandboxToggling, setSandboxToggling] = useState(false);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem("mf_access_token");
    const teamId = localStorage.getItem("mf_team_id");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (teamId) headers["X-Team-ID"] = teamId;
    return headers;
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/v1/sandbox/settings`, { headers: getHeaders() });
      const json = await res.json();
      if (json.success) {
        setSandboxMode(json.data.sandboxMode);
        setSandboxUnread(json.data.unreadCount ?? 0);
      }
    } catch {}
  }, [getHeaders]);

  const toggleSandbox = useCallback(async () => {
    setSandboxToggling(true);
    try {
      const newVal = !sandboxMode;
      const res = await fetch(`${API}/v1/sandbox/settings`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ sandboxMode: newVal }),
      });
      const json = await res.json();
      if (json.success) setSandboxMode(json.data.sandboxMode);
      else alert(json.error || "Failed to toggle sandbox mode");
    } catch (e) {
      alert("Internal server error");
    } finally {
      setSandboxToggling(false);
    }
  }, [sandboxMode, getHeaders]);

  useEffect(() => {
    fetchSettings();
    const interval = setInterval(fetchSettings, 30000);
    return () => clearInterval(interval);
  }, [fetchSettings]);

  return (
    <SandboxContext.Provider value={{ sandboxMode, sandboxUnread, sandboxToggling, toggleSandbox, fetchSettings }}>
      {children}
    </SandboxContext.Provider>
  );
}

export function useSandbox() {
  const ctx = useContext(SandboxContext);
  if (!ctx) throw new Error("useSandbox must be used inside SandboxProvider");
  return ctx;
}
