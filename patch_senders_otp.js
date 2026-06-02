const fs = require('fs');

const path = './apps/web/src/app/dashboard/domains/DomainSendersModal.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add states
code = code.replace(
  'const [error, setError] = useState("");',
  `const [error, setError] = useState("");
  const [isAwaitingOtp, setIsAwaitingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);`
);

// Update addSender logic
const addSenderLogic = `async function addSender() {
    if (!prefix.trim()) return;
    if (domain.domain === "mail.qwikmailer.in" && !replyTo.trim()) {
      setError("Reply-To email is strictly required when using the shared domain.");
      return;
    }
    
    setAdding(true);
    setError("");
    setMsg(null);
    try {
      if (domain.domain === "mail.qwikmailer.in") {
        if (!isAwaitingOtp) {
          const res = await fetch(\`\${API}/v1/domains/shared/setup\`, {
            method: "POST",
            headers: { Authorization: \`Bearer \${getToken()}\`, "Content-Type": "application/json" },
            body: JSON.stringify({ 
              username: prefix.trim(),
              displayName: fromName,
              replyTo,
            }),
          });
          const json = await res.json();
          if (json.success) {
            setIsAwaitingOtp(true);
            setMsg({ text: "OTP sent to your Reply-To email!", type: "success" });
          } else {
            setError(json.error || "Failed to setup sender.");
          }
          setAdding(false);
          return;
        } else {
          if (otp.length !== 6) {
            setError("Please enter the 6-digit OTP.");
            setAdding(false);
            return;
          }
          const res = await fetch(\`\${API}/v1/domains/shared/verify\`, {
            method: "POST",
            headers: { Authorization: \`Bearer \${getToken()}\`, "Content-Type": "application/json" },
            body: JSON.stringify({ 
              otp,
              replyTo,
              nickname,
            }),
          });
          const json = await res.json();
          if (json.success) {
            resetForm();
            await fetchSenders();
          } else {
            setError(json.error || "Invalid OTP.");
          }
          setAdding(false);
          return;
        }
      }

      const res = await fetch(\`\${API}/v1/domains/\${domain.id}/senders\`, {
        method: "POST",
        headers: {
          Authorization: \`Bearer \${getToken()}\`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prefix: prefix.trim(),
          fromName,
          replyTo,
          companyAddress,
          companyAddress2,
          city,
          state: state,
          zipCode,
          country,
          nickname
        }),
      });
      const json = await res.json();
      if (json.success) {
        resetForm();
        await fetchSenders();
      } else {
        setError(json.error ?? "Failed to add sender.");
      }
    } catch {
      setError("Network error");
    } finally {
      setAdding(false);
    }
  }

  function resetForm() {
    setPrefix("");
    setFromName("");
    setReplyTo("");
    setCompanyAddress("");
    setCompanyAddress2("");
    setCity("");
    setState("");
    setZipCode("");
    setCountry("");
    setNickname("");
    setShowForm(false);
    setIsAwaitingOtp(false);
    setOtp("");
    setMsg(null);
    setError("");
  }`;

