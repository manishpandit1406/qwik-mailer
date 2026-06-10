"use client";
import { formatIST } from "@/lib/dateUtils";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, LayoutGrid, List, Search, MoreVertical, AlertCircle, Loader2, Mail, Bell } from "lucide-react";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}

interface Project {
  id: string;
  name: string;
  slug: string;
  role: string;
  created_at: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userInitial, setUserInitial] = useState("U");
  const [userPlan, setUserPlan] = useState("free");
  
  const [showCreate, setShowCreate] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
    try {
      const u = JSON.parse(localStorage.getItem("mf_user") || "{}");
      if (u.name) setUserInitial(u.name[0]);
      if (u.plan) setUserPlan(u.plan);
    } catch(e) {}
  }, []);

  async function fetchProjects() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/teams`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        const allProjects = [
          ...(json.data.owned || []).map((p: any) => ({ ...p, role: "owner" })),
          ...(json.data.member || []).filter(
            (m: any) => !(json.data.owned || []).some((o: any) => o.id === m.id)
          ),
        ];
        setProjects(allProjects);
      }
    } catch {
      setError("Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/v1/teams`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newProjectName }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreate(false);
        setNewProjectName("");
        await fetchProjects();
      } else {
        setError(json.error ?? "Failed to create project.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setCreating(false);
    }
  }

  function handleSelectProject(project: Project) {
    localStorage.setItem("mf_active_team", project.id);
    router.push("/dashboard" as any);
  }

  return (
    <>
      <div className="max-w-7xl mx-auto py-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Projects</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (userPlan === "free" && projects.length >= 1) {
                  setError("Free plan is limited to 1 project. Please upgrade to add more.");
                } else if (userPlan === "standard" && projects.length >= 2) {
                  setError("Standard plan is limited to 2 projects. Please upgrade to add more.");
                } else if (userPlan === "pro" && projects.length >= 5) {
                  setError("Pro plan is limited to 5 projects. Please upgrade to add more.");
                } else {
                  setShowCreate(true);
                }
              }}
              className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} /> New project
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-8 flex items-center gap-3 shadow-sm">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="border border-gray-200 bg-white rounded-xl shadow-sm p-12 text-center max-w-xl mx-auto mt-12">
            <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">No projects yet</h3>
            <p className="text-gray-400 mb-8">Create your first project to start sending emails and tracking analytics.</p>
            <button 
              onClick={() => setShowCreate(true)}
              className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-md font-medium transition-colors inline-flex items-center gap-2 shadow-sm"
            >
              <Plus size={18} /> Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div 
                key={project.id}
                onClick={() => handleSelectProject(project)}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-black transition-colors">{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 capitalize">Role: {project.role}</p>
                    {project.created_at && (
                      <p className="text-xs text-gray-400 mt-1.5 font-medium">
                        Created: {formatIST(project.created_at, false)}
                      </p>
                    )}
                  </div>
                  <button className="text-gray-400 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical size={18} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 w-fit px-2.5 py-1 rounded-md">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Active
                  </div>
                  <div className="text-xs text-gray-400">
                    ID: {project.slug}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-semibold text-lg text-gray-900">Create a new project</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-900">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Support, Marketing, pdfTube"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-all placeholder-gray-400 shadow-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && createProject()}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={createProject}
                disabled={creating || !newProjectName.trim()}
                className="bg-black hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-black text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : null}
                {creating ? "Creating..." : "Create new project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
