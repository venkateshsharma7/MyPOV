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
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const messageInputRef = useRef(null);
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
      setMentionSuggestions([]);
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
    setMentionSuggestions([]);
  }

  function extractMentionQuery(value, cursorPosition) {
    const upToCursor = value.slice(0, cursorPosition);
    const match = /(^|\s)@([a-zA-Z0-9_]*)$/.exec(upToCursor);
    return match ? match[2] : null;
  }

  function handleTextChange(event) {
    const value = event.target.value;
    setText(value);
    handleTextCursor(event.target.selectionStart);
  }

  function handleTextCursor(cursorPosition) {
    const query = extractMentionQuery(text, cursorPosition);
    if (query === null || !space?.members) {
      setMentionSuggestions([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const usernames = (space.members || [])
      .map((member) => member.user?.username)
      .filter(Boolean)
      .filter((username) => username !== user?.username);

    const suggestions = usernames
      .filter((username) => username.toLowerCase().startsWith(lowerQuery))
      .slice(0, 6);

    setMentionSuggestions(suggestions);
  }

  function insertMention(username) {
    const input = messageInputRef.current;
    if (!input) return;

    const cursorPosition = input.selectionStart || text.length;
    const beforeCursor = text.slice(0, cursorPosition);
    const afterCursor = text.slice(cursorPosition);
    const match = /(^|\s)@([a-zA-Z0-9_]*)$/.exec(beforeCursor);
    if (!match) return;

    const prefix = beforeCursor.slice(0, match.index);
    const separator = match[1] || "";
    const mentionText = `${separator}@${username} `;
    const nextText = `${prefix}${mentionText}${afterCursor}`;

    setText(nextText);
    setMentionSuggestions([]);

    window.requestAnimationFrame(() => {
      const position = prefix.length + mentionText.length;
      input.focus();
      input.setSelectionRange(position, position);
    });
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
              <Link to="/spaces" style={styles.backLink}>Back to Spaces</Link>
              <div style={styles.headerMain}>
                <div>
                  <p style={styles.eyebrow}>{space.visibility} space / lightly unserious</p>
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
                <strong>Fan war, but make it charming</strong>
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
                    <div style={styles.mentionComposer}>
                      <textarea
                        ref={messageInputRef}
                        value={text}
                        onChange={(event) => handleTextChange(event)}
                        onClick={(event) => handleTextCursor(event.currentTarget.selectionStart)}
                        onKeyUp={(event) => handleTextCursor(event.currentTarget.selectionStart)}
                        placeholder="Drop your take..."
                        rows={2}
                        maxLength={2000}
                        style={styles.messageInput}
                      />
                      {mentionSuggestions.length > 0 && (
                        <div style={styles.mentionPopup}>
                          {mentionSuggestions.map((username) => (
                            <button
                              key={username}
                              type="button"
                              onClick={() => insertMention(username)}
                              style={styles.mentionItem}
                            >
                              @{username}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
                <h2 style={styles.sideTitle}>Voice Corner</h2>
                <p style={styles.voiceCopy}>
                  {space.voiceRoom?.active
                      ? `${space.voiceRoom.participantCount} live in voice`
                      : "Open the mic and behave dramatically."}
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
              <h2 style={styles.sideTitle}>People Here</h2>
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
          {message.text && <p style={styles.messageText}>{renderMessageText(message.text)}</p>}
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

function renderMessageText(text) {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const start = match.index;
    const end = mentionRegex.lastIndex;
    if (start > lastIndex) {
      segments.push(text.slice(lastIndex, start));
    }
    segments.push(
      <span key={`${start}-${end}`} style={styles.mention}>
        @{match[1]}
      </span>
    );
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return segments.length > 0 ? segments : text;
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
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Inter:wght@500;600;700;800;900&display=swap');
  .space-room-chaos input:focus, .space-room-chaos textarea:focus { outline: 2px solid rgba(245,184,80,.55); outline-offset: 2px; }
  .space-room-chaos *::selection { background: rgba(245,184,80,.35); color: #f7f3ea; }
  .space-room-chaos ::-webkit-scrollbar { width: 10px; }
  .space-room-chaos ::-webkit-scrollbar-track { background: rgba(255,255,255,.04); }
  .space-room-chaos ::-webkit-scrollbar-thumb { background: rgba(245,184,80,.38); border-radius: 999px; }
  .chat-status-chaos span:not(:empty)::before { content: 'typing: '; color: rgba(245,184,80,.9); font-style: normal; }
  .composer-chaos { box-shadow: 0 -18px 34px rgba(0,0,0,.18); }
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
    color: "#f7f3ea",
    position: "relative",
    overflowX: "hidden",
    background:
      "radial-gradient(circle at 18% 8%, rgba(245,184,80,.18), transparent 32%), radial-gradient(circle at 84% 14%, rgba(81,196,184,.16), transparent 30%), radial-gradient(circle at 50% 88%, rgba(229,91,134,.12), transparent 30%), #0b0d14",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    background:
      "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.026) 1px, transparent 1px)",
    backgroundSize: "44px 44px",
    pointerEvents: "none",
    opacity: .7,
  },
  shell: { maxWidth: 1320, margin: "0 auto", padding: "22px 18px 70px", position: "relative", zIndex: 1 },
  loading: { minHeight: "70vh", display: "grid", placeItems: "center", fontFamily: "'DM Mono', monospace", color: "#f5b850" },
  errorFull: { minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center", fontFamily: "'DM Mono', monospace" },
  linkButton: { color: "#11131b", background: "#f5b850", textDecoration: "none", borderRadius: 999, padding: "11px 16px", fontWeight: 900 },
  roomHeader: { marginBottom: 18 },
  headerArt: (coverUrl) => ({
    minHeight: 350,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 30,
    boxShadow: "0 24px 80px rgba(0,0,0,.35)",
    backgroundImage: coverUrl
      ? `linear-gradient(180deg, rgba(12,14,24,.18), rgba(12,14,24,.92)), url("${coverUrl}")`
      : "linear-gradient(135deg, rgba(255,255,255,.11), rgba(255,255,255,.04)), radial-gradient(circle at 18% 12%, rgba(245,184,80,.20), transparent 35%), radial-gradient(circle at 88% 16%, rgba(81,196,184,.17), transparent 32%), #11131b",
    backgroundSize: "cover",
    backgroundPosition: "center",
    overflow: "hidden",
    backdropFilter: "blur(18px)",
  }),
  headerOverlay: { minHeight: 350, padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" },
  backLink: { alignSelf: "flex-start", color: "#f7f3ea", background: "rgba(255,255,255,.09)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 999, padding: "8px 12px", textDecoration: "none", fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em" },
  headerMain: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 18, flexWrap: "wrap" },
  eyebrow: { display: "inline-flex", margin: "0 0 10px", color: "#82efe4", background: "rgba(81,196,184,.09)", border: "1px solid rgba(81,196,184,.32)", borderRadius: 999, padding: "7px 10px", fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: ".14em" },
  title: { margin: 0, fontSize: "clamp(44px, 8vw, 92px)", lineHeight: .88, color: "#f7f3ea", letterSpacing: "-0.07em", fontWeight: 900 },
  subtitle: { margin: "16px 0 0", maxWidth: 740, color: "rgba(247,243,234,.7)", fontWeight: 700, fontSize: 16, lineHeight: 1.45 },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  primaryButton: { border: 0, background: "linear-gradient(135deg, #f5b850, #e55b86)", color: "#11131b", borderRadius: 999, boxShadow: "0 14px 34px rgba(229,91,134,.24)", padding: "10px 15px", fontWeight: 900, cursor: "pointer", fontSize: 12 },
  secondaryButton: { border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.08)", color: "#f7f3ea", borderRadius: 999, padding: "10px 15px", fontWeight: 800, cursor: "pointer", fontSize: 12 },
  teamBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 14, fontFamily: "'DM Mono', monospace", color: "rgba(247,243,234,.76)", fontSize: 12 },
  layout: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 16 },
  chatPanel: { height: "min(790px, calc(100vh - 96px))", minHeight: 620, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", borderRadius: 28, boxShadow: "0 24px 70px rgba(0,0,0,.32)", overflow: "hidden", display: "flex", flexDirection: "column", backdropFilter: "blur(18px)" },
  chatStatus: { minHeight: 34, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.045)", color: "#f5b850", fontFamily: "'DM Mono', monospace", fontSize: 11, fontStyle: "italic" },
  messageList: { flex: 1, minHeight: 0, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 13, overscrollBehavior: "contain", background: "rgba(7,9,14,.18)" },
  locked: { minHeight: 500, display: "grid", placeItems: "center", textAlign: "center", padding: 24, color: "rgba(247,243,234,.72)" },
  emptyChat: { margin: "auto", textAlign: "center", color: "rgba(247,243,234,.62)" },
  message: { maxWidth: "min(650px, 92%)", alignSelf: "flex-start", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.09)", borderRadius: 20, boxShadow: "0 14px 40px rgba(0,0,0,.18)", padding: 13 },
  messageMine: { alignSelf: "flex-end", background: "linear-gradient(135deg, rgba(245,184,80,.22), rgba(229,91,134,.18))", borderColor: "rgba(245,184,80,.25)" },
  messageMeta: { display: "flex", alignItems: "center", gap: 9, color: "rgba(247,243,234,.62)", fontFamily: "'DM Mono', monospace", fontSize: 11, marginBottom: 7 },
  replyPreview: { display: "grid", gap: 3, borderLeft: "3px solid #f5b850", background: "rgba(245,184,80,.09)", borderRadius: 12, padding: "8px 10px", marginBottom: 8, color: "rgba(247,243,234,.72)", fontFamily: "'DM Mono', monospace", fontSize: 11 },
  messageText: { margin: 0, whiteSpace: "pre-wrap", color: "#f7f3ea", lineHeight: 1.55, fontSize: 14, fontWeight: 650 },
  mention: { color: "#f5b850", fontWeight: 700, background: "rgba(245,184,80,.12)", borderRadius: 5, padding: "0 4px" },
  deletedText: { margin: 0, color: "rgba(247,243,234,.42)", fontFamily: "'DM Mono', monospace", fontStyle: "italic", fontSize: 13 },
  deleteButton: { marginLeft: "auto", border: 0, background: "transparent", color: "rgba(248,113,113,.8)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10 },
  media: { display: "block", marginTop: 9, maxWidth: "100%", maxHeight: 360, borderRadius: 16, border: "1px solid rgba(255,255,255,.12)", objectFit: "contain" },
  audio: { display: "block", marginTop: 9, width: "min(360px, 100%)", height: 38 },
  mediaLink: { color: "#f5b850", wordBreak: "break-all", fontWeight: 800 },
  reactionChips: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 },
  reactionChip: { border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.08)", color: "#f7f3ea", borderRadius: 999, padding: "4px 8px", cursor: "pointer", fontSize: 12 },
  actionRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 8 },
  actionButton: { border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "rgba(247,243,234,.72)", borderRadius: 999, padding: "5px 9px", fontFamily: "'DM Mono', monospace", fontSize: 10, cursor: "pointer", textTransform: "uppercase", letterSpacing: ".06em" },
  actionButtonDanger: { border: "1px solid rgba(229,91,134,.25)", background: "rgba(229,91,134,.11)", color: "#ffd5df", borderRadius: 999, padding: "5px 9px", fontFamily: "'DM Mono', monospace", fontSize: 10, cursor: "pointer", textTransform: "uppercase", letterSpacing: ".06em" },
  reactRow: { display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 },
  reactButton: { width: 30, height: 30, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.07)", borderRadius: 999, cursor: "pointer", display: "grid", placeItems: "center" },
  composer: { borderTop: "1px solid rgba(255,255,255,.1)", padding: 12, background: "rgba(7,9,14,.45)" },
  composerContext: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", borderLeft: "3px solid #f5b850", background: "rgba(245,184,80,.09)", borderRadius: 14, padding: "8px 10px", marginBottom: 9, fontFamily: "'DM Mono', monospace", color: "rgba(247,243,234,.74)", fontSize: 11 },
  contextClose: { border: 0, background: "transparent", color: "#f5b850", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: "uppercase" },
  kindTabs: { display: "flex", gap: 5, marginBottom: 9 },
  kindTab: { border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.055)", color: "rgba(247,243,234,.6)", borderRadius: 999, padding: "7px 10px", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", fontSize: 10, cursor: "pointer" },
  kindActive: { color: "#11131b", background: "#f5b850" },
  mediaInput: { width: "100%", marginBottom: 8, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#f7f3ea", borderRadius: 16, padding: "11px 12px", fontFamily: "'DM Mono', monospace" },
  composerRow: { display: "flex", gap: 9, alignItems: "stretch" },
  mentionComposer: { position: "relative", flex: 1 },
  mentionPopup: { position: "absolute", zIndex: 2, top: "100%", left: 0, right: 0, marginTop: 8, background: "rgba(15, 20, 34, 0.95)", border: "1px solid rgba(245,184,80,.2)", borderRadius: 16, boxShadow: "0 16px 30px rgba(0,0,0,.32)", maxHeight: 240, overflowY: "auto" },
  mentionItem: { width: "100%", border: 0, background: "transparent", color: "#f7f3ea", textAlign: "left", padding: "12px 14px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 13 },
  messageInput: { flex: 1, resize: "none", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#f7f3ea", borderRadius: 18, padding: 12, fontFamily: "'DM Mono', monospace" },
  sendButton: { width: 96, border: 0, borderRadius: 18, background: "linear-gradient(135deg, #f5b850, #e55b86)", color: "#11131b", fontWeight: 900, cursor: "pointer" },
  sidebar: { display: "flex", flexDirection: "column", gap: 16 },
  voicePanel: { border: "1px solid rgba(255,255,255,.12)", background: "linear-gradient(180deg, rgba(81,196,184,.11), rgba(255,255,255,.045))", borderRadius: 24, boxShadow: "0 18px 50px rgba(0,0,0,.24)", padding: 14, backdropFilter: "blur(18px)" },
  voiceCopy: { margin: "-6px 0 12px", color: "rgba(247,243,234,.62)", fontFamily: "'DM Mono', monospace", fontSize: 12, lineHeight: 1.5 },
  voiceActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  voicePeople: { display: "flex", flexDirection: "column", gap: 6, marginTop: 12 },
  voicePerson: { color: "rgba(247,243,234,.72)", fontFamily: "'DM Mono', monospace", fontSize: 11, border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "6px 8px", background: "rgba(255,255,255,.055)" },
  sideSection: { border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", borderRadius: 24, boxShadow: "0 18px 50px rgba(0,0,0,.24)", padding: 14, backdropFilter: "blur(18px)" },
  sideTitle: { margin: "0 0 12px", fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em" },
  memberList: { display: "flex", flexDirection: "column", gap: 9 },
  member: { color: "rgba(247,243,234,.78)", textDecoration: "none", display: "grid", gridTemplateColumns: "30px 1fr auto", alignItems: "center", gap: 8, fontFamily: "'DM Mono', monospace", fontSize: 12 },
  avatar: { width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #f5b850, #e55b86)", color: "#11131b", fontWeight: 900 },
  codeInput: { width: "100%", marginTop: 9, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#f7f3ea", borderRadius: 16, padding: "10px 11px", fontFamily: "'DM Mono', monospace" },
  inviteForm: { marginTop: 10, display: "grid", gap: 9 },
  error: { border: "1px solid rgba(229,91,134,.35)", background: "rgba(229,91,134,.12)", color: "#ffd5df", borderRadius: 18, padding: 12, marginBottom: 16, fontSize: 12 },
};

export default SpaceRoom;
