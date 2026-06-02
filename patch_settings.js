const fs = require('fs');

let code = fs.readFileSync('apps/web/src/app/dashboard/settings/page.tsx', 'utf8');

if (!code.includes('@simplewebauthn/browser')) {
  code = code.replace(
    'import { LogoLoader } from "@/components/LogoLoader";',
    'import { LogoLoader } from "@/components/LogoLoader";\nimport { startRegistration } from "@simplewebauthn/browser";'
  );
}

if (!code.includes('const [passkeys')) {
  const insertIndex = code.indexOf('const [notifSaved');
  const addCode = `
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyMsg, setPasskeyMsg] = useState("");

  async function loadPasskeys() {
    try {
      const res = await fetch(\`\${API}/v1/auth/passkey\`, {
        headers: { Authorization: \`Bearer \${getToken()}\` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setPasskeys(data);
    } catch { }
  }

  useEffect(() => {
    if (tab === "security") {
      loadPasskeys();
    }
  }, [tab]);

  async function registerPasskey() {
    setPasskeyLoading(true);
    setPasskeyMsg("");
    try {
      // 1. Get options from server
      const optRes = await fetch(\`\${API}/v1/auth/passkey/register-options\`, {
        headers: { Authorization: \`Bearer \${getToken()}\` },
      });
      const options = await optRes.json();
      
      if (options.error) {
        throw new Error(options.error);
      }

      // 2. Pass to browser
      const attResp = await startRegistration(options);

      // 3. Verify with server
      const verRes = await fetch(\`\${API}/v1/auth/passkey/register-verify\`, {
        method: "POST",
        headers: {
          Authorization: \`Bearer \${getToken()}\`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(attResp),
      });

      const verification = await verRes.json();
      if (verification.verified) {
        setPasskeyMsg("Passkey registered successfully!");
        loadPasskeys();
      } else {
        throw new Error(verification.error || "Failed to verify passkey");
      }
    } catch (err: any) {
      setPasskeyMsg(err.message || "Something went wrong");
    } finally {
      setPasskeyLoading(false);
    }
  }
`;
  code = code.slice(0, insertIndex) + addCode + code.slice(insertIndex);
}

if (!code.includes('Passwordless Login')) {
  const jsxCode = `
              <hr className="divider" />
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: "var(--text-primary)" }}>
                  Passkeys (Passwordless Login)
                </p>
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                  Use Touch ID, Face ID, or a security key to sign in securely without a password.
                </p>
                {passkeyMsg && (
                  <p className="text-sm mb-3 font-medium text-blue-600 bg-blue-50 p-2 rounded-lg">
                    {passkeyMsg}
                  </p>
                )}
                
                {passkeys.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {passkeys.map(pk => (
                      <div key={pk.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">Passkey {pk.deviceType ? \`(\${pk.deviceType})\` : ''}</p>
                          <p className="text-xs text-gray-500">Added on {new Date(pk.createdAt).toLocaleDateString()}</p>
                        </div>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="btn-secondary text-sm flex items-center gap-2"
                  onClick={registerPasskey}
                  disabled={passkeyLoading}
                >
                  {passkeyLoading ? <RefreshCw size={14} className="animate-spin" /> : <Shield size={14} />}
                  {passkeyLoading ? "Setting up..." : "Register New Passkey"}
                </button>
              </div>`;
              
  code = code.replace(
    /(\s*)(\<\/div>\s*)\}\s*\{tab === "billing" && \(/g,
    '$1$1' + jsxCode + '$1$2}\n          {tab === "billing" && ('
  );
}

fs.writeFileSync('apps/web/src/app/dashboard/settings/page.tsx', code);
