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
    <main className="spaces-chaos-page">
      <style>{globalStyles}</style>

      <div className="chaos-noise" aria-hidden="true" />
      <div className="ticker ticker-top" aria-hidden="true">
        <span>HOT TAKES ONLY *** FAN WAR LOBBY *** JFF MODE *** PICK A SIDE *** NO BORING ENERGY *** </span>
      </div>

      <section className="chaos-shell">
        <header className="chaos-hero">
          <div className="hero-copy">
            <p className="chaos-eyebrow">MyPOV Spaces</p>
            <h1>FAN WAR PLAYGROUND</h1>
            <p className="chaos-subtitle">
              Loud rooms for ridiculous takes, GIF comebacks, team loyalty, and harmless chaos.
            </p>
            <div className="stat-row">
              <StatChip label="rooms" value={roomCount} />
              <StatChip label="people" value={memberCount} />
              <StatChip label="voice live" value={liveCount} />
            </div>
          </div>

          <div className="hero-panel">
            <div className="hero-card-smash">
              <span className="burst-label">JFF</span>
              <strong>Start a room. Pick teams. Let the takes fly.</strong>
              <button type="button" className="chaos-primary" onClick={() => setShowCreate((value) => !value)}>
                {showCreate ? "Close Lab" : "Create Madness"}
              </button>
            </div>
          </div>
        </header>

        {featured.length > 0 && (
          <section className="featured-chaos">
            {featured.map((space, index) => (
              <SpaceTile key={space._id} index={index} space={space} large onJoin={handleJoin} />
            ))}
          </section>
        )}

        <section className="control-deck">
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
            placeholder="Search fandoms, ships, titles..."
            className="chaos-search"
          />
        </section>

        {showCreate && (
          <form onSubmit={handleCreate} className="create-lab">
            <div className="lab-header">
              <span>ROOM BUILDER</span>
              <strong>Make it unhinged, but JFF.</strong>
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
            <button type="submit" disabled={submitting} className="chaos-primary lab-submit">
              {submitting ? "Launching..." : "Launch Space"}
            </button>
          </form>
        )}

        {error && <div className="chaos-error">{error}</div>}

        {loading ? (
          <div className="chaos-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton-card" />
            ))}
          </div>
        ) : spaces.length === 0 ? (
          <div className="empty-chaos">
            <h2>No rooms yet.</h2>
            <p>Someone has to light the scoreboard. Might as well be you.</p>
          </div>
        ) : (
          <div className="chaos-grid">
            {spaces.map((space, index) => (
              <SpaceTile
                key={space._id}
                index={index}
                space={space}
                onJoin={handleJoin}
                inviteCode={inviteCodes[space._id] || ""}
                onInviteCode={(value) => setInviteCodes((prev) => ({ ...prev, [space._id]: value }))}
              />
            ))}
          </div>
        )}
      </section>

      <div className="ticker ticker-bottom" aria-hidden="true">
        <span>SHIP DEFENSE *** MASS ENTRY *** ROAST RESPONSIBLY *** FAN BADGES SOON *** CHAOS NEVER SLEEPS *** </span>
      </div>
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

