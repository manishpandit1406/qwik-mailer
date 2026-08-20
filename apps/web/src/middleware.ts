import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  // Match forms.qwikmailer.in in production, or forms.localhost in dev
  const isFormsSubdomain =
    host === "forms.qwikmailer.in" ||
    host.startsWith("forms.localhost");

  if (isFormsSubdomain) {
    const { pathname } = request.nextUrl;

    // Only rewrite the root to the forms landing page.
    // /f/[id] and all other paths work as-is on the same Next.js app.
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/forms-landing";
      return NextResponse.rewrite(url);
    }

    // Rewrite /dashboard to /forms-dashboard for the standalone forms dashboard
    if (pathname.startsWith("/dashboard")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/^\/dashboard/, "/forms-dashboard");
      return NextResponse.rewrite(url);
    }

    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/forms-login";
      return NextResponse.rewrite(url);
    }

    if (pathname === "/register") {
      const url = request.nextUrl.clone();
      url.pathname = "/forms-register";
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
