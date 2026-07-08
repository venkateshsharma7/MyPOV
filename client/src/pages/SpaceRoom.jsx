import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteSpaceMessage,
  editSpaceMessage,
  getInviteCode,
  getSpace,
  getSpaceMessages,
  inviteUsers,
  joinVoiceRoom,
  joinSpace,
  leaveVoiceRoom,
  leaveSpace,
  muteVoiceRoom,
  reactToSpaceMessage,
  sendSpaceMessage,
  setSpaceTyping,
  starSpaceMessage,
} from "../api/spaces";

const REACTIONS = ["🔥", "😂", "❤️", "👏", "😮", "👎"];

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
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteNames, setInviteNames] = useState("");
  const [sending, setSending] = useState(false);
  const messageListRef = useRef(null);
  const messagesEndRef = useRef(null);
  const latestMessageRef = useRef("");
  const stickToBottomRef = useRef(true);
  const typingRef = useRef(false);
  const typingStopTimerRef = useRef(null);

  useEffect(() => {
    loadRoom();
  }, [id]);

  useEffect(() => {
    if (!space?.viewer?.isMember) return undefined;
    const timer = setInterval(() => {
      loadMessages(latestMessageRef.current, false);
      refreshSpaceQuietly();
    }, 3500);
    return () => clearInterval(timer);
  }, [space?._id, space?.viewer?.isMember]);

  useEffect(() => {
    if (stickToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    latestMessageRef.current = messages[messages.length - 1]?.createdAt || "";
  }, [messages]);

  useEffect(() => {
    const isTyping = Boolean(space?.viewer?.isMember && !editingMessage && (text.trim() || (kind !== "text" && mediaUrl.trim())));
    updateTypingStatus(isTyping);

    if (isTyping) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = setTimeout(() => updateTypingStatus(false), 2800);
    }

    return () => clearTimeout(typingStopTimerRef.current);
  }, [text, mediaUrl, kind, editingMessage, space?.viewer?.isMember]);

  useEffect(() => {
    return () => {
      if (typingRef.current) {
        setSpaceTyping(id, false).catch(() => {});
      }
    };
  }, [id]);

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

  async function refreshSpaceQuietly() {
    try {
      const data = await getSpace(id);
      setSpace(data);
    } catch {
      // Polling refreshes should not interrupt chat.
    }
  }

  async function updateTypingStatus(isTyping) {
    if (typingRef.current === isTyping || !space?.viewer?.isMember) return;
    typingRef.current = isTyping;
    try {
      const data = await setSpaceTyping(id, isTyping);
      setSpace(data);
    } catch {
      typingRef.current = !isTyping;
    }
  }

  function handleMessageListScroll(event) {
    const node = event.currentTarget;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 120;
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
      const trimmedText = text.trim();
      let message;
      if (editingMessage) {
        message = await editSpaceMessage(id, editingMessage._id, trimmedText);
        setMessages((prev) => prev.map((item) => (item._id === message._id ? message : item)));
      } else {
        message = await sendSpaceMessage(id, {
          text: trimmedText,
          kind,
          mediaUrl: kind === "text" ? "" : mediaUrl.trim(),
          replyTo: replyingTo?._id || null,
        });
        setMessages((prev) => [...prev, message]);
      }
      setText("");
      setMediaUrl("");
      setKind("text");
      setReplyingTo(null);
      setEditingMessage(null);
      updateTypingStatus(false);
      stickToBottomRef.current = true;
    } catch (err) {
      setError(err.message || "Could not send message");
    } finally {
      setSending(false);
    }
  }

  function beginEdit(message) {
    setEditingMessage(message);
    setReplyingTo(null);
    setKind("text");
    setMediaUrl("");
    setText(message.text || "");
  }

  async function handleReact(messageId, emoji) {
    try {
      const updated = await reactToSpaceMessage(id, messageId, emoji);
      setMessages((prev) => prev.map((message) => (message._id === updated._id ? updated : message)));
    } catch (err) {
      setError(err.message || "Could not react");
    }
  }

  async function handleStar(messageId) {
    try {
      const updated = await starSpaceMessage(id, messageId);
      setMessages((prev) => prev.map((message) => (message._id === updated._id ? updated : message)));
    } catch (err) {
      setError(err.message || "Could not star message");
    }
  }

  async function handleVoiceJoin() {
    try {
      const updated = await joinVoiceRoom(id);
      setSpace(updated);
    } catch (err) {
      setError(err.message || "Could not join voice chat");
    }
  }

  async function handleVoiceLeave() {
    try {
      const updated = await leaveVoiceRoom(id);
      setSpace(updated);
      setVoiceMuted(false);
    } catch (err) {
      setError(err.message || "Could not leave voice chat");
    }
  }

  async function handleVoiceMute() {
    try {
      const muted = !voiceMuted;
      const updated = await muteVoiceRoom(id, muted);
      setVoiceMuted(muted);
      setSpace(updated);
    } catch (err) {
      setError(err.message || "Could not update voice chat");
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
      setMessages((prev) =>
        prev.map((message) =>
          message._id === messageId ? { ...message, text: "", mediaUrl: "", deletedAt: new Date().toISOString() } : message
        )
      );
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
  const viewerInVoice = Boolean(space?.voiceRoom?.viewerInVoice);

  return (
    <main className="space-room-chaos" style={styles.page}>
      <style>{globalStyles}</style>
      <div style={styles.backdrop} />
      <section style={styles.shell}>
        <header style={styles.roomHeader}>
          <div style={styles.headerArt(space?.coverUrl)}>
            <div style={styles.headerOverlay}>
              <Link to="/spaces" style={styles.backLink}>Back to chaos</Link>
              <div style={styles.headerMain}>
                <div>
                  <p style={styles.eyebrow}>{space.visibility} space // live arena</p>
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
                <strong>FAN WAR</strong>
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
                <div className="chat-status-chaos" style={styles.chatStatus}>
                  <span>{typingLabel(space?.typingUsers || []) || " "}</span>
                </div>
                <div ref={messageListRef} onScroll={handleMessageListScroll} style={styles.messageList}>
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
                        canEdit={message.user?.username === user?.username && message.kind === "text" && !message.deletedAt}
                        viewerUsername={user?.username}
                        onReply={() => {
                          setReplyingTo(message);
                          setEditingMessage(null);
                        }}
                        onEdit={() => beginEdit(message)}
                        onReact={(emoji) => handleReact(message._id, emoji)}
                        onStar={() => handleStar(message._id)}
                        onDelete={() => handleDelete(message._id)}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="composer-chaos" style={styles.composer}>
                  {(replyingTo || editingMessage) && (
                    <div style={styles.composerContext}>
                      <div>
                        <strong>{editingMessage ? "Editing message" : `Replying to @${replyingTo?.user?.username || "user"}`}</strong>
                        <p>{editingMessage ? editingMessage.text : summarizeMessage(replyingTo)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(null);
                          setEditingMessage(null);
                          setText("");
                        }}
                        style={styles.contextClose}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  <div style={styles.kindTabs}>
                    {["text", "image", "gif", "voice"].map((option) => (
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
                      placeholder={kind === "gif" ? "Paste GIF URL" : kind === "voice" ? "Paste voice note/audio URL" : "Paste image URL"}
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
                      {sending ? "..." : editingMessage ? "Save" : "Send"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>

          <aside className="space-sidebar" style={styles.sidebar}>
            {canChat && (
              <section style={styles.voicePanel}>
                <div>
                <h2 style={styles.sideTitle}>Voice Riot</h2>
                <p style={styles.voiceCopy}>
                  {space.voiceRoom?.active
                      ? `${space.voiceRoom.participantCount} live in voice`
                      : "Open the mic pit."}
                  </p>
                </div>
                <div style={styles.voiceActions}>
                  {viewerInVoice ? (
                    <>
                      <button type="button" style={styles.secondaryButton} onClick={handleVoiceMute}>
                        {voiceMuted ? "Unmute" : "Mute"}
                      </button>
                      <button type="button" style={styles.secondaryButton} onClick={handleVoiceLeave}>
                        Leave
                      </button>
                    </>
                  ) : (
                    <button type="button" style={styles.primaryButton} onClick={handleVoiceJoin}>
                      Join Voice
                    </button>
                  )}
                </div>
                {space.voiceRoom?.participants?.length > 0 && (
                  <div style={styles.voicePeople}>
                    {space.voiceRoom.participants.map((participant) => (
                      <span key={participant.user?._id || participant.user} style={styles.voicePerson}>
                        @{participant.user?.username || "user"} {participant.muted ? "muted" : "live"}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section style={styles.sideSection}>
              <h2 style={styles.sideTitle}>Crowd</h2>
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

function MessageBubble({
  message,
  mine,
  canDelete,
  canEdit,
  viewerUsername,
  onReply,
  onEdit,
  onReact,
  onStar,
  onDelete,
}) {
  const reactionGroups = groupReactions(message.reactions || []);
  const starred = (message.starredBy || []).some((user) => user?.username === viewerUsername);
  const deleted = Boolean(message.deletedAt);

  return (
    <article style={{ ...styles.message, ...(mine ? styles.messageMine : {}) }}>
      <div style={styles.messageMeta}>
        <strong>@{message.user?.username || "user"}</strong>
        <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        {message.editedAt && !deleted && <span>edited</span>}
        {starred && <span>starred</span>}
      </div>
      {message.replyTo && !deleted && (
        <div style={styles.replyPreview}>
          <strong>@{message.replyTo.user?.username || "user"}</strong>
          <span>{summarizeMessage(message.replyTo)}</span>
        </div>
      )}
      {deleted ? (
        <p style={styles.deletedText}>This message was deleted</p>
      ) : (
        <>
          {message.text && <p style={styles.messageText}>{message.text}</p>}
          {message.mediaUrl && (
            message.kind === "gif" || message.kind === "image" ? (
              <img src={message.mediaUrl} alt={message.kind} style={styles.media} loading="lazy" />
            ) : message.kind === "voice" ? (
              <audio controls src={message.mediaUrl} style={styles.audio} />
            ) : (
              <a href={message.mediaUrl} target="_blank" rel="noreferrer" style={styles.mediaLink}>{message.mediaUrl}</a>
            )
          )}
          {reactionGroups.length > 0 && (
            <div style={styles.reactionChips}>
              {reactionGroups.map((reaction) => (
                <button key={reaction.emoji} type="button" onClick={() => onReact(reaction.emoji)} style={styles.reactionChip}>
                  {reaction.emoji} {reaction.count}
                </button>
              ))}
            </div>
          )}
          <div style={styles.actionRow}>
            <button type="button" onClick={onReply} style={styles.actionButton}>Reply</button>
            {canEdit && <button type="button" onClick={onEdit} style={styles.actionButton}>Edit</button>}
            <button type="button" onClick={onStar} style={styles.actionButton}>{starred ? "Unstar" : "Star"}</button>
            {canDelete && <button type="button" onClick={onDelete} style={styles.actionButtonDanger}>Delete</button>}
          </div>
          <div style={styles.reactRow}>
            {REACTIONS.map((emoji) => (
              <button key={emoji} type="button" onClick={() => onReact(emoji)} style={styles.reactButton}>
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </article>
  );
}

function summarizeMessage(message) {
  if (!message) return "";
  if (message.deletedAt) return "Deleted message";
  if (message.text) return message.text.length > 90 ? `${message.text.slice(0, 90)}...` : message.text;
  if (message.kind === "voice") return "Voice note";
  if (message.kind === "gif") return "GIF";
  if (message.kind === "image") return "Image";
  return "Message";
}

function groupReactions(reactions) {
  const map = new Map();
  reactions.forEach((reaction) => {
    map.set(reaction.emoji, (map.get(reaction.emoji) || 0) + 1);
  });
  return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }));
}

function typingLabel(typingUsers) {
  const names = typingUsers
    .map((item) => item.user?.username)
    .filter(Boolean)
    .slice(0, 3);

  if (!names.length) return "";
  if (names.length === 1) return `${names[0]} is typing...`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
  return `${names[0]} and ${names.length - 1} others are typing...`;
}

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Black+Ops+One&family=DM+Mono:wght@300;400;500&family=Inter:wght@700;800;900&display=swap');
  .space-room-chaos input:focus, .space-room-chaos textarea:focus { outline: 3px solid #35f4ff; }
  .space-room-chaos *::selection { background: #fff236; color: #19051f; }
  .space-room-chaos ::-webkit-scrollbar { width: 13px; }
  .space-room-chaos ::-webkit-scrollbar-track { background: #19051f; }
  .space-room-chaos ::-webkit-scrollbar-thumb { background: #ff4fd8; border: 3px solid #19051f; }
  .chat-status-chaos span:not(:empty)::before { content: 'LIVE: '; font-family: 'Black Ops One', system-ui; font-style: normal; }
  .composer-chaos { box-shadow: 0 -8px 0 #19051f; }
  @media (max-width: 860px) {
    .space-room-layout { grid-template-columns: 1fr !important; }
    .space-chat-panel { height: 72vh !important; min-height: 520px !important; }
    .space-sidebar { order: -1; }
  }
  @media (max-width: 560px) {
    .space-room-layout textarea { min-height: 78px; }
  }
`;

const styles = {
  page: {
    minHeight: "100vh",
    color: "#19051f",
    position: "relative",
    overflowX: "hidden",
    background:
      "linear-gradient(135deg, rgba(255,255,255,.12) 25%, transparent 25%) 0 0 / 18px 18px, linear-gradient(225deg, rgba(0,0,0,.1) 25%, transparent 25%) 0 0 / 18px 18px, linear-gradient(120deg, #35f4ff 0%, #ff4fd8 36%, #fff236 67%, #75ff63 100%)",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    background:
      "repeating-linear-gradient(0deg, rgba(25,5,31,.16) 0 1px, transparent 1px 7px), radial-gradient(circle at 20% 20%, rgba(255,255,255,.55) 0 1px, transparent 1px 9px)",
    pointerEvents: "none",
    mixBlendMode: "multiply",
    opacity: .5,
  },
  shell: { maxWidth: 1320, margin: "0 auto", padding: "22px 18px 70px", position: "relative", zIndex: 1 },
  loading: { minHeight: "70vh", display: "grid", placeItems: "center", fontFamily: "'Black Ops One', system-ui", color: "#19051f" },
  errorFull: { minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center", fontFamily: "'DM Mono', monospace" },
  linkButton: { color: "#19051f", background: "#75ff63", textDecoration: "none", border: "4px solid #19051f", boxShadow: "5px 5px 0 #19051f", padding: "11px 16px", fontFamily: "'Black Ops One', system-ui", textTransform: "uppercase", letterSpacing: ".08em" },
  roomHeader: { marginBottom: 18 },
  headerArt: (coverUrl) => ({
    minHeight: 350,
    border: "5px solid #19051f",
    boxShadow: "12px 12px 0 #19051f",
    backgroundImage: coverUrl
      ? `linear-gradient(180deg, rgba(255,79,216,.05), rgba(25,5,31,.92)), url("${coverUrl}")`
      : "linear-gradient(135deg, rgba(255,255,255,.22), transparent 35%), linear-gradient(145deg, #fff236, #ff4fd8 58%, #35f4ff)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    overflow: "hidden",
    transform: "rotate(-.5deg)",
  }),
  headerOverlay: { minHeight: 350, padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" },
  backLink: { alignSelf: "flex-start", color: "#19051f", background: "#fff236", border: "3px solid #19051f", boxShadow: "4px 4px 0 #19051f", padding: "8px 11px", textDecoration: "none", fontFamily: "'Black Ops One', system-ui", fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em" },
  headerMain: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 18, flexWrap: "wrap" },
  eyebrow: { display: "inline-flex", margin: "0 0 10px", color: "#19051f", background: "#35f4ff", border: "3px solid #19051f", padding: "6px 9px", fontFamily: "'DM Mono', monospace", fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: ".14em" },
  title: { margin: 0, fontFamily: "'Bangers', cursive", fontSize: "clamp(54px, 9vw, 120px)", lineHeight: .78, color: "#fffaf0", textShadow: "5px 5px 0 #19051f, 10px 10px 0 #ff4fd8", letterSpacing: ".02em" },
  subtitle: { margin: "18px 0 0", maxWidth: 740, color: "#fffaf0", textShadow: "2px 2px 0 #19051f", fontFamily: "Inter, system-ui", fontWeight: 900, fontSize: 17, lineHeight: 1.35 },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  primaryButton: { border: "4px solid #19051f", background: "#75ff63", color: "#19051f", boxShadow: "5px 5px 0 #19051f", padding: "10px 14px", fontFamily: "'Black Ops One', system-ui", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 900, cursor: "pointer", fontSize: 12 },
  secondaryButton: { border: "4px solid #19051f", background: "#fff236", color: "#19051f", boxShadow: "5px 5px 0 #19051f", padding: "10px 14px", fontFamily: "'Black Ops One', system-ui", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 900, cursor: "pointer", fontSize: 12 },
  teamBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "4px solid #19051f", paddingTop: 14, fontFamily: "'Black Ops One', system-ui", color: "#fffaf0", textShadow: "2px 2px 0 #19051f", fontSize: 16 },
  layout: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 16 },
  chatPanel: { height: "min(790px, calc(100vh - 96px))", minHeight: 620, border: "5px solid #19051f", background: "#fffaf0", boxShadow: "10px 10px 0 #19051f", overflow: "hidden", display: "flex", flexDirection: "column", transform: "rotate(.35deg)" },
  chatStatus: { minHeight: 34, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "4px solid #19051f", background: "#ff4fd8", color: "#fffaf0", textShadow: "1px 1px 0 #19051f", fontFamily: "'DM Mono', monospace", fontSize: 12, fontStyle: "italic", fontWeight: 900 },
  messageList: { flex: 1, minHeight: 0, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 13, overscrollBehavior: "contain", background: "linear-gradient(135deg, rgba(53,244,255,.16) 25%, transparent 25%) 0 0 / 20px 20px, #fffaf0" },
  locked: { minHeight: 500, display: "grid", placeItems: "center", textAlign: "center", padding: 24, fontFamily: "'Black Ops One', system-ui", color: "#19051f" },
  emptyChat: { margin: "auto", textAlign: "center", color: "#19051f", fontFamily: "'Black Ops One', system-ui" },
  message: { maxWidth: "min(650px, 92%)", alignSelf: "flex-start", border: "4px solid #19051f", background: "#35f4ff", boxShadow: "6px 6px 0 #19051f", padding: 12, transform: "rotate(-.35deg)" },
  messageMine: { alignSelf: "flex-end", background: "#75ff63", transform: "rotate(.35deg)" },
  messageMeta: { display: "flex", alignItems: "center", gap: 9, color: "#19051f", fontFamily: "'DM Mono', monospace", fontWeight: 900, fontSize: 11, marginBottom: 7, textTransform: "uppercase" },
  replyPreview: { display: "grid", gap: 3, borderLeft: "6px solid #ff4fd8", background: "#fff236", border: "3px solid #19051f", padding: "7px 9px", marginBottom: 8, color: "#19051f", fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 900 },
  messageText: { margin: 0, whiteSpace: "pre-wrap", color: "#19051f", lineHeight: 1.55, fontSize: 14, fontFamily: "Inter, system-ui", fontWeight: 800 },
  deletedText: { margin: 0, color: "rgba(25,5,31,.62)", fontFamily: "'DM Mono', monospace", fontStyle: "italic", fontSize: 13 },
  deleteButton: { marginLeft: "auto", border: 0, background: "transparent", color: "rgba(248,113,113,.8)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10 },
  media: { display: "block", marginTop: 9, maxWidth: "100%", maxHeight: 360, border: "4px solid #19051f", objectFit: "contain", boxShadow: "5px 5px 0 #19051f" },
  audio: { display: "block", marginTop: 9, width: "min(360px, 100%)", height: 38 },
  mediaLink: { color: "#19051f", wordBreak: "break-all", fontWeight: 900 },
  reactionChips: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 },
  reactionChip: { border: "3px solid #19051f", background: "#fff236", color: "#19051f", padding: "3px 8px", cursor: "pointer", fontSize: 12, fontWeight: 900 },
  actionRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, borderTop: "3px solid rgba(25,5,31,.22)", paddingTop: 8 },
  actionButton: { border: "3px solid #19051f", background: "#fffaf0", color: "#19051f", padding: "4px 8px", fontFamily: "'DM Mono', monospace", fontWeight: 900, fontSize: 10, cursor: "pointer", textTransform: "uppercase", letterSpacing: ".06em" },
  actionButtonDanger: { border: "3px solid #19051f", background: "#ff4b4b", color: "#fff", padding: "4px 8px", fontFamily: "'DM Mono', monospace", fontWeight: 900, fontSize: 10, cursor: "pointer", textTransform: "uppercase", letterSpacing: ".06em" },
  reactRow: { display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 },
  reactButton: { width: 30, height: 30, border: "3px solid #19051f", background: "#ff4fd8", cursor: "pointer", display: "grid", placeItems: "center" },
  composer: { borderTop: "5px solid #19051f", padding: 12, background: "#ff4fd8" },
  composerContext: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", border: "4px solid #19051f", background: "#fff236", padding: "8px 10px", marginBottom: 9, fontFamily: "'DM Mono', monospace", color: "#19051f", fontWeight: 900, fontSize: 11 },
  contextClose: { border: "3px solid #19051f", background: "#fffaf0", color: "#19051f", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontWeight: 900, fontSize: 11, textTransform: "uppercase" },
  kindTabs: { display: "flex", gap: 5, marginBottom: 9 },
  kindTab: { border: "3px solid #19051f", background: "#fffaf0", color: "#19051f", padding: "6px 9px", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", fontWeight: 900, fontSize: 10, cursor: "pointer" },
  kindActive: { color: "#19051f", background: "#75ff63", boxShadow: "3px 3px 0 #19051f" },
  mediaInput: { width: "100%", marginBottom: 8, border: "4px solid #19051f", background: "#fffaf0", color: "#19051f", padding: "10px 11px", fontFamily: "'DM Mono', monospace", fontWeight: 900 },
  composerRow: { display: "flex", gap: 9, alignItems: "stretch" },
  messageInput: { flex: 1, resize: "none", border: "4px solid #19051f", background: "#fffaf0", color: "#19051f", padding: 11, fontFamily: "'DM Mono', monospace", fontWeight: 900 },
  sendButton: { width: 96, border: "4px solid #19051f", background: "#75ff63", color: "#19051f", boxShadow: "4px 4px 0 #19051f", fontFamily: "'Black Ops One', system-ui", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 900, cursor: "pointer" },
  sidebar: { display: "flex", flexDirection: "column", gap: 16 },
  voicePanel: { border: "5px solid #19051f", background: "#35f4ff", boxShadow: "8px 8px 0 #19051f", padding: 14, transform: "rotate(-1deg)" },
  voiceCopy: { margin: "-6px 0 12px", color: "#19051f", fontFamily: "'DM Mono', monospace", fontWeight: 900, fontSize: 12, lineHeight: 1.5 },
  voiceActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  voicePeople: { display: "flex", flexDirection: "column", gap: 6, marginTop: 12 },
  voicePerson: { color: "#19051f", fontFamily: "'DM Mono', monospace", fontWeight: 900, fontSize: 11, border: "3px solid #19051f", padding: "6px 8px", background: "#fff236" },
  sideSection: { border: "5px solid #19051f", background: "#fffaf0", boxShadow: "8px 8px 0 #19051f", padding: 14, transform: "rotate(1deg)" },
  sideTitle: { margin: "0 0 12px", fontFamily: "'Bangers', cursive", fontSize: 34, fontWeight: 400, letterSpacing: ".02em" },
  memberList: { display: "flex", flexDirection: "column", gap: 9 },
  member: { color: "#19051f", textDecoration: "none", display: "grid", gridTemplateColumns: "30px 1fr auto", alignItems: "center", gap: 8, fontFamily: "'DM Mono', monospace", fontWeight: 900, fontSize: 12 },
  avatar: { width: 30, height: 30, display: "grid", placeItems: "center", background: "#ff4fd8", border: "3px solid #19051f", color: "#fffaf0", fontWeight: 900 },
  codeInput: { width: "100%", marginTop: 9, border: "4px solid #19051f", background: "#fffaf0", color: "#19051f", padding: "10px 11px", fontFamily: "'DM Mono', monospace", fontWeight: 900 },
  inviteForm: { marginTop: 10, display: "grid", gap: 9 },
  error: { border: "5px solid #19051f", background: "#ff4b4b", color: "#fff", boxShadow: "8px 8px 0 #19051f", padding: 12, marginBottom: 16, fontFamily: "'Black Ops One', system-ui", fontSize: 12 },
};

export default SpaceRoom;
