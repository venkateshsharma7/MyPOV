import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createSpace, getSpaces, joinSpace } from "../api/spaces";

const emptyForm = {
  name: "",
  description: "",
  coverUrl: "",
  visibility: "public",
  fandomTags: "",
  teamA: "",
  teamB: "",
};

function Spaces() {
  const navigate = useNavigate();
  const [scope, setScope] = useState("discover");
  const [query, setQuery] = useState("");
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [inviteCodes, setInviteCodes] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSpaces();
    }, query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [scope, query]);

  async function loadSpaces() {
    try {
      setLoading(true);
      setError("");
      const data = await getSpaces({ scope, q: query });
      setSpaces(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load spaces");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      const space = await createSpace({
        ...form,
        fandomTags: form.fandomTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      setForm(emptyForm);
      setShowCreate(false);
      navigate(`/spaces/${space._id}`);
    } catch (err) {
      setError(err.message || "Failed to create space");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin(space) {
    try {
      setError("");
      const code = inviteCodes[space._id] || "";
      const joined = await joinSpace(space._id, code);
      navigate(`/spaces/${joined._id}`);
    } catch (err) {
      setError(err.message || "Could not join this space");
    }
  }

  const featured = useMemo(() => spaces.slice(0, 3), [spaces]);

  return (
    <main style={styles.page}>
      <style>{globalStyles}</style>
      <div style={styles.vignette} />
      <section style={styles.shell}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>MyPOV Spaces</p>
            <h1 style={styles.title}>Fan Wars, JFF.</h1>
            <p style={styles.subtitle}>
              Public and private rooms for hot takes, GIF replies, team banter, and movie-night chaos.
            </p>
          </div>
          <button type="button" style={styles.primaryButton} onClick={() => setShowCreate((value) => !value)}>
            {showCreate ? "Close" : "Create Space"}
          </button>
        </header>

        {featured.length > 0 && (
          <div style={styles.featuredGrid}>
            {featured.map((space) => (
              <SpaceTile key={space._id} space={space} large onJoin={handleJoin} />
            ))}
          </div>
        )}

        <section style={styles.controls}>
          <div style={styles.segmented}>
            <button
              type="button"
              onClick={() => setScope("discover")}
              style={{ ...styles.segment, ...(scope === "discover" ? styles.segmentActive : {}) }}
            >
              Discover
            </button>
            <button
              type="button"
              onClick={() => setScope("mine")}
              style={{ ...styles.segment, ...(scope === "mine" ? styles.segmentActive : {}) }}
            >
              My Spaces
            </button>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search fandoms, ships, titles..."
            style={styles.search}
          />
        </section>

        {showCreate && (
          <form onSubmit={handleCreate} style={styles.createPanel}>
            <div style={styles.formGrid}>
              <label style={styles.label}>
                Name
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={3} maxLength={80} style={styles.input} />
              </label>
              <label style={styles.label}>
                Visibility
                <select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value })} style={styles.input}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </label>
              <label style={styles.labelWide}>
                Description
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={500} rows={3} style={styles.textarea} />
              </label>
              <label style={styles.label}>
                Cover image URL
                <input value={form.coverUrl} onChange={(event) => setForm({ ...form, coverUrl: event.target.value })} placeholder="https://..." style={styles.input} />
              </label>
              <label style={styles.label}>
                Tags
                <input value={form.fandomTags} onChange={(event) => setForm({ ...form, fandomTags: event.target.value })} placeholder="Marvel, KDrama, Anime" style={styles.input} />
              </label>
              <label style={styles.label}>
                Team A
                <input value={form.teamA} onChange={(event) => setForm({ ...form, teamA: event.target.value })} placeholder="Team Hero" style={styles.input} />
              </label>
              <label style={styles.label}>
                Team B
                <input value={form.teamB} onChange={(event) => setForm({ ...form, teamB: event.target.value })} placeholder="Team Villain" style={styles.input} />
              </label>
            </div>
            <div style={styles.formActions}>
              <button type="submit" disabled={submitting} style={styles.primaryButton}>
                {submitting ? "Creating..." : "Open Space"}
              </button>
            </div>
          </form>
        )}

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <div style={styles.loadingGrid}>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} style={styles.skeleton} />
            ))}
          </div>
        ) : spaces.length === 0 ? (
          <div style={styles.empty}>
            <h2 style={styles.emptyTitle}>No spaces found.</h2>
            <p style={styles.emptyCopy}>Create the first one and start the argument politely.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {spaces.map((space) => (
              <SpaceTile
                key={space._id}
                space={space}
                onJoin={handleJoin}
                inviteCode={inviteCodes[space._id] || ""}
                onInviteCode={(value) => setInviteCodes((prev) => ({ ...prev, [space._id]: value }))}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function SpaceTile({ space, large = false, onJoin, inviteCode = "", onInviteCode }) {
  const locked = space.visibility === "private" && !space.viewer?.isMember && !space.viewer?.isInvited;
  const background = space.coverUrl
    ? `linear-gradient(180deg, rgba(7,6,10,0.16), rgba(7,6,10,0.96)), url("${space.coverUrl}")`
    : "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(95,176,160,0.12)), #100d12";

  return (
    <article style={{ ...styles.tile, ...(large ? styles.tileLarge : {}), backgroundImage: background }}>
      <div style={styles.tileTop}>
        <span style={styles.badge}>{space.visibility}</span>
        <span style={styles.memberCount}>{space.memberCount} joined</span>
      </div>
      <div>
        <h2 style={styles.tileTitle}>{space.name}</h2>
        <p style={styles.tileCopy}>{space.description || `${space.teamA} vs ${space.teamB}`}</p>
        <div style={styles.teamRow}>
          <span style={styles.team}>{space.teamA}</span>
          <span style={styles.vs}>VS</span>
          <span style={styles.team}>{space.teamB}</span>
        </div>
        <div style={styles.tagRow}>
          {(space.fandomTags || []).slice(0, 4).map((tag) => (
            <span key={tag} style={styles.tag}>#{tag}</span>
          ))}
        </div>
      </div>
      {space.viewer?.isMember ? (
        <Link to={`/spaces/${space._id}`} style={styles.tileButton}>Enter</Link>
      ) : (
        <div style={styles.joinBox}>
          {locked && (
            <input
              value={inviteCode}
              onChange={(event) => onInviteCode?.(event.target.value)}
              placeholder="Invite code"
              style={styles.inviteInput}
            />
          )}
          <button type="button" style={styles.tileButton} onClick={() => onJoin(space)}>
            {space.viewer?.isInvited ? "Accept Invite" : locked ? "Join Private" : "Join"}
          </button>
        </div>
      )}
    </article>
  );
}

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Mono:wght@300;400;500&family=Cinzel:wght@400;600&display=swap');
  input:focus, textarea:focus, select:focus { outline: 1px solid rgba(212,175,55,0.45); }
  @keyframes pulseSpace { 0%, 100% { opacity: .45 } 50% { opacity: .85 } }
`;

const styles = {
  page: { minHeight: "100vh", background: "#07060a", color: "#f5f0e8", position: "relative", overflow: "hidden" },
  vignette: { position: "fixed", inset: 0, background: "radial-gradient(circle at 18% 8%, rgba(212,175,55,.08), transparent 28%), radial-gradient(circle at 85% 18%, rgba(76,190,170,.08), transparent 30%)", pointerEvents: "none" },
  shell: { maxWidth: 1220, margin: "0 auto", padding: "38px 22px 80px", position: "relative", zIndex: 1 },
  header: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 24 },
  eyebrow: { margin: "0 0 8px", color: "#d4af37", fontFamily: "'DM Mono', monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: ".22em" },
  title: { margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(40px, 7vw, 78px)", lineHeight: .9, fontWeight: 300 },
  subtitle: { maxWidth: 640, margin: "14px 0 0", color: "rgba(245,240,232,.68)", fontFamily: "'DM Mono', monospace", fontSize: 13, lineHeight: 1.7 },
  primaryButton: { border: "1px solid rgba(212,175,55,.5)", background: "#d4af37", color: "#09070a", borderRadius: 8, padding: "12px 18px", fontFamily: "'Cinzel', serif", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, cursor: "pointer" },
  featuredGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 18 },
  controls: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "24px 0 18px" },
  segmented: { display: "flex", padding: 4, border: "1px solid rgba(212,175,55,.2)", borderRadius: 8, background: "rgba(255,255,255,.035)" },
  segment: { border: 0, background: "transparent", color: "rgba(245,240,232,.64)", borderRadius: 6, padding: "9px 14px", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", fontSize: 11, letterSpacing: ".1em", cursor: "pointer" },
  segmentActive: { background: "rgba(212,175,55,.16)", color: "#d4af37" },
  search: { flex: "1 1 260px", minWidth: 220, border: "1px solid rgba(212,175,55,.2)", background: "rgba(255,255,255,.04)", color: "#f5f0e8", borderRadius: 8, padding: "11px 13px", fontFamily: "'DM Mono', monospace" },
  createPanel: { border: "1px solid rgba(212,175,55,.18)", background: "rgba(255,255,255,.045)", borderRadius: 8, padding: 18, marginBottom: 20 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 13 },
  label: { display: "flex", flexDirection: "column", gap: 7, color: "rgba(212,175,55,.78)", fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" },
  labelWide: { gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 7, color: "rgba(212,175,55,.78)", fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" },
  input: { border: "1px solid rgba(212,175,55,.2)", background: "rgba(7,6,10,.65)", color: "#f5f0e8", borderRadius: 7, padding: "10px 11px", fontFamily: "'DM Mono', monospace" },
  textarea: { border: "1px solid rgba(212,175,55,.2)", background: "rgba(7,6,10,.65)", color: "#f5f0e8", borderRadius: 7, padding: 11, fontFamily: "'DM Mono', monospace", resize: "vertical" },
  formActions: { marginTop: 14, display: "flex", justifyContent: "flex-end" },
  error: { border: "1px solid rgba(248,113,113,.25)", background: "rgba(248,113,113,.1)", color: "#fecaca", borderRadius: 8, padding: 12, marginBottom: 16, fontFamily: "'DM Mono', monospace", fontSize: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 14 },
  loadingGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 14 },
  skeleton: { height: 260, borderRadius: 8, background: "rgba(212,175,55,.08)", animation: "pulseSpace 1.4s ease infinite" },
  tile: { minHeight: 260, borderRadius: 8, border: "1px solid rgba(212,175,55,.16)", backgroundSize: "cover", backgroundPosition: "center", padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 18px 50px rgba(0,0,0,.28)" },
  tileLarge: { minHeight: 300 },
  tileTop: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  badge: { border: "1px solid rgba(212,175,55,.28)", color: "#d4af37", background: "rgba(7,6,10,.68)", borderRadius: 6, padding: "5px 8px", fontFamily: "'DM Mono', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: ".12em" },
  memberCount: { color: "rgba(245,240,232,.72)", fontFamily: "'DM Mono', monospace", fontSize: 11 },
  tileTitle: { margin: "28px 0 8px", fontFamily: "'Cormorant Garamond', serif", fontSize: 31, lineHeight: 1.05, fontWeight: 600 },
  tileCopy: { minHeight: 42, margin: 0, color: "rgba(245,240,232,.7)", fontFamily: "'DM Mono', monospace", fontSize: 12, lineHeight: 1.55 },
  teamRow: { marginTop: 13, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  team: { color: "#f5f0e8", border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.06)", borderRadius: 6, padding: "5px 8px", fontFamily: "'DM Mono', monospace", fontSize: 11 },
  vs: { color: "#d4af37", fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 800 },
  tagRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 },
  tag: { color: "rgba(212,175,55,.76)", fontFamily: "'DM Mono', monospace", fontSize: 11 },
  tileButton: { alignSelf: "flex-start", marginTop: 18, textDecoration: "none", border: "1px solid rgba(212,175,55,.45)", background: "rgba(212,175,55,.95)", color: "#09070a", borderRadius: 7, padding: "9px 14px", fontFamily: "'Cinzel', serif", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, fontSize: 12, cursor: "pointer" },
  joinBox: { display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" },
  inviteInput: { minWidth: 150, border: "1px solid rgba(212,175,55,.22)", background: "rgba(7,6,10,.75)", color: "#f5f0e8", borderRadius: 7, padding: "9px 10px", fontFamily: "'DM Mono', monospace", fontSize: 12 },
  empty: { border: "1px dashed rgba(212,175,55,.22)", borderRadius: 8, minHeight: 220, display: "grid", placeItems: "center", textAlign: "center", padding: 20 },
  emptyTitle: { margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: 30 },
  emptyCopy: { margin: "8px 0 0", color: "rgba(245,240,232,.58)", fontFamily: "'DM Mono', monospace", fontSize: 12 },
};

export default Spaces;
