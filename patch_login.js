const fs = require('fs');

let code = fs.readFileSync('apps/web/src/app/login/page.tsx', 'utf8');

if (!code.includes('@simplewebauthn/browser')) {
  code = code.replace(
    'import { Mail, Eye, EyeOff, ArrowRight, Shield } from "lucide-react";',
    'import { Mail, Eye, EyeOff, ArrowRight, Shield, Fingerprint } from "lucide-react";\nimport { startAuthentication } from "@simplewebauthn/browser";'
  );
}

if (!code.includes('handlePasskeyLogin')) {
  const insertIndex = code.indexOf('async function handleSubmit');
  const addCode = `
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  async function handlePasskeyLogin() {
    if (!form.email) {
      setError("Please enter your email to use passkey login.");
      return;
    }
    setPasskeyLoading(true);
    setError("");
    try {
      const optRes = await fetch(\`\${API}/v1/auth/passkey/login-options\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const options = await optRes.json();
      if (options.error) throw new Error(options.error);

      const asseResp = await startAuthentication(options);

      const verRes = await fetch(\`\${API}/v1/auth/passkey/login-verify\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, body: asseResp }),
      });
      
      const data = await verRes.json();
      if (data.error) throw new Error(data.error);

      localStorage.setItem("mf_access_token", data.accessToken);
      localStorage.setItem("mf_user", JSON.stringify(data.user));
      
      if (data.user.onboardingCompleted === false) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Passkey login failed.");
    } finally {
      setPasskeyLoading(false);
    }
  }

  `;
  code = code.slice(0, insertIndex) + addCode + code.slice(insertIndex);
}

if (!code.includes('handlePasskeyLogin')) {
    // Should be added above.
}

if (!code.includes('Sign in with Passkey')) {
  const replacement = `
            <button
              id="login-submit"
              type="submit"
              disabled={loading || passkeyLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black mt-6"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign in <ArrowRight size={16} /></>
              )}
            </button>

            {!requires2FA && (
              <>
                <div className="relative mt-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={loading || passkeyLoading}
                  className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  {passkeyLoading ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Fingerprint size={16} /> Sign in with Passkey
                    </>
                  )}
                </button>
              </>
            )}
  `;

  code = code.replace(
    /<\button\s+id="login-submit"[\s\S]*?<\/button>/m,
    replacement
  );
}

fs.writeFileSync('apps/web/src/app/login/page.tsx', code);
