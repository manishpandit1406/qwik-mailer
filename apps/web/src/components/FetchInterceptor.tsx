"use client";

if (typeof window !== "undefined" && !(window as any)._fetchPatched) {
  (window as any)._fetchPatched = true;
  const originalFetch = window.fetch;
  
  window.fetch = async function (this: any, ...args: any[]) {
    let [input, init] = args;
    
    // Determine the URL string
    let urlString = "";
    if (typeof input === "string") {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.toString();
    } else if (input instanceof Request) {
      urlString = input.url;
    }

    // Attach X-Team-ID for our API requests
    if (urlString && urlString.includes("/v1/")) {
      const activeTeam = localStorage.getItem("mf_active_team");
      if (activeTeam) {
        const newHeaders = new Headers(init?.headers || (input instanceof Request ? input.headers : {}));
        newHeaders.set("X-Team-ID", activeTeam);
        
        // If input is a Request, we can't easily mutate its headers, 
        // so we pass headers in `init` instead, which overrides Request headers in fetch.
        init = { ...init, headers: newHeaders };
        args = [input, init];
      }
    }
    
    let response;
    try {
      response = await originalFetch.apply(this, args as any);
    } catch (error) {
      // If it's a network error (like dev server down), just throw it so Next.js router handles it
      throw error;
    }
    
    // Token refresh logic
    if (
      response.status === 401 && 
      urlString && 
      urlString.includes("/v1/") && 
      !urlString.includes("/v1/auth/login") &&
      !urlString.includes("/v1/auth/register") &&
      !urlString.includes("/v1/auth/refresh")
    ) {
      const refreshToken = localStorage.getItem("mf_refresh_token");
      if (refreshToken) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
          const refreshRes = await originalFetch.call(this, `${apiUrl}/v1/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken })
          });
          const data = await refreshRes.json();
          
          if (data.success && data.data?.accessToken) {
            localStorage.setItem("mf_access_token", data.data.accessToken);
            if (data.data.refreshToken) {
              localStorage.setItem("mf_refresh_token", data.data.refreshToken);
            }
            
            // Retry request
            let [reqInput, reqInit] = args;
            const retryHeaders = new Headers(reqInit?.headers || (reqInput instanceof Request ? reqInput.headers : {}));
            retryHeaders.set("Authorization", `Bearer ${data.data.accessToken}`);
            reqInit = { ...reqInit, headers: retryHeaders };
            
            response = await originalFetch.call(this, reqInput, reqInit);
          } else {
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
}

export function FetchInterceptor() {
  return null;
}
