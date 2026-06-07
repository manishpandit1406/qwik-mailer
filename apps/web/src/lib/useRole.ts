import { useState, useEffect } from "react";

export function useRole() {
  const [role, setRole] = useState<"owner" | "admin" | "member" | "viewer" | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRole = localStorage.getItem("mf_active_team_role") as any;
      if (storedRole) {
        setRole(storedRole);
      }
    }
  }, []);

  return {
    role,
    isViewer: role === "viewer",
    isMember: role === "member",
    isAdmin: role === "admin",
    isOwner: role === "owner",
    canMutate: role === "owner" || role === "admin" || role === "member",
    canAdmin: role === "owner" || role === "admin",
  };
}
