import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteSpaceMessage,
  getInviteCode,
  getSpace,
  getSpaceMessages,
  inviteUsers,
  joinSpace,
  leaveSpace,
  sendSpaceMessage,
} from "../api/spaces";

function SpaceRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const [space, setSpace] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [kind, setKind] = useState("text");
  const [mediaUrl, setMediaUrl] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteNames, setInviteNames] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const latestMessageRef = useRef("");

  useEffect(() => {
    loadRoom();
  }, [id]);

  useEffect(() => {
    if (!space?.viewer?.isMember) return undefined;
    const timer = setInterval(() => {
      loadMessages(latestMessageRef.current, false);
    }, 3500);
    return () => clearInterval(timer);
  }, [space?._id, space?.viewer?.isMember]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    latestMessageRef.current = messages[messages.length - 1]?.createdAt || "";
  }, [messages]);

  async function loadRoom() {
    try {
      setLoading(true);
      setError("");
      const data = await getSpace(id);
      setSpace(data);
      if (data.viewer?.isMember) await loadMessages("", true);
    } catch (err) {
      setError(err.message || "Failed to load space");
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(after = "", replace = false) {
    try {
      const data = await getSpaceMessages(id, after);
      const incoming = Array.isArray(data) ? data : [];
      if (replace) {
        setMessages(incoming);
      } else if (incoming.length) {
        setMessages((prev) => {
          const existing = new Set(prev.map((message) => message._id));
          return [...prev, ...incoming.filter((message) => !existing.has(message._id))];
        });
      }
    } catch (err) {
      if (replace) setError(err.message || "Failed to load messages");
    }
  }

  async function handleJoin() {
    try {
      const joined = await joinSpace(id);
      setSpace(joined);
      await loadMessages("", true);
    } catch (err) {
      setError(err.message || "Could not join space");
    }
  }

  async function handleLeave() {
    try {
      await leaveSpace(id);
      navigate("/spaces");
    } catch (err) {
      setError(err.message || "Could not leave space");
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    try {
      setSending(true);
      setError("");
      const message = await sendSpaceMessage(id, {
        text,
        kind,
        mediaUrl: kind === "text" ? "" : mediaUrl,
      });
      setMessages((prev) => [...prev, message]);
      setText("");
      setMediaUrl("");
      setKind("text");
    } catch (err) {
      setError(err.message || "Could not send message");
    } finally {
      setSending(false);
    }
  }

  async function handleInviteCode() {
    try {
      const data = await getInviteCode(id);
      setInviteCode(data.inviteCode || "");
    } catch (err) {
      setError(err.message || "Could not create invite code");
    }
  }

  async function handleInviteUsers(event) {
    event.preventDefault();
    try {
      const usernames = inviteNames
        .split(",")
        .map((name) => name.trim().replace(/^@/, ""))
        .filter(Boolean);
      await inviteUsers(id, usernames);
      setInviteNames("");
      await loadRoom();
    } catch (err) {
      setError(err.message || "Could not invite users");
    }
  }

  async function handleDelete(messageId) {
    try {
      await deleteSpaceMessage(id, messageId);
      setMessages((prev) => prev.filter((message) => message._id !== messageId));
    } catch (err) {
      setError(err.message || "Could not delete message");
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <style>{globalStyles}</style>
        <div style={styles.loading}>Loading space...</div>
      </main>
    );
  }

  if (error && !space) {
    return (
      <main style={styles.page}>
        <style>{globalStyles}</style>
        <div style={styles.errorFull}>
          <p>{error}</p>
          <Link to="/spaces" style={styles.linkButton}>Back to Spaces</Link>
        </div>
      </main>
    );
  }

  const canChat = space?.viewer?.isMember;
  const canModerate = space?.viewer?.canModerate;
  const canLeave = canChat && space?.viewer?.role !== "owner";

  return (
    <main style={styles.page}>
      <style>{globalStyles}</style>
      <div style={styles.backdrop} />
      <section style={styles.shell}>
        <header style={styles.roomHeader}>
          <div style={styles.headerArt(space?.coverUrl)}>
            <div style={styles.headerOverlay}>
              <Link to="/spaces" style={styles.backLink}>Spaces</Link>
              <div style={styles.headerMain}>
                <div>
                  <p style={styles.eyebrow}>{space.visibility} space</p>
                  <h1 style={styles.title}>{space.name}</h1>
                  <p style={styles.subtitle}>{space.description || `${space.teamA} vs ${space.teamB}`}</p>
                </div>
                <div style={styles.actions}>
                  {!canChat && <button type="button" style={styles.primaryButton} onClick={handleJoin}>Join</button>}
                  {canLeave && <button type="button" style={styles.secondaryButton} onClick={handleLeave}>Leave</button>}
                </div>
              </div>
              <div style={styles.teamBar}>
                <span>{space.teamA}</span>
                <strong>Fan War</strong>
                <span>{space.teamB}</span>
              </div>
            </div>
          </div>
        </header>

        {error && <div style={styles.error}>{error}</div>}

        <div className="space-room-layout" style={styles.layout}>
          <section className="space-chat-panel" style={styles.chatPanel}>
            {!canChat ? (
              <div style={styles.locked}>
                <h2>Join to enter the chat.</h2>
                <p>Private spaces need an invite. Public spaces open right away.</p>
                <button type="button" style={styles.primaryButton} onClick={handleJoin}>Join Space</button>
              </div>
            ) : (
              <>
                <div style={styles.messageList}>
                  {messages.length === 0 ? (
                    <div style={styles.emptyChat}>
                      <h2>Start the war, but keep it JFF.</h2>
                      <p>Send a take, an image URL, or a GIF link.</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <MessageBubble
                        key={message._id}
                        message={message}
                        mine={message.user?.username === user?.username}
                        canDelete={canModerate || message.user?.username === user?.username}
                        onDelete={() => handleDelete(message._id)}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} style={styles.composer}>
                  <div style={styles.kindTabs}>
                    {["text", "image", "gif"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setKind(option)}
                        style={{ ...styles.kindTab, ...(kind === option ? styles.kindActive : {}) }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {kind !== "text" && (
                    <input
                      value={mediaUrl}
                      onChange={(event) => setMediaUrl(event.target.value)}
                      placeholder={kind === "gif" ? "Paste GIF URL" : "Paste image URL"}
                      style={styles.mediaInput}
                    />
                  )}
                  <div style={styles.composerRow}>
                    <textarea
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      placeholder="Drop your take..."
                      rows={2}
                      maxLength={2000}
                      style={styles.messageInput}
                    />
                    <button type="submit" disabled={sending || (!text.trim() && !mediaUrl.trim())} style={styles.sendButton}>
                      {sending ? "..." : "Send"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>

          <aside className="space-sidebar" style={styles.sidebar}>
            <section style={styles.sideSection}>
              <h2 style={styles.sideTitle}>Members</h2>
              <div style={styles.memberList}>
                {(space.members || []).map((member) => (
                  <Link key={member.user?._id || member.user} to={`/user/${member.user?.username}`} style={styles.member}>
                    <span style={styles.avatar}>{member.user?.username?.charAt(0).toUpperCase() || "?"}</span>
                    <span>@{member.user?.username || "user"}</span>
                    <em>{member.role}</em>
                  </Link>
                ))}
              </div>
            </section>

            {canChat && (
              <section style={styles.sideSection}>
                <h2 style={styles.sideTitle}>Invite</h2>
                <button type="button" style={styles.secondaryButton} onClick={handleInviteCode}>Generate Code</button>
                {inviteCode && <input readOnly value={inviteCode} style={styles.codeInput} />}
                <form onSubmit={handleInviteUsers} style={styles.inviteForm}>
                  <input
                    value={inviteNames}
                    onChange={(event) => setInviteNames(event.target.value)}
                    placeholder="username, username"
                    style={styles.codeInput}
                  />
                  <button type="submit" style={styles.primaryButton}>Invite</button>
                </form>
              </section>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function MessageBubble({ message, mine, canDelete, onDelete }) {
  return (
    <article style={{ ...styles.message, ...(mine ? styles.messageMine : {}) }}>
      <div style={styles.messageMeta}>
        <strong>@{message.user?.username || "user"}</strong>
        <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        {canDelete && <button type="button" onClick={onDelete} style={styles.deleteButton}>Delete</button>}
      </div>
      {message.text && <p style={styles.messageText}>{message.text}</p>}
      {message.mediaUrl && (
        message.kind === "gif" || message.kind === "image" ? (
          <img src={message.mediaUrl} alt={message.kind} style={styles.media} loading="lazy" />
        ) : (
          <a href={message.mediaUrl} target="_blank" rel="noreferrer" style={styles.mediaLink}>{message.mediaUrl}</a>
        )
      )}
    </article>
  );
}

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Mono:wght@300;400;500&family=Cinzel:wght@400;600&display=swap');
  input:focus, textarea:focus { outline: 1px solid rgba(212,175,55,.45); }
  @media (max-width: 860px) {
    .space-room-layout { grid-template-columns: 1fr !important; }
    .space-chat-panel { min-height: 560px !important; }
    .space-sidebar { order: -1; }
  }
  @media (max-width: 560px) {
    .space-room-layout textarea { min-height: 78px; }
  }
`;

const styles = {
  page: { minHeight: "100vh", background: "#07060a", color: "#f5f0e8", position: "relative" },
  backdrop: { position: "fixed", inset: 0, background: "radial-gradient(circle at 12% 10%, rgba(212,175,55,.08), transparent 32%), radial-gradient(circle at 88% 20%, rgba(70,180,160,.08), transparent 35%)", pointerEvents: "none" },
  shell: { maxWidth: 1260, margin: "0 auto", padding: "24px 18px 70px", position: "relative", zIndex: 1 },
  loading: { minHeight: "70vh", display: "grid", placeItems: "center", fontFamily: "'DM Mono', monospace", color: "#d4af37" },
  errorFull: { minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center", fontFamily: "'DM Mono', monospace" },
  linkButton: { color: "#09070a", background: "#d4af37", textDecoration: "none", borderRadius: 8, padding: "11px 16px", fontFamily: "'Cinzel', serif", textTransform: "uppercase", letterSpacing: ".12em" },
  roomHeader: { marginBottom: 16 },
  headerArt: (coverUrl) => ({
    minHeight: 330,
    borderRadius: 8,
    border: "1px solid rgba(212,175,55,.18)",
    backgroundImage: coverUrl ? `linear-gradient(180deg, rgba(7,6,10,.12), rgba(7,6,10,.94)), url("${coverUrl}")` : "linear-gradient(135deg, rgba(212,175,55,.16), rgba(70,180,160,.10)), #100d12",
    backgroundSize: "cover",
    backgroundPosition: "center",
    overflow: "hidden",
  }),
  headerOverlay: { minHeight: 330, padding: 22, display: "flex", flexDirection: "column", justifyContent: "space-between" },
  backLink: { alignSelf: "flex-start", color: "#d4af37", textDecoration: "none", fontFamily: "'DM Mono', monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: ".16em" },
  headerMain: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 18, flexWrap: "wrap" },
  eyebrow: { margin: "0 0 8px", color: "#d4af37", fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: ".18em" },
  title: { margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(40px, 7vw, 74px)", lineHeight: .92, fontWeight: 300 },
  subtitle: { margin: "12px 0 0", maxWidth: 720, color: "rgba(245,240,232,.72)", fontFamily: "'DM Mono', monospace", fontSize: 13, lineHeight: 1.6 },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  primaryButton: { border: "1px solid rgba(212,175,55,.5)", background: "#d4af37", color: "#09070a", borderRadius: 8, padding: "10px 14px", fontFamily: "'Cinzel', serif", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  secondaryButton: { border: "1px solid rgba(212,175,55,.28)", background: "rgba(7,6,10,.6)", color: "#d4af37", borderRadius: 8, padding: "10px 14px", fontFamily: "'Cinzel', serif", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, cursor: "pointer", fontSize: 12 },
  teamBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "1px solid rgba(212,175,55,.18)", paddingTop: 14, fontFamily: "'DM Mono', monospace", color: "rgba(245,240,232,.8)" },
  layout: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 16 },
  chatPanel: { minHeight: 620, border: "1px solid rgba(212,175,55,.16)", background: "rgba(255,255,255,.035)", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" },
  messageList: { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 },
  locked: { minHeight: 500, display: "grid", placeItems: "center", textAlign: "center", padding: 24, fontFamily: "'DM Mono', monospace", color: "rgba(245,240,232,.72)" },
  emptyChat: { margin: "auto", textAlign: "center", color: "rgba(245,240,232,.62)", fontFamily: "'DM Mono', monospace" },
  message: { maxWidth: "min(620px, 92%)", alignSelf: "flex-start", border: "1px solid rgba(212,175,55,.16)", background: "rgba(7,6,10,.7)", borderRadius: 8, padding: 12 },
  messageMine: { alignSelf: "flex-end", background: "rgba(212,175,55,.12)", borderColor: "rgba(212,175,55,.32)" },
  messageMeta: { display: "flex", alignItems: "center", gap: 9, color: "rgba(212,175,55,.75)", fontFamily: "'DM Mono', monospace", fontSize: 11, marginBottom: 7 },
  messageText: { margin: 0, whiteSpace: "pre-wrap", color: "#f5f0e8", lineHeight: 1.55, fontSize: 14 },
  deleteButton: { marginLeft: "auto", border: 0, background: "transparent", color: "rgba(248,113,113,.8)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10 },
  media: { display: "block", marginTop: 9, maxWidth: "100%", maxHeight: 360, borderRadius: 7, border: "1px solid rgba(255,255,255,.12)", objectFit: "contain" },
  mediaLink: { color: "#d4af37", wordBreak: "break-all" },
  composer: { borderTop: "1px solid rgba(212,175,55,.14)", padding: 12, background: "rgba(7,6,10,.72)" },
  kindTabs: { display: "flex", gap: 5, marginBottom: 9 },
  kindTab: { border: "1px solid rgba(212,175,55,.16)", background: "transparent", color: "rgba(245,240,232,.62)", borderRadius: 6, padding: "6px 9px", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", fontSize: 10, cursor: "pointer" },
  kindActive: { color: "#d4af37", background: "rgba(212,175,55,.12)", borderColor: "rgba(212,175,55,.34)" },
  mediaInput: { width: "100%", marginBottom: 8, border: "1px solid rgba(212,175,55,.2)", background: "rgba(255,255,255,.04)", color: "#f5f0e8", borderRadius: 7, padding: "10px 11px", fontFamily: "'DM Mono', monospace" },
  composerRow: { display: "flex", gap: 9, alignItems: "stretch" },
  messageInput: { flex: 1, resize: "none", border: "1px solid rgba(212,175,55,.2)", background: "rgba(255,255,255,.04)", color: "#f5f0e8", borderRadius: 7, padding: 11, fontFamily: "'DM Mono', monospace" },
  sendButton: { width: 92, border: "1px solid rgba(212,175,55,.5)", background: "#d4af37", color: "#09070a", borderRadius: 7, fontFamily: "'Cinzel', serif", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, cursor: "pointer" },
  sidebar: { display: "flex", flexDirection: "column", gap: 16 },
  sideSection: { border: "1px solid rgba(212,175,55,.16)", background: "rgba(255,255,255,.035)", borderRadius: 8, padding: 14 },
  sideTitle: { margin: "0 0 12px", fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600 },
  memberList: { display: "flex", flexDirection: "column", gap: 9 },
  member: { color: "#f5f0e8", textDecoration: "none", display: "grid", gridTemplateColumns: "28px 1fr auto", alignItems: "center", gap: 8, fontFamily: "'DM Mono', monospace", fontSize: 12 },
  avatar: { width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: "#d4af37", color: "#09070a", fontWeight: 800 },
  codeInput: { width: "100%", marginTop: 9, border: "1px solid rgba(212,175,55,.2)", background: "rgba(7,6,10,.65)", color: "#f5f0e8", borderRadius: 7, padding: "10px 11px", fontFamily: "'DM Mono', monospace" },
  inviteForm: { marginTop: 10, display: "grid", gap: 9 },
  error: { border: "1px solid rgba(248,113,113,.25)", background: "rgba(248,113,113,.1)", color: "#fecaca", borderRadius: 8, padding: 12, marginBottom: 16, fontFamily: "'DM Mono', monospace", fontSize: 12 },
};

export default SpaceRoom;
