import { useState } from "react";
import { apiFetch } from "../api/client";

const STARTERS = [
  "What should I watch tonight based on my MyPOV history?",
  "Roast my movie taste, but be useful.",
  "Give me 5 hidden gems I might actually like.",
  "What genres do I seem to love and avoid?",
];

function AIBot() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "I am your Gemini-powered MyPOV bot. Ask me what to watch, why your recommendations look a certain way, or what your taste profile says about you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(text = input) {
    const message = text.trim();
    if (!message || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply,
          meta: `${data.provider || "ai"} / ${data.model || "model"}`,
        },
      ]);
    } catch (err) {
      setError(err.message || "AI request failed");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: err.message || "Gemini is not responding yet. Check your backend AI configuration.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07060a] px-6 py-10 text-[#f5f0e8] md:px-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=DM+Mono:wght@300;400;700&display=swap');
        .ai-panel {
          background: rgba(10,8,3,0.64);
          border: 1px solid rgba(120,180,255,0.22);
          box-shadow: 0 24px 80px rgba(0,0,0,0.45), 0 0 40px rgba(120,180,255,0.06);
          backdrop-filter: blur(12px);
        }
        .ai-orbit {
          background:
            radial-gradient(circle at 25% 25%, rgba(120,180,255,0.18), transparent 34%),
            radial-gradient(circle at 75% 20%, rgba(212,175,55,0.14), transparent 28%),
            linear-gradient(135deg, rgba(120,180,255,0.12), rgba(212,175,55,0.08));
        }
      `}</style>

      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#78b4ff]/30 px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#9fc8ff]">
            <span className="h-2 w-2 rounded-full bg-[#9fc8ff] shadow-[0_0_14px_#9fc8ff]" />
            Gemini AI Layer
          </div>
          <h1 className="font-serif text-5xl font-semibold tracking-tight md:text-7xl">
            MyPOV AI Bot
          </h1>
          <p className="mt-3 max-w-2xl font-mono text-sm leading-7 text-[#c0bcb0]">
            Ask Gemini about your taste, your watch history, and what deserves your next two hours.
          </p>
        </header>

        <section className="ai-panel overflow-hidden rounded-3xl">
          <div className="ai-orbit border-b border-[#78b4ff]/20 p-5">
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => sendMessage(starter)}
                  disabled={loading}
                  className="rounded-full border border-[#d4af37]/30 px-3 py-2 font-mono text-xs text-[#d4af37] transition hover:bg-[#d4af37]/10 disabled:opacity-50"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[58vh] space-y-4 overflow-y-auto p-5">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-[#d4af37] text-[#07060a]"
                      : "border border-[#78b4ff]/20 bg-[#0d1018] text-[#e2e0d4]"
                  }`}
                >
                  <p className="whitespace-pre-wrap font-mono text-sm leading-6">{message.text}</p>
                  {message.meta && (
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#9fc8ff]/70">
                      {message.meta}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#9fc8ff]">
                Gemini is thinking...
              </p>
            )}
          </div>

          <div className="border-t border-[#78b4ff]/20 p-5">
            {error && <p className="mb-3 font-mono text-sm text-red-300">{error}</p>}
            <div className="flex flex-col gap-3 md:flex-row">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask Gemini about your taste..."
                rows={2}
                className="min-h-[54px] flex-1 resize-none rounded-2xl border border-[#78b4ff]/25 bg-black/30 px-4 py-3 font-mono text-sm text-[#f5f0e8] outline-none transition focus:border-[#9fc8ff]"
              />
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="rounded-2xl bg-[#9fc8ff] px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#07060a] transition hover:bg-[#c6ddff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ask AI
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AIBot;
