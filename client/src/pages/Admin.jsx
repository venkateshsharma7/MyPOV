import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { getMoviePath } from "../utils/movieLinks";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "entries", label: "Entries" },
  { id: "users", label: "Users" },
  { id: "moderation", label: "Moderation" },
  { id: "settings", label: "Settings" },
  { id: "logs", label: "Activity Logs" },
  { id: "system", label: "System" },
];

function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingModeration, setPendingModeration] = useState([]);
  const [settings, setSettings] = useState({});
  const [logs, setLogs] = useState([]);
  const [systemInfo, setSystemInfo] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    setRefreshing(true);
    try {
      const [entriesRes, usersRes, pendingRes, settingsRes, logsRes, systemRes] = await Promise.all([
        apiFetch("/admin/entries/all"),
        apiFetch("/admin/users"),
        apiFetch("/admin/moderation/pending"),
        apiFetch("/admin/settings"),
        apiFetch("/admin/logs"),
        apiFetch("/admin/system"),
      ]);
      setEntries(entriesRes);
      setUsers(usersRes);
      setPendingModeration(pendingRes);
      setSettings(settingsRes);
      setLogs(logsRes);
      setSystemInfo(systemRes);
      setError("");
    } catch (err) {
      console.error("Admin load error:", err);
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const deleteEntry = async (id) => {
    if (!confirm("Delete this entry permanently?")) return;
    try {
      await apiFetch(`/admin/entries/${id}`, { method: "DELETE" });
      setEntries(prev => prev.filter(e => e._id !== id));
    } catch (err) {
      alert("Delete failed");
    }
  };

  const updateEntry = async (id, data) => {
    try {
      const updated = await apiFetch(`/admin/entries/${id}`, { method: "PUT", body: JSON.stringify(data) });
      setEntries(prev => prev.map(e => e._id === id ? updated : e));
    } catch (err) {
      alert("Update failed");
    }
  };

  const updateUserRole = async (id, role) => {
    try {
      const updated = await apiFetch(`/admin/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) });
      setUsers(prev => prev.map(u => u._id === id ? updated : u));
    } catch (err) {
      alert("Role update failed");
    }
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user? This will also delete their entries.")) return;
    try {
      await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
      setUsers(prev => prev.filter(u => u._id !== id));
      // Also remove their entries from local state
      setEntries(prev => prev.filter(e => e.user?._id !== id && e.user !== id));
    } catch (err) {
      alert("User delete failed");
    }
  };

  const approvePost = async (id) => {
    try {
      await apiFetch(`/admin/moderation/${id}/approve`, { method: "POST" });
      setPendingModeration(prev => prev.filter(p => p._id !== id));
      // Refresh entries to show the approved post publicly
      const updatedEntries = await apiFetch("/admin/entries/all");
      setEntries(updatedEntries);
    } catch (err) {
      alert("Approval failed");
    }
  };

  const rejectPost = async (id) => {
    if (!confirm("Reject and delete this post?")) return;
    try {
      await apiFetch(`/admin/moderation/${id}/reject`, { method: "POST" });
      setPendingModeration(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      alert("Rejection failed");
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const updated = await apiFetch("/admin/settings", { method: "PUT", body: JSON.stringify(newSettings) });
      setSettings(updated);
      alert("Settings saved");
    } catch (err) {
      alert("Settings update failed");
    }
  };

  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="glass-card p-6">
        <p className="stat-label">Total Users</p>
        <p className="stat-number">{users.length}</p>
      </div>
      <div className="glass-card p-6">
        <p className="stat-label">Total Entries</p>
        <p className="stat-number">{entries.length}</p>
      </div>
      <div className="glass-card p-6">
        <p className="stat-label">Pending Moderation</p>
        <p className="stat-number">{pendingModeration.length}</p>
      </div>
      <div className="glass-card p-6 col-span-1 md:col-span-3">
        <p className="stat-label">Recent Activity</p>
        <div className="mt-4 space-y-2">
          {logs.slice(0, 10).map(log => (
            <div key={log._id} className="text-sm text-amber-400/70 border-b border-amber-400/20 py-2">
              <span>{log.user?.username || "System"}</span> – {log.type} – {new Date(log.createdAt).toLocaleString()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEntries = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b border-amber-400/30">
          <tr><th className="py-3">Title</th><th>User</th><th>Rating</th><th>Public</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry._id} className="border-b border-white/10">
              <td className="py-3">
                <Link to={`/post/${entry._id}`} className="hover:text-amber-400">{entry.title}</Link>
                <Link to={getMoviePath(entry)} className="ml-3 text-xs text-amber-400/70 hover:text-amber-300">Movie Page</Link>
              </td>
              <td>{entry.user?.username || "?"}</td>
              <td>{entry.rating}/10</td>
              <td>{entry.isPublic ? "✅" : "🔒"}</td>
              <td className="space-x-2">
                <button onClick={() => updateEntry(entry._id, { isPublic: !entry.isPublic })} className="text-blue-400">Toggle Public</button>
                <button onClick={() => deleteEntry(entry._id)} className="text-red-400">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderUsers = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b border-amber-400/30"><tr><th>Username</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id} className="border-b border-white/10">
              <td className="py-3">{user.username}</td>
              <td>{user.email}</td>
              <td>
                <select value={user.role || "user"} onChange={e => updateUserRole(user._id, e.target.value)} className="bg-black/50 rounded px-2 py-1">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              <td><button onClick={() => deleteUser(user._id)} className="text-red-400">Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderModeration = () => (
    <div className="space-y-6">
      {pendingModeration.length === 0 ? (
        <p className="text-gray-400">No pending posts to moderate.</p>
      ) : (
        pendingModeration.map(post => (
          <div key={post._id} className="glass-card p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-serif">{post.title}</h3>
                <p className="text-sm text-amber-400/70">by {post.user?.username}</p>
                <p className="mt-2">{post.review.substring(0, 200)}...</p>
                <p className="text-sm mt-1">Rating: ⭐ {post.rating}/10</p>
              </div>
              <div className="space-x-3">
                <button onClick={() => approvePost(post._id)} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">Approve</button>
                <button onClick={() => rejectPost(post._id)} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">Reject</button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderSettings = () => (
    <form onSubmit={e => { e.preventDefault(); updateSettings(settings); }} className="space-y-6 max-w-xl">
      <div><label className="block text-sm uppercase mb-2">Site Name</label><input type="text" value={settings.siteName || ""} onChange={e => setSettings({...settings, siteName: e.target.value})} className="w-full bg-black/50 border border-amber-400/30 rounded px-4 py-2" /></div>
      <div><label className="block text-sm uppercase mb-2">Allow Registrations</label><input type="checkbox" checked={settings.allowRegistrations} onChange={e => setSettings({...settings, allowRegistrations: e.target.checked})} className="w-5 h-5" /></div>
      <div><label className="block text-sm uppercase mb-2">Maintenance Mode</label><input type="checkbox" checked={settings.maintenanceMode} onChange={e => setSettings({...settings, maintenanceMode: e.target.checked})} /></div>
      <div><label className="block text-sm uppercase mb-2">OMDB API Key</label><input type="text" value={settings.omdbKey || ""} onChange={e => setSettings({...settings, omdbKey: e.target.value})} className="w-full bg-black/50 border rounded px-4 py-2" /></div>
      <div><label className="block text-sm uppercase mb-2">TMDB API Key</label><input type="text" value={settings.tmdbKey || ""} onChange={e => setSettings({...settings, tmdbKey: e.target.value})} className="w-full bg-black/50 border rounded px-4 py-2" /></div>
      <button type="submit" className="bg-amber-600 hover:bg-amber-700 px-6 py-2 rounded">Save Settings</button>
    </form>
  );

  const renderLogs = () => (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {logs.map(log => (
        <div key={log._id} className="border-b border-white/10 py-3">
          <span className="text-amber-400">{log.user?.username || "System"}</span> – <span className="text-sm">{log.type}</span> – {log.movieTitle && `"${log.movieTitle}"`} – {new Date(log.createdAt).toLocaleString()}
        </div>
      ))}
    </div>
  );

  const renderSystem = () => (
    <div className="space-y-4">
      <div><span className="font-mono text-amber-400">Node Version:</span> {systemInfo.nodeVersion}</div>
      <div><span className="font-mono text-amber-400">Uptime:</span> {Math.floor(systemInfo.uptime / 3600)} hours</div>
      <div><span className="font-mono text-amber-400">Memory Usage:</span> {Math.round(systemInfo.memory?.rss / 1024 / 1024)} MB</div>
      <div><span className="font-mono text-amber-400">Environment:</span> {systemInfo.env}</div>
    </div>
  );

  if (loading) return <div className="p-10 text-center">Loading admin panel...</div>;
  if (error) return <div className="p-10 text-center text-red-400">{error}</div>;

  return (
    <div className="min-h-screen bg-[#07060a] text-[#f5f0e8] px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-serif">Admin Console</h1>
          <button onClick={loadAll} disabled={refreshing} className="glass-btn px-4 py-2 rounded-full border border-amber-400/40">
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-amber-400/30 mb-8">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-3 font-mono text-sm uppercase tracking-wide transition ${activeTab === tab.id ? "text-amber-400 border-b-2 border-amber-400" : "text-white/60 hover:text-white"}`}>{tab.label}</button>
          ))}
        </div>
        <div className="mt-6">
          {activeTab === "dashboard" && renderDashboard()}
          {activeTab === "entries" && renderEntries()}
          {activeTab === "users" && renderUsers()}
          {activeTab === "moderation" && renderModeration()}
          {activeTab === "settings" && renderSettings()}
          {activeTab === "logs" && renderLogs()}
          {activeTab === "system" && renderSystem()}
        </div>
      </div>
      <style>{`
        .glass-card { background: rgba(10,8,3,0.6); backdrop-filter: blur(8px); border: 1px solid rgba(212,175,55,0.12); border-radius: 20px; }
        .stat-label { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 1.5px; color: rgba(212,175,55,0.7); }
        .stat-number { font-family: 'Cormorant Garamond', serif; font-size: 2rem; }
        .glass-btn { background: rgba(255,255,255,0.05); backdrop-filter: blur(4px); transition: all 0.2s; }
        .glass-btn:hover { background: rgba(212,175,55,0.2); border-color: #d4af37; }
      `}</style>
    </div>
  );
}

export default Admin;
