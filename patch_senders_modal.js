const fs = require('fs');

const path = './apps/web/src/app/dashboard/domains/DomainSendersModal.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add edit states
code = code.replace(
  'const [adding, setAdding] = useState(false);',
  `const [adding, setAdding] = useState(false);
  const [editingSender, setEditingSender] = useState<any>(null);
  const [editPrefix, setEditPrefix] = useState("");
  const [editFromName, setEditFromName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);`
);

// Add edit function
code = code.replace(
  'async function addSender() {',
  `function startEdit(sender: any) {
    setEditingSender(sender);
    setEditPrefix(sender.email.split("@")[0]);
    setEditFromName(sender.fromName || "");
    setEditNickname(sender.nickname || "");
    setError("");
  }

  async function saveEdit() {
    setSavingEdit(true);
    setError("");
    try {
      const res = await fetch(\`\${API}/v1/domains/\${domain.id}/senders/\${editingSender.id}\`, {
        method: "PATCH",
        headers: { Authorization: \`Bearer \${getToken()}\`, "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: editPrefix.trim() !== editingSender.email.split("@")[0] ? editPrefix.trim() : undefined,
          fromName: editFromName.trim() !== (editingSender.fromName || "") ? editFromName.trim() : undefined,
          nickname: editNickname.trim() !== (editingSender.nickname || "") ? editNickname.trim() : undefined
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingSender(null);
        await fetchSenders();
      } else {
        setError(json.error || "Failed to update sender.");
      }
    } catch {
      setError("Network error");
    } finally {
      setSavingEdit(false);
    }
  }

  async function addSender() {`
);

// Add Edit button next to Delete button
code = code.replace(
  '<button\n                  className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"\n                  onClick={() => deleteSender(sender.id)}\n                >\n                  <Trash size={16} />\n                </button>',
  `<div className="flex items-center gap-1">
                  <button
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                    onClick={() => startEdit(sender)}
                  >
                    Edit
                  </button>
                  <button
                    className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    onClick={() => deleteSender(sender.id)}
                  >
                    <Trash size={16} />
                  </button>
                </div>`
);

// Handle rendering edit form
const editFormJsx = `
        {editingSender ? (
          <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
            <h4 className="font-bold mb-4">Edit Sender Identity</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Sender Nickname</label>
                <input type="text" className="input" placeholder="e.g. Support Team" value={editNickname} onChange={e => setEditNickname(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>From Name</label>
                <input type="text" className="input" placeholder="e.g. Acme Corp" value={editFromName} onChange={e => setEditFromName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Sender Username</label>
                <div className="flex items-center bg-black/5 rounded-xl px-3 border border-black/10 focus-within:ring-2 focus-within:ring-indigo-500/50">
                  <input type="text" placeholder="e.g. noreply" className="bg-transparent border-none outline-none py-2 w-full text-sm" value={editPrefix} onChange={e => setEditPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>@{domain.domain}</span>
                </div>
                {editingSender.usernameEditCount > 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">Note: You have already edited your username {editingSender.usernameEditCount} times. Further edits are subject to rate limits.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button className="btn-secondary flex-1" onClick={() => { setEditingSender(null); setError(""); }}>Cancel</button>
              <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? <RefreshCw size={14} className="animate-spin" /> : null} Save Changes
              </button>
            </div>
          </div>
        ) : showForm ? (
`;

code = code.replace('{showForm ? (', editFormJsx);

fs.writeFileSync(path, code);
console.log('Patched DomainSendersModal.tsx');
