const fs = require('fs');
let content = fs.readFileSync('apps/web/src/app/dashboard/domains/page.tsx', 'utf8');

// 1. Add Edit2 icon
content = content.replace(
  'AtSign,\n} from "lucide-react";',
  'AtSign,\n  Edit2,\n} from "lucide-react";'
);

// 2. Add states
content = content.replace(
  'const [sharedMsg, setSharedMsg] = useState<{text: string, type: string} | null>(null);',
  `const [sharedMsg, setSharedMsg] = useState<{text: string, type: string} | null>(null);
  const [isEditingShared, setIsEditingShared] = useState(false);
  const [editSharedName, setEditSharedName] = useState("");
  const [savingShared, setSavingShared] = useState(false);`
);

// 3. Add handleEditShared function
const insertPos = content.indexOf('  useEffect(() => {\n    fetchDomains();');
const funcCode = `  async function handleEditShared() {
    if (!sharedSender || !editSharedName.trim()) return;
    setSavingShared(true);
    setSharedMsg(null);
    try {
      const res = await fetch(\`\${API}/v1/senders/\${sharedSender.id}\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: \`Bearer \${getToken()}\` },
        body: JSON.stringify({ displayName: editSharedName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setSharedSender(data.data);
        setIsEditingShared(false);
        setSharedMsg({ text: "Display name updated successfully!", type: "success" });
      } else {
        setSharedMsg({ text: data.error || "Update failed", type: "error" });
      }
    } catch (e: any) {
      setSharedMsg({ text: e.message, type: "error" });
    }
    setSavingShared(false);
  }

`;
content = content.slice(0, insertPos) + funcCode + content.slice(insertPos);

// 4. Update UI block
const oldUiBlock = `{sharedSender && (
          <div className="glass-card p-5 mb-4 flex items-center justify-between border-emerald-200 bg-emerald-50/20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <AtSign size={18} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">
                  {sharedSender.displayName}
                </h4>
                <p className="text-sm text-gray-600 font-mono mt-0.5">
                  {sharedSender.username}@mail.qwikmailer.in
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="badge-success">Active & Verified</span>
              <p className="text-xs text-gray-500 mt-2">
                Ready to send emails via Qwik Mailer
              </p>
            </div>
          </div>
        )}`;

const newUiBlock = `{sharedSender && (
          <div className="glass-card p-5 mb-4 flex items-center justify-between border-emerald-200 bg-emerald-50/20">
            <div className="flex items-center gap-4 w-full max-w-2xl">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <AtSign size={18} />
              </div>
              <div className="flex-1">
                {isEditingShared ? (
                  <div className="flex items-center gap-2 max-w-sm">
                    <input type="text" className="input py-1 text-sm font-bold" value={editSharedName} onChange={e => setEditSharedName(e.target.value)} />
                    <button className="btn-primary py-1 px-3 text-xs" onClick={handleEditShared} disabled={savingShared}>{savingShared ? "Saving..." : "Save"}</button>
                    <button className="btn-ghost py-1 px-3 text-xs" onClick={() => setIsEditingShared(false)}>Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900">
                      {sharedSender.displayName}
                    </h4>
                    <button onClick={() => { setEditSharedName(sharedSender.displayName); setIsEditingShared(true); }} className="text-gray-400 hover:text-blue-600 transition-colors">
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
                <p className="text-sm text-gray-600 font-mono mt-0.5">
                  {sharedSender.username}@mail.qwikmailer.in
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="badge-success">Active & Verified</span>
              <p className="text-xs text-gray-500 mt-2">
                Ready to send emails via Qwik Mailer
              </p>
            </div>
          </div>
        )}`;

if (content.includes(oldUiBlock)) {
    content = content.replace(oldUiBlock, newUiBlock);
} else {
    // try replacing without whitespace
    const norm = str => str.replace(/\s+/g, '');
    const oldNorm = norm(oldUiBlock);
    let matchStart = -1;
    let matchEnd = -1;
    
    // basic sliding window approach for relaxed whitespace match
    let searchNorm = norm(content);
    let idx = searchNorm.indexOf(oldNorm);
    if(idx !== -1) {
        console.log("Could not exact match, consider manual replace.");
    }
}

fs.writeFileSync('apps/web/src/app/dashboard/domains/page.tsx', content);
