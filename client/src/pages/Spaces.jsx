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
  const roomCount = spaces.length;
  const liveCount = spaces.reduce((sum, space) => sum + (space.voiceRoom?.participantCount || 0), 0);
  const memberCount = spaces.reduce((sum, space) => sum + (space.memberCount || 0), 0);

  return (
    <main className="spaces-lounge-page">
      <style>{globalStyles}</style>
      <div className="spaces-ambient" aria-hidden="true" />

      <section className="spaces-shell">
        <header className="spaces-hero">
          <div className="hero-copy">
            <p className="spaces-eyebrow">MyPOV Spaces</p>
            <h1>Fan rooms with taste.</h1>
            <p className="spaces-subtitle">
              A smoother corner for playful fan wars, sly comebacks, GIF energy, and group-chat drama that knows when to wink.
            </p>
            <div className="stat-row">
              <StatChip label="rooms" value={roomCount} />
              <StatChip label="members" value={memberCount} />
              <StatChip label="in voice" value={liveCount} />
            </div>
          </div>

          <aside className="hero-note">
            <span>tonight's brief</span>
            <strong>Defend your fave. Keep it funny.</strong>
            <p>Private squads, public arenas, and enough mischief to make the timeline useful.</p>
            <button type="button" className="primary-action" onClick={() => setShowCreate((value) => !value)}>
              {showCreate ? "Close creator" : "Create a space"}
            </button>
          </aside>
        </header>

        {featured.length > 0 && (
          <section className="featured-row">
            {featured.map((space) => (
              <SpaceTile key={space._id} space={space} large onJoin={handleJoin} />
            ))}
          </section>
        )}

        <section className="control-bar">
          <div className="scope-switch" aria-label="Spaces scope">
            <button type="button" onClick={() => setScope("discover")} className={scope === "discover" ? "active" : ""}>
              Discover
            </button>
            <button type="button" onClick={() => setScope("mine")} className={scope === "mine" ? "active" : ""}>
              My Spaces
            </button>
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search fandoms, rivalries, titles..."
            className="spaces-search"
          />
        </section>

        {showCreate && (
          <form onSubmit={handleCreate} className="create-panel">
            <div className="panel-heading">
              <span>Space setup</span>
              <strong>Make the room feel like an inside joke.</strong>
            </div>

            <div className="form-grid">
              <label>
                Name
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={3} maxLength={80} />
              </label>
              <label>
                Visibility
                <select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value })}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </label>
              <label className="wide">
                Description
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={500} rows={3} />
              </label>
              <label>
                Cover image URL
                <input value={form.coverUrl} onChange={(event) => setForm({ ...form, coverUrl: event.target.value })} placeholder="https://..." />
              </label>
              <label>
                Tags
                <input value={form.fandomTags} onChange={(event) => setForm({ ...form, fandomTags: event.target.value })} placeholder="Tollywood, Anime, Marvel" />
              </label>
              <label>
                Team A
                <input value={form.teamA} onChange={(event) => setForm({ ...form, teamA: event.target.value })} placeholder="Team Hero" />
              </label>
              <label>
                Team B
                <input value={form.teamB} onChange={(event) => setForm({ ...form, teamB: event.target.value })} placeholder="Team Rival" />
              </label>
            </div>
            <button type="submit" disabled={submitting} className="primary-action panel-submit">
              {submitting ? "Opening..." : "Open the room"}
            </button>
          </form>
        )}

        {error && <div className="spaces-error">{error}</div>}

        {loading ? (
          <div className="spaces-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton-card" />
            ))}
          </div>
        ) : spaces.length === 0 ? (
          <div className="empty-state">
            <h2>No spaces yet.</h2>
            <p>The first funny room always feels slightly illegal.</p>
          </div>
        ) : (
          <div className="spaces-grid">
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

function StatChip({ label, value }) {
  return (
    <div className="stat-chip">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function SpaceTile({ space, large = false, onJoin, inviteCode = "", onInviteCode }) {
  const locked = space.visibility === "private" && !space.viewer?.isMember && !space.viewer?.isInvited;
  const hasCover = Boolean(space.coverUrl);
  const liveCount = space.voiceRoom?.participantCount || 0;

  return (
    <article
      className={`space-card ${large ? "large" : ""}`}
      style={{
        backgroundImage: hasCover
          ? `linear-gradient(180deg, rgba(12,14,24,.08), rgba(12,14,24,.88)), url("${space.coverUrl}")`
          : undefined,
      }}
    >
      <div className="card-topline">
        <span className={`privacy ${space.visibility === "private" ? "private" : ""}`}>{space.visibility}</span>
        <span className="joined">{space.memberCount} joined</span>
      </div>

      <div className="card-main">
        <p className="room-kicker">{liveCount ? `${liveCount} live in voice` : "fresh room energy"}</p>
        <h2>{space.name}</h2>
        <p className="card-copy">{space.description || `${space.teamA} vs ${space.teamB}`}</p>

        <div className="battle-line">
          <span>{space.teamA}</span>
          <strong>vs</strong>
          <span>{space.teamB}</span>
        </div>

        <div className="tag-cloud">
          {(space.fandomTags || []).slice(0, 4).map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      </div>

      {space.viewer?.isMember ? (
        <Link to={`/spaces/${space._id}`} className="card-action">Enter</Link>
      ) : (
        <div className="join-stack">
          {locked && (
            <input
              value={inviteCode}
              onChange={(event) => onInviteCode?.(event.target.value)}
              placeholder="Invite code"
              className="invite-code"
            />
          )}
          <button type="button" className="card-action" onClick={() => onJoin(space)}>
            {space.viewer?.isInvited ? "Accept" : locked ? "Request vibe" : "Join"}
          </button>
        </div>
      )}
    </article>
  );
}

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Inter:wght@500;600;700;800;900&display=swap');

  .spaces-lounge-page {
    min-height: 100vh;
    overflow-x: hidden;
    position: relative;
    color: #f7f3ea;
    background:
      radial-gradient(circle at 18% 8%, rgba(245, 184, 80, .18), transparent 32%),
      radial-gradient(circle at 82% 16%, rgba(81, 196, 184, .16), transparent 30%),
      radial-gradient(circle at 48% 85%, rgba(229, 91, 134, .12), transparent 28%),
      #0b0d14;
    font-family: Inter, system-ui, sans-serif;
  }
  .spaces-ambient {
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px);
    background-size: 44px 44px;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,.9), transparent 82%);
  }
  .spaces-shell {
    position: relative;
    z-index: 1;
    width: min(1240px, calc(100% - 32px));
    margin: 0 auto;
    padding: 44px 0 84px;
  }

  .spaces-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(280px, .6fr);
    gap: 18px;
    align-items: stretch;
    margin-bottom: 22px;
  }
  .hero-copy, .hero-note, .create-panel, .control-bar, .empty-state {
    border: 1px solid rgba(255,255,255,.12);
    background: linear-gradient(180deg, rgba(255,255,255,.105), rgba(255,255,255,.045));
    box-shadow: 0 24px 70px rgba(0,0,0,.32);
    backdrop-filter: blur(18px);
  }
  .hero-copy {
    min-height: 360px;
    border-radius: 28px;
    padding: clamp(28px, 5vw, 58px);
    position: relative;
    overflow: hidden;
  }
  .hero-copy::after {
    content: "JFF, but with standards";
    position: absolute;
    right: 24px;
    top: 22px;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(245,184,80,.15);
    color: #f5b850;
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    border: 1px solid rgba(245,184,80,.32);
  }
  .spaces-eyebrow {
    display: inline-flex;
    margin: 0 0 16px;
    padding: 7px 11px;
    border-radius: 999px;
    border: 1px solid rgba(81,196,184,.35);
    color: #82efe4;
    background: rgba(81,196,184,.08);
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    letter-spacing: .12em;
    text-transform: uppercase;
  }
  .hero-copy h1 {
    max-width: 740px;
    margin: 0;
    font-size: clamp(48px, 8vw, 104px);
    line-height: .88;
    letter-spacing: -0.06em;
    font-weight: 900;
  }
  .spaces-subtitle {
    max-width: 660px;
    margin: 20px 0 0;
    color: rgba(247,243,234,.72);
    font-size: clamp(15px, 2vw, 19px);
    line-height: 1.55;
    font-weight: 600;
  }
  .stat-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 28px;
  }
  .stat-chip {
    min-width: 104px;
    border-radius: 18px;
    padding: 13px 15px;
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(255,255,255,.075);
  }
  .stat-chip strong {
    display: block;
    font-size: 28px;
    line-height: 1;
  }
  .stat-chip span {
    display: block;
    margin-top: 5px;
    color: rgba(247,243,234,.58);
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    text-transform: uppercase;
  }

  .hero-note {
    border-radius: 28px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 320px;
  }
  .hero-note span, .panel-heading span {
    color: #f5b850;
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .14em;
  }
  .hero-note strong {
    display: block;
    margin-top: 16px;
    font-size: 30px;
    line-height: 1.05;
    letter-spacing: -0.04em;
  }
  .hero-note p {
    color: rgba(247,243,234,.62);
    line-height: 1.5;
  }

  .primary-action, .card-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    border: 0;
    border-radius: 999px;
    padding: 0 18px;
    background: linear-gradient(135deg, #f5b850, #e55b86);
    color: #11131b;
    font-weight: 900;
    text-decoration: none;
    cursor: pointer;
    box-shadow: 0 12px 30px rgba(229,91,134,.24);
    transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
  }
  .primary-action:hover, .card-action:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 42px rgba(229,91,134,.32);
    filter: saturate(1.08);
  }
  .primary-action:disabled { opacity: .55; cursor: not-allowed; }

  .featured-row, .spaces-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(282px, 1fr));
    gap: 16px;
  }
  .featured-row { margin-bottom: 18px; }

  .control-bar {
    position: sticky;
    top: 12px;
    z-index: 4;
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    margin: 0 0 18px;
    padding: 12px;
    border-radius: 22px;
  }
  .scope-switch {
    display: flex;
    padding: 4px;
    border-radius: 999px;
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.1);
  }
  .scope-switch button {
    border: 0;
    border-radius: 999px;
    padding: 9px 14px;
    background: transparent;
    color: rgba(247,243,234,.62);
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    text-transform: uppercase;
    cursor: pointer;
  }
  .scope-switch button.active {
    background: rgba(247,243,234,.92);
    color: #11131b;
  }
  .spaces-search {
    flex: 1 1 280px;
    min-width: 220px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.065);
    color: #f7f3ea;
    border-radius: 999px;
    padding: 12px 16px;
    font-family: 'DM Mono', monospace;
    font-size: 13px;
  }
  .spaces-search::placeholder { color: rgba(247,243,234,.42); }

  .create-panel {
    margin-bottom: 18px;
    border-radius: 24px;
    padding: 18px;
  }
  .panel-heading {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .panel-heading strong {
    color: rgba(247,243,234,.72);
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
  }
  .form-grid label {
    display: flex;
    flex-direction: column;
    gap: 7px;
    color: rgba(247,243,234,.64);
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    text-transform: uppercase;
  }
  .form-grid .wide { grid-column: 1 / -1; }
  .form-grid input, .form-grid textarea, .form-grid select {
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(7,9,14,.68);
    color: #f7f3ea;
    border-radius: 16px;
    padding: 12px;
    font-family: 'DM Mono', monospace;
  }
  .panel-submit { margin-top: 14px; }

  .spaces-error {
    border: 1px solid rgba(229,91,134,.35);
    background: rgba(229,91,134,.12);
    color: #ffd5df;
    border-radius: 18px;
    padding: 13px 16px;
    margin-bottom: 18px;
  }

  .space-card {
    min-height: 310px;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border-radius: 26px;
    padding: 18px;
    border: 1px solid rgba(255,255,255,.12);
    background:
      linear-gradient(150deg, rgba(255,255,255,.12), rgba(255,255,255,.035)),
      radial-gradient(circle at 18% 8%, rgba(245,184,80,.20), transparent 34%),
      radial-gradient(circle at 88% 12%, rgba(81,196,184,.18), transparent 30%),
      #11131b;
    background-size: cover;
    background-position: center;
    box-shadow: 0 20px 60px rgba(0,0,0,.3);
    transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
  }
  .space-card:hover {
    transform: translateY(-5px);
    border-color: rgba(245,184,80,.36);
    box-shadow: 0 26px 75px rgba(0,0,0,.38);
  }
  .space-card.large { min-height: 350px; }
  .card-topline {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
  }
  .privacy, .joined, .room-kicker, .tag-cloud span {
    display: inline-flex;
    border-radius: 999px;
    padding: 6px 9px;
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(255,255,255,.1);
    color: rgba(247,243,234,.74);
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    text-transform: uppercase;
  }
  .privacy.private { color: #ffd5df; background: rgba(229,91,134,.14); }
  .joined { color: #d7fff9; background: rgba(81,196,184,.12); }
  .room-kicker { margin: 24px 0 11px; color: #f5b850; background: rgba(245,184,80,.12); }
  .space-card h2 {
    margin: 0;
    font-size: 34px;
    line-height: 1;
    letter-spacing: -0.05em;
    overflow-wrap: anywhere;
  }
  .card-copy {
    min-height: 48px;
    margin: 12px 0 0;
    color: rgba(247,243,234,.68);
    line-height: 1.45;
    font-size: 13px;
  }
  .battle-line {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 8px;
    align-items: center;
    margin-top: 15px;
  }
  .battle-line span, .battle-line strong {
    min-width: 0;
    border-radius: 14px;
    padding: 8px 9px;
    text-align: center;
    background: rgba(255,255,255,.08);
    color: rgba(247,243,234,.78);
    font-size: 12px;
    font-weight: 800;
    overflow-wrap: anywhere;
  }
  .battle-line strong {
    color: #11131b;
    background: #f5b850;
  }
  .tag-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
  }
  .join-stack {
    display: flex;
    align-items: flex-end;
    gap: 9px;
    flex-wrap: wrap;
    margin-top: 18px;
  }
  .invite-code {
    min-width: 148px;
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(7,9,14,.68);
    color: #f7f3ea;
    border-radius: 999px;
    padding: 11px 12px;
    font-family: 'DM Mono', monospace;
  }
  .skeleton-card {
    min-height: 310px;
    border-radius: 26px;
    background: linear-gradient(110deg, rgba(255,255,255,.08), rgba(255,255,255,.16), rgba(255,255,255,.08));
    animation: shimmer 1.3s ease infinite;
  }
  .empty-state {
    border-radius: 24px;
    padding: 56px 20px;
    text-align: center;
  }
  .empty-state h2 {
    margin: 0;
    font-size: 34px;
    letter-spacing: -0.04em;
  }
  .empty-state p {
    margin: 8px 0 0;
    color: rgba(247,243,234,.62);
  }

  @keyframes shimmer {
    0%, 100% { opacity: .55; }
    50% { opacity: 1; }
  }

  @media (max-width: 880px) {
    .spaces-hero { grid-template-columns: 1fr; }
    .control-bar { position: relative; top: auto; }
  }
  @media (max-width: 560px) {
    .spaces-shell { width: min(100% - 18px, 1240px); padding-top: 28px; }
    .hero-copy::after { position: static; display: inline-flex; margin-top: 18px; }
    .battle-line { grid-template-columns: 1fr; }
  }
`;

export default Spaces;