function SpaceTile({ space, index = 0, large = false, onJoin, inviteCode = "", onInviteCode }) {
  const locked = space.visibility === "private" && !space.viewer?.isMember && !space.viewer?.isInvited;
  const hasCover = Boolean(space.coverUrl);
  const liveCount = space.voiceRoom?.participantCount || 0;
  const tilt = index % 2 === 0 ? "tilt-left" : "tilt-right";

  return (
    <article
      className={`space-tile ${large ? "large" : ""} ${tilt}`}
      style={{
        backgroundImage: hasCover
          ? `linear-gradient(180deg, rgba(9,3,20,.08), rgba(9,3,20,.93)), url("${space.coverUrl}")`
          : undefined,
      }}
    >
      <div className="tile-stripes" aria-hidden="true" />
      <div className="tile-topline">
        <span className={`privacy ${space.visibility === "private" ? "private" : ""}`}>{space.visibility}</span>
        <span className="joined">{space.memberCount} joined</span>
      </div>

      <div className="tile-body">
        <p className="room-tagline">{liveCount ? `${liveCount} yelling in voice` : "fresh takes wanted"}</p>
        <h2>{space.name}</h2>
        <p className="tile-copy">{space.description || `${space.teamA} vs ${space.teamB}`}</p>

        <div className="battle-board">
          <span>{space.teamA}</span>
          <strong>VS</strong>
          <span>{space.teamB}</span>
        </div>

        <div className="tag-cloud">
          {(space.fandomTags || []).slice(0, 4).map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      </div>

      {space.viewer?.isMember ? (
        <Link to={`/spaces/${space._id}`} className="tile-cta">Enter Arena</Link>
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
          <button type="button" className="tile-cta" onClick={() => onJoin(space)}>
            {space.viewer?.isInvited ? "Accept Invite" : locked ? "Crack Private" : "Jump In"}
          </button>
        </div>
      )}
    </article>
  );
}

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Black+Ops+One&family=DM+Mono:wght@300;400;500&family=Inter:wght@600;800;900&display=swap');

  .spaces-chaos-page {
    min-height: 100vh;
    color: #19051f;
    overflow-x: hidden;
    position: relative;
    background:
      linear-gradient(135deg, rgba(255,255,255,.12) 25%, transparent 25%) 0 0 / 18px 18px,
      linear-gradient(225deg, rgba(0,0,0,.10) 25%, transparent 25%) 0 0 / 18px 18px,
      linear-gradient(120deg, #ffef3d 0%, #ff4fd8 32%, #35f4ff 63%, #75ff63 100%);
  }

  .chaos-noise {
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: .18;
    background-image:
      repeating-linear-gradient(0deg, rgba(25,5,31,.24) 0 1px, transparent 1px 6px),
      radial-gradient(circle at 20% 20%, rgba(255,255,255,.6) 0 1px, transparent 1px 8px);
    mix-blend-mode: multiply;
    z-index: 0;
  }

  .ticker {
    position: fixed;
    left: 0;
    right: 0;
    z-index: 5;
    height: 32px;
    overflow: hidden;
    display: flex;
    align-items: center;
    border-block: 3px solid #19051f;
    background: #19051f;
    color: #fff236;
    font-family: 'Black Ops One', system-ui;
    letter-spacing: .08em;
    font-size: 14px;
    transform: rotate(-1deg);
  }
  .ticker span {
    white-space: nowrap;
    animation: ticker 22s linear infinite;
  }
  .ticker-top { top: 7px; }
  .ticker-bottom { bottom: 8px; transform: rotate(1deg); }

  .chaos-shell {
    position: relative;
    z-index: 1;
    width: min(1260px, calc(100% - 28px));
    margin: 0 auto;
    padding: 72px 0 92px;
  }

  .chaos-hero {
    min-height: 430px;
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(280px, .75fr);
    gap: 26px;
    align-items: stretch;
    margin-bottom: 28px;
  }

  .hero-copy {
    position: relative;
    padding: clamp(24px, 5vw, 52px);
    border: 5px solid #19051f;
    background:
      repeating-linear-gradient(-12deg, rgba(255,255,255,.35) 0 9px, transparent 9px 18px),
      #fffaf0;
    box-shadow: 14px 14px 0 #19051f;
    transform: rotate(-1deg);
  }
  .hero-copy::after {
    content: 'BANG!';
    position: absolute;
    right: 24px;
    top: 22px;
    padding: 8px 16px;
    border: 4px solid #19051f;
    background: #75ff63;
    font-family: 'Bangers', cursive;
    font-size: 32px;
    transform: rotate(9deg);
  }

  .chaos-eyebrow {
    margin: 0 0 12px;
    display: inline-flex;
    padding: 8px 13px;
    border: 3px solid #19051f;
    background: #35f4ff;
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .2em;
    font-weight: 900;
  }
  .hero-copy h1 {
    margin: 0;
    max-width: 760px;
    font-family: 'Bangers', cursive;
    font-size: clamp(64px, 12vw, 148px);
    line-height: .78;
    letter-spacing: .02em;
    color: #19051f;
    text-shadow: 6px 6px 0 #ffef3d, 10px 10px 0 #ff4fd8;
  }
  .chaos-subtitle {
    max-width: 650px;
    margin: 26px 0 0;
    font-family: Inter, system-ui;
    font-size: clamp(16px, 2vw, 22px);
    line-height: 1.35;
    font-weight: 900;
  }

  .stat-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 26px;
  }
  .stat-chip {
    min-width: 106px;
    padding: 10px 14px;
    border: 3px solid #19051f;
    background: #ffef3d;
    box-shadow: 5px 5px 0 #19051f;
    transform: skew(-6deg);
  }
  .stat-chip strong {
    display: block;
    font-family: 'Black Ops One', system-ui;
    font-size: 26px;
  }
  .stat-chip span {
    display: block;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    text-transform: uppercase;
  }

  .hero-panel {
    display: grid;
    align-items: end;
  }
  .hero-card-smash {
    min-height: 330px;
    padding: 26px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border: 5px solid #19051f;
    background:
      radial-gradient(circle at 30% 24%, #fff 0 2px, transparent 3px 10px),
      #ff4fd8;
    box-shadow: -12px 14px 0 #19051f;
    transform: rotate(2deg);
  }
  .burst-label {
    width: 110px;
    height: 110px;
    display: grid;
    place-items: center;
    border: 4px solid #19051f;
    border-radius: 999px;
    background: #fff236;
    font-family: 'Bangers', cursive;
    font-size: 48px;
    transform: rotate(-13deg);
  }
  .hero-card-smash strong {
    font-family: Inter, system-ui;
    font-size: 28px;
    line-height: 1.05;
    font-weight: 900;
  }

  .chaos-primary, .tile-cta {
    border: 4px solid #19051f;
    background: #75ff63;
    color: #19051f;
    box-shadow: 6px 6px 0 #19051f;
    padding: 12px 18px;
    font-family: 'Black Ops One', system-ui;
    font-size: 14px;
    text-transform: uppercase;
    text-decoration: none;
    cursor: pointer;
    transition: transform .14s ease, box-shadow .14s ease, background .14s ease;
  }
  .chaos-primary:hover, .tile-cta:hover {
    transform: translate(3px, 3px) rotate(-1deg);
    box-shadow: 3px 3px 0 #19051f;
    background: #35f4ff;
  }
  .chaos-primary:disabled { opacity: .55; cursor: not-allowed; }

  .featured-chaos, .chaos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(282px, 1fr));
    gap: 22px;
  }
  .featured-chaos {
    margin-bottom: 24px;
  }

  .control-deck {
    position: sticky;
    top: 46px;
    z-index: 4;
    display: flex;
    gap: 14px;
    align-items: center;
    flex-wrap: wrap;
    padding: 14px;
    margin: 0 0 24px;
    border: 4px solid #19051f;
    background: #fffaf0;
    box-shadow: 8px 8px 0 #19051f;
    transform: rotate(.5deg);
  }
  .scope-switch {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .scope-switch button {
    border: 3px solid #19051f;
    background: #35f4ff;
    color: #19051f;
    padding: 10px 14px;
    font-family: 'Black Ops One', system-ui;
    text-transform: uppercase;
    cursor: pointer;
  }
  .scope-switch button.active {
    background: #ffef3d;
    transform: rotate(-2deg);
    box-shadow: 4px 4px 0 #19051f;
  }
  .chaos-search {
    flex: 1 1 280px;
    min-width: 220px;
    border: 4px solid #19051f;
    background: #19051f;
    color: #fffaf0;
    padding: 13px 15px;
    font-family: 'DM Mono', monospace;
    font-size: 14px;
  }
  .chaos-search::placeholder { color: rgba(255,250,240,.68); }

  .create-lab {
    margin-bottom: 26px;
    padding: 20px;
    border: 5px solid #19051f;
    background: #35f4ff;
    box-shadow: 12px 12px 0 #19051f;
    transform: rotate(-.5deg);
  }
  .lab-header {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 16px;
    font-family: 'Black Ops One', system-ui;
    text-transform: uppercase;
  }
  .lab-header span {
    background: #ff4fd8;
    border: 3px solid #19051f;
    padding: 7px 10px;
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 13px;
  }
  .form-grid label {
    display: flex;
    flex-direction: column;
    gap: 7px;
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }
  .form-grid .wide { grid-column: 1 / -1; }
  .form-grid input, .form-grid textarea, .form-grid select {
    border: 3px solid #19051f;
    background: #fffaf0;
    color: #19051f;
    padding: 11px;
    font-family: 'DM Mono', monospace;
    font-size: 13px;
  }
  .lab-submit { margin-top: 16px; }

  .chaos-error {
    border: 4px solid #19051f;
    background: #ff4b4b;
    color: #fff;
    box-shadow: 7px 7px 0 #19051f;
    padding: 13px 16px;
    margin-bottom: 18px;
    font-family: 'Black Ops One', system-ui;
  }

  .space-tile {
    position: relative;
    min-height: 320px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 18px;
    border: 5px solid #19051f;
    background:
      linear-gradient(135deg, rgba(255,255,255,.30), transparent 35%),
      linear-gradient(145deg, #fff236, #ff4fd8 58%, #35f4ff);
    background-size: cover;
    background-position: center;
    box-shadow: 10px 10px 0 #19051f;
    isolation: isolate;
    transition: transform .16s ease, box-shadow .16s ease;
  }
  .space-tile:hover {
    transform: rotate(0deg) translateY(-7px) scale(1.015);
    box-shadow: 14px 16px 0 #19051f;
  }
  .space-tile.large { min-height: 370px; }
  .tilt-left { transform: rotate(-1.2deg); }
  .tilt-right { transform: rotate(1.2deg); }
  .tile-stripes {
    position: absolute;
    inset: auto -30px -48px -30px;
    height: 110px;
    background: repeating-linear-gradient(45deg, #19051f 0 12px, #fff236 12px 24px);
    opacity: .85;
    z-index: -1;
    transform: rotate(-4deg);
  }
  .tile-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .privacy, .joined, .room-tagline {
    border: 3px solid #19051f;
    background: #fffaf0;
    color: #19051f;
    padding: 6px 9px;
    font-family: 'DM Mono', monospace;
    font-weight: 900;
    font-size: 10px;
    text-transform: uppercase;
  }
  .privacy.private { background: #ff4b4b; color: #fff; }
  .joined { background: #75ff63; }
  .room-tagline {
    display: inline-flex;
    margin: 18px 0 10px;
    background: #35f4ff;
  }
  .space-tile h2 {
    margin: 0;
    font-family: 'Bangers', cursive;
    font-size: clamp(38px, 5vw, 62px);
    line-height: .9;
    color: #fffaf0;
    text-shadow: 4px 4px 0 #19051f, 8px 8px 0 #ff4fd8;
    overflow-wrap: anywhere;
  }
  .tile-copy {
    min-height: 44px;
    margin: 12px 0 0;
    padding: 10px;
    border: 3px solid #19051f;
    background: rgba(255,250,240,.88);
    font-family: Inter, system-ui;
    font-weight: 900;
    line-height: 1.25;
  }
  .battle-board {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 8px;
    align-items: center;
    margin-top: 13px;
  }
  .battle-board span, .battle-board strong {
    border: 3px solid #19051f;
    background: #fffaf0;
    padding: 7px 8px;
    text-align: center;
    font-family: 'Black Ops One', system-ui;
    font-size: 11px;
    overflow-wrap: anywhere;
  }
  .battle-board strong {
    background: #ff4b4b;
    color: #fff;
    transform: rotate(-5deg);
  }
  .tag-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 12px;
  }
  .tag-cloud span {
    border: 2px solid #19051f;
    background: #fff236;
    padding: 4px 8px;
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    font-weight: 900;
  }
  .join-stack {
    display: flex;
    align-items: flex-end;
    gap: 9px;
    flex-wrap: wrap;
    margin-top: 16px;
  }
  .invite-code {
    min-width: 148px;
    border: 3px solid #19051f;
    background: #fffaf0;
    color: #19051f;
    padding: 10px;
    font-family: 'DM Mono', monospace;
  }
  .skeleton-card {
    min-height: 320px;
    border: 5px solid #19051f;
    background: repeating-linear-gradient(-20deg, #fff236 0 18px, #ff4fd8 18px 36px);
    box-shadow: 10px 10px 0 #19051f;
    animation: wobble 1.2s ease-in-out infinite alternate;
  }
  .empty-chaos {
    border: 5px solid #19051f;
    background: #fffaf0;
    box-shadow: 12px 12px 0 #19051f;
    padding: 52px 20px;
    text-align: center;
    transform: rotate(-1deg);
  }
  .empty-chaos h2 {
    margin: 0;
    font-family: 'Bangers', cursive;
    font-size: 64px;
  }
  .empty-chaos p {
    margin: 10px 0 0;
    font-family: Inter, system-ui;
    font-weight: 900;
  }

  @keyframes ticker {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }
  @keyframes wobble {
    from { transform: rotate(-1deg); filter: saturate(1); }
    to { transform: rotate(1deg); filter: saturate(1.4); }
  }

  @media (max-width: 880px) {
    .chaos-hero { grid-template-columns: 1fr; }
    .hero-copy::after { right: 12px; top: 10px; font-size: 24px; }
    .control-deck { position: relative; top: auto; }
  }
  @media (max-width: 560px) {
    .chaos-shell { width: min(100% - 18px, 1260px); padding-top: 60px; }
    .hero-copy, .hero-card-smash, .create-lab, .space-tile, .control-deck { box-shadow: 6px 6px 0 #19051f; }
    .hero-copy h1 { font-size: 64px; }
    .ticker { font-size: 11px; height: 27px; }
    .battle-board { grid-template-columns: 1fr; }
  }
`;

export default Spaces;