// Replace addSender function
code = code.replace(/async function addSender\(\) \{[\s\S]*?async function deleteSender/, addSenderLogic + '\n\n  async function deleteSender');

// In startEdit, reset error
code = code.replace(
  'setError("");\n  }',
  'setError("");\n    setMsg(null);\n  }'
);

// Add msg banner under error
code = code.replace(
  '{error && (\n          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">\n            {" "}\n            {error}{" "}\n          </div>\n        )}',
  `{error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        {msg && (
          <div className={\`p-3 mb-4 rounded-xl text-sm \${msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}\`}>
            {msg.text}
          </div>
        )}`
);

// Fix the reply-to location in create form
// Also add OTP input view
const showFormOriginal = `{showForm ? (

          <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Sender Nickname</label>
                <input type="text" className="input" placeholder="e.g. Support Team" value={nickname} onChange={e => setNickname(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>From Name</label>
                <input type="text" className="input" placeholder="e.g. QwikMailer Support" value={fromName} onChange={e => setFromName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Sender Username</label>
                <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white shadow-sm focus-within:ring-1 focus-within:ring-black focus-within:border-black">
                  <input type="text" placeholder="yourcompany" className="w-full px-3 py-2 focus:outline-none sm:text-sm" value={prefix} onChange={e => setPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                  <div className="px-3 bg-gray-50 text-gray-500 border-l border-gray-300 text-sm py-2 whitespace-nowrap">@{domain.domain}</div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                  Reply-To {domain.domain === "mail.qwikmailer.in" ? "*" : "(Optional)"}
                </label>
                <input type="email" className="input" placeholder="reply@domain.com" required={domain.domain === "mail.qwikmailer.in"} value={replyTo} onChange={e => setReplyTo(e.target.value)} />
              </div>
            </div>
            
            <h4 className="font-bold text-sm mt-6 mb-2 border-b pb-2" style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}>
              Physical Mailing Address (CAN-SPAM)
            </h4>`;

const showFormNew = `{showForm ? (
          <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
            {!isAwaitingOtp ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Sender Nickname</label>
                    <input type="text" className="input" placeholder="e.g. Support Team" value={nickname} onChange={e => setNickname(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>From Name</label>
                    <input type="text" className="input" placeholder="e.g. QwikMailer Support" value={fromName} onChange={e => setFromName(e.target.value)} />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Sender Username</label>
                    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white shadow-sm focus-within:ring-1 focus-within:ring-black focus-within:border-black">
                      <input type="text" placeholder="yourcompany" className="w-full px-3 py-2 focus:outline-none sm:text-sm" value={prefix} onChange={e => setPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                      <div className="px-3 bg-gray-50 text-gray-500 border-l border-gray-300 text-sm py-2 whitespace-nowrap">@{domain.domain}</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                      Reply-To {domain.domain === "mail.qwikmailer.in" ? "*" : "(Optional)"}
                    </label>
                    <input type="email" className="input" placeholder="reply@domain.com" required={domain.domain === "mail.qwikmailer.in"} value={replyTo} onChange={e => setReplyTo(e.target.value)} />
                    <p className="text-[10px] text-gray-500 mt-1">Replies to your emails will be sent here.</p>
                  </div>
                </div>
                
                {domain.domain !== "mail.qwikmailer.in" && (
                  <>
                    <h4 className="font-bold text-sm mt-6 mb-2 border-b pb-2" style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}>
                      Physical Mailing Address (CAN-SPAM)
                    </h4>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <h3 className="text-lg font-bold mb-1">Verify your email</h3>
                <p className="text-gray-500 text-sm mb-6">
                  We sent a 6-digit verification code to<br/>
                  <span className="font-semibold text-gray-800">{replyTo}</span>
                </p>
                <div className="max-w-[240px] mx-auto">
                  <input
                    type="text"
                    className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    placeholder="------"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\\D/g, ""))}
                  />
                </div>
              </div>
            )}`;

code = code.replace(showFormOriginal, showFormNew);

// Since we conditionalized CAN-SPAM, we should hide CAN-SPAM fields if isAwaitingOtp
const canSpamOriginal = `<div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Company Address</label>
                <input type="text" className="input" placeholder="A-12, Cyber Park" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Company Address 2</label>
                <input type="text" className="input" placeholder="Sector 62 (Optional)" value={companyAddress2} onChange={e => setCompanyAddress2(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>City</label>
                  <input type="text" className="input" placeholder="New Delhi" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>State/Province</label>
                  <input type="text" className="input" placeholder="Delhi" value={state} onChange={e => setState(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Zip/Postal Code</label>
                  <input type="text" className="input" placeholder="110001" value={zipCode} onChange={e => setZipCode(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Country</label>
                  <input type="text" className="input" placeholder="India" value={country} onChange={e => setCountry(e.target.value)} />
                </div>
              </div>
            </div>`;

const canSpamNew = `{!isAwaitingOtp && domain.domain !== "mail.qwikmailer.in" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Company Address</label>
                  <input type="text" className="input" placeholder="A-12, Cyber Park" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Company Address 2</label>
                  <input type="text" className="input" placeholder="Sector 62 (Optional)" value={companyAddress2} onChange={e => setCompanyAddress2(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>City</label>
                    <input type="text" className="input" placeholder="New Delhi" value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>State/Province</label>
                    <input type="text" className="input" placeholder="Delhi" value={state} onChange={e => setState(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Zip/Postal Code</label>
                    <input type="text" className="input" placeholder="110001" value={zipCode} onChange={e => setZipCode(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Country</label>
                    <input type="text" className="input" placeholder="India" value={country} onChange={e => setCountry(e.target.value)} />
                  </div>
                </div>
              </div>
            )}`;

code = code.replace(canSpamOriginal, canSpamNew);

// Update Cancel button behavior and text
const buttonActions = `<div className="flex gap-3 pt-4">
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={addSender} disabled={adding || !prefix.trim()}>
                {adding ? <RefreshCw size={14} className="animate-spin" /> : null} Create Sender
              </button>
            </div>`;

const buttonActionsNew = `<div className="flex gap-3 pt-4">
              {!isAwaitingOtp && (
                <button className="btn-secondary flex-1" onClick={() => resetForm()}>Cancel</button>
              )}
              <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={addSender} disabled={adding || !prefix.trim()}>
                {adding ? <RefreshCw size={14} className="animate-spin" /> : null} {isAwaitingOtp ? "Verify & Save" : "Continue"}
              </button>
            </div>`;

code = code.replace(buttonActions, buttonActionsNew);

fs.writeFileSync(path, code);
console.log("Patched DomainSendersModal.tsx");
