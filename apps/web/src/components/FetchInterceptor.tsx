"use client";
import { useEffect } from "react";

export function FetchInterceptor() {
  useEffect(() => {
    if (typeof window === "undefined" || (window as any)._fetchPatched) return;
    (window as any)._fetchPatched = true;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      let response = await originalFetch(...args);
      
      const url = args[0] as string;
      
      // If we get a 401 from an API endpoint (excluding auth endpoints to prevent loops)
      if (
        response.status === 401 && 
        typeof url === 'string' && 
        url.includes('/v1/') && 
        !url.includes('/v1/auth/')
      ) {
        const refreshToken = localStorage.getItem("mf_refresh_token");
        if (refreshToken) {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const refreshRes = await originalFetch(`${apiUrl}/v1/auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken })
            });
            const data = await refreshRes.json();
            
            if (data.success && data.data?.accessToken) {
              // Save the new tokens
              localStorage.setItem("mf_access_token", data.data.accessToken);
              if (data.data.refreshToken) {
                localStorage.setItem("mf_refresh_token", data.data.refreshToken);
              }
              
              // Retry the original request with the new access token
              let [reqUrl, config] = args;
              if (config) {
                // We need to parse headers since it could be Headers object or plain object or array
                const newHeaders = new Headers(config.headers || {});
                newHeaders.set("Authorization", `Bearer ${data.data.accessToken}`);
                
                // Fetch takes Headers init natively
                config = { ...config, headers: newHeaders };
              } else {
                config = { headers: { Authorization: `Bearer ${data.data.accessToken}` } };
              }
              
              response = await originalFetch(reqUrl, config);
            } else {
              // Refresh token is invalid/expired
              localStorage.removeItem("mf_access_token");
              localStorage.removeItem("mf_refresh_token");
              localStorage.removeItem("mf_user");
              window.location.href = "/login";
            }
          } catch (e) {
            console.error("Token rotation failed:", e);
          }
        }
      }
      return response;
    };
  }, []);

  return null;
}
