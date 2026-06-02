const fs = require('fs');

let code = fs.readFileSync('apps/web/src/app/dashboard/layout.tsx', 'utf8');

if (!code.includes('SecurityReminderPopup')) {
  const insertIndex = code.indexOf('export default function DashboardLayout');
  const addCode = `
function SecurityReminderPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("mf_security_reminder_dismissed");
    if (dismissed) return;

    // Fetch user profile and passkeys to check security status
    async function checkSecurityStatus() {
      try {
        const token = localStorage.getItem("mf_access_token");
        if (!token) return;

        const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
        const meRes = await fetch(\`\${API}/v1/auth/me\`, {
          headers: { Authorization: \`Bearer \${token}\` },
        });
        const meData = await meRes.json();
        
        if (!meData.success) return;
        const user = meData.data;

        // Check if user is older than 1 day (or for demo, just show if missing both)
        // If they have TOTP enabled, they are fine
        if (user.totpEnabled) return;

        const pkRes = await fetch(\`\${API}/v1/auth/passkey\`, {
          headers: { Authorization: \`Bearer \${token}\` },
        });
        const pkData = await pkRes.json();
        
        // If they have passkeys, they are fine
        if (Array.isArray(pkData) && pkData.length > 0) return;

        // Only show if user account was created > 24 hours ago
        if (user.createdAt) {
          const createdDate = new Date(user.createdAt);
          const now = new Date();
          const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
          if (diffHours < 24) return; // wait 1-2 days
        }

        // Neither TOTP nor passkey is set up
        setShow(true);
      } catch {}
    }

    checkSecurityStatus();
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full relative animate-in zoom-in-95 duration-200">
        <button 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          onClick={() => {
            localStorage.setItem("mf_security_reminder_dismissed", "true");
            setShow(false);
          }}
        >
          <X size={18} />
        </button>
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <Shield size={24} className="text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Secure Your Account</h3>
        <p className="text-sm text-gray-600 mb-6">
          You haven't set up Two-Factor Authentication (2FA) or Passkeys yet. Add an extra layer of security to protect your sender reputation and account settings.
        </p>
        <div className="flex gap-3">
          <button 
            className="flex-1 btn-ghost text-sm py-2"
            onClick={() => {
              localStorage.setItem("mf_security_reminder_dismissed", "true");
              setShow(false);
            }}
          >
            Later
          </button>
          <Link 
            href="/dashboard/settings"
            onClick={() => {
              localStorage.setItem("mf_security_reminder_dismissed", "true");
              setShow(false);
            }}
            className="flex-1 btn-primary text-sm py-2 text-center"
          >
            Setup Now
          </Link>
        </div>
      </div>
    </div>
  );
}

`;
  code = code.slice(0, insertIndex) + addCode + code.slice(insertIndex);
}

if (!code.includes('<SecurityReminderPopup />')) {
  code = code.replace(
    '        <main className="flex-1 overflow-auto p-6 relative">\n          {children}\n        </main>',
    '        <main className="flex-1 overflow-auto p-6 relative">\n          {children}\n          <SecurityReminderPopup />\n        </main>'
  );
}

fs.writeFileSync('apps/web/src/app/dashboard/layout.tsx', code);
