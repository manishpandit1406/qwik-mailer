"use client";
import { useState, useEffect } from "react";
import { Activity, Search, Filter, Mail, CheckCircle, AlertTriangle, ChevronRight, XCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("mf_token");
  }
  return null;
}

export default function ActivityFeedPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");

  async function fetchActivity() {
    setLoading(true);
    try {
      const url = new URL(`${API}/v1/analytics/activity`);
      if (searchEmail) url.searchParams.append("toEmail", searchEmail);
      if (eventTypeFilter) url.searchParams.append("eventType", eventTypeFilter);
      
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setEvents(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchActivity();
  }, [eventTypeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchActivity();
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "delivered": return <CheckCircle size={16} className="text-green-500" />;
      case "bounced": return <XCircle size={16} className="text-red-500" />;
      case "opened": return <Activity size={16} className="text-blue-500" />;
      case "clicked": return <ChevronRight size={16} className="text-purple-500" />;
      case "queued": return <Mail size={16} className="text-gray-500" />;
      default: return <AlertTriangle size={16} className="text-amber-500" />;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "delivered": return "badge-success";
      case "bounced": return "badge-error";
      case "opened": return "badge-info";
      case "clicked": return "badge-warning";
      case "queued": return "badge-neutral";
      default: return "badge-neutral";
    }
  };

  return (
    <div className="max-w-6xl mx-auto ">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Activity Feed</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Troubleshoot delivery and track granular email events in real-time.
          </p>
        </div>
      </div>

      <div className="glass-card p-4 mb-6 flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by recipient email..."
              className="input pl-9"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">Search</button>
        </form>
        
        <div className="relative">
          <select
            className="input appearance-none pl-10 pr-8 bg-transparent"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
          >
            <option value="">All Events</option>
            <option value="queued">Queued</option>
            <option value="delivered">Delivered</option>
            <option value="opened">Opened</option>
            <option value="clicked">Clicked</option>
            <option value="bounced">Bounced</option>
            <option value="complained">Complained</option>
          </select>
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>Loading events...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Activity size={48} className="mb-4 opacity-20" style={{ color: "var(--text-muted)" }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>No events found</h3>
            <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
              No activity matches your current filters. Try adjusting your search criteria or sending an email to generate events.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-muted)" }}>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider">Time</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider">Event</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider">Recipient</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider">Subject</th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-black/5 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {new Date(ev.occurredAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(ev.occurredAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`${getEventBadge(ev.type)} capitalize inline-flex items-center gap-1`}>
                        {getEventIcon(ev.type)} {ev.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {ev.email?.toEmail || "Unknown"}
                      </div>
                      {ev.email?.messageId && (
                        <div className="text-xs font-mono truncate max-w-[150px]" style={{ color: "var(--text-muted)" }} title={ev.email.messageId}>
                          {ev.email.messageId}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm" style={{ color: "var(--text-primary)" }}>
                      <span className="truncate block max-w-[200px]" title={ev.email?.subject}>
                        {ev.email?.subject || "-"}
                      </span>
                    </td>
                    <td className="p-4">
                      {ev.type === "bounced" || ev.type === "failed" ? (
                        <span className="text-xs text-red-500 font-medium line-clamp-2">
                          {ev.metadata?.error || "Delivery failed"}
                        </span>
                      ) : ev.ip ? (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          IP: {ev.ip}
                        </span>
                      ) : (
                        <span className="text-xs italic" style={{ color: "var(--text-muted)" }}>No additional details</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
