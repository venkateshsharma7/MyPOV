import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

/* ─── Floating dust particle canvas (same as Login) ───────────── */
function DustCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);
    let raf;

    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -Math.random() * 0.2 - 0.05,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    function draw() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,175,55,${p.alpha})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -4) { p.y = h + 4; p.x = Math.random() * w; }
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
      });
      raf = requestAnimationFrame(draw);
    }

    draw();
    const ro = new ResizeObserver(() => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}

function Landing() {
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Cinzel:wght@400;600&display=swap');

    .cinema-btn {
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #d4af37, #b8960c, #d4af37);
      background-size: 200% 200%;
      color: #0a0803;
      border: none;
      border-radius: 50px;
      padding: 12px 28px;
      font-family: 'Cinzel', serif;
      font-size: 13px;
      letter-spacing: 2px;
      text-transform: uppercase;
      cursor: pointer;
      transition: background-position 0.5s ease, opacity 0.2s;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .cinema-btn:hover:not(:disabled) { background-position: 100% 0; }
    .cinema-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
      pointer-events: none;
    }

    .glass-card {
      transition: all 0.25s ease;
    }
    .glass-card:hover {
      background: rgba(255,255,255,0.07);
      border-color: rgba(212,175,55,0.4);
      transform: translateY(-2px);
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeInUp 0.6s ease forwards;
    }

    input::placeholder { color: rgba(200,185,150,0.3); }
  `;

  return (
    <>
      <style>{globalStyles}</style>
      <div className="relative min-h-screen overflow-hidden bg-[#07060a] text-[#f5f0e8]">
        {/* Ambient gold vignette (same as Login) */}
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 25% 50%, rgba(212,175,55,0.04) 0%, transparent 70%), radial-gradient(ellipse 40% 80% at 80% 20%, rgba(120,80,200,0.06) 0%, transparent 60%)",
          }}
        />

        {/* Floating dust particles */}
        <DustCanvas />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 lg:py-16">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] items-center">
            {/* Left content */}
            <div className="max-w-xl space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-sm text-gray-300 shadow-sm backdrop-blur">
                New arrival
                <span className="rounded-full bg-[#d4af37] px-3 py-1 text-xs font-bold text-[#0a0803]">
                  MyPOV 2.0
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="font-serif text-5xl font-light tracking-tight text-[#f5f0e8] sm:text-6xl">
                  Your watchlist,<br />your story,<br />
                  <em className="font-serif italic text-[rgba(212,175,55,0.85)]">your POV.</em>
                </h1>
                <p className="font-mono text-base text-gray-300 leading-8">
                  Log every show and movie you watch, share thoughtful reviews, and get smart recommendations tailored to your taste.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/register" className="cinema-btn">
                  Create free account
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 py-3 font-mono text-sm font-semibold text-[#f5f0e8] transition hover:bg-white/10"
                >
                  Login
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Unlimited logs", value: "Track every watch" },
                  { label: "Public POVs", value: "Share your taste" },
                  { label: "Smart picks", value: "Get recommendations" },
                ].map((feature) => (
                  <div
                    key={feature.label}
                    className="glass-card rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-gray-300 shadow-sm backdrop-blur"
                  >
                    <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[rgba(212,175,55,0.8)]">
                      {feature.label}
                    </p>
                    <p className="mt-2 font-serif text-sm">{feature.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right preview panel – restyled with gold accents */}
            <div className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/40 animate-fade-in">
              <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-[rgba(212,175,55,0.1)] blur-3xl" />
              <div className="absolute -bottom-10 left-0 h-48 w-48 rounded-full bg-[rgba(212,175,55,0.05)] blur-3xl" />

              <div className="relative rounded-[1.75rem] border border-white/5 bg-[#0f172a]/95 p-8 shadow-inner shadow-white/5">
                <div className="mb-8 flex items-center justify-between gap-4 font-mono text-xs text-gray-400">
                  <span className="rounded-full bg-white/5 px-3 py-1">MyPOV watch journal</span>
                  <span>Live preview</span>
                </div>

                <div className="space-y-6">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-[rgba(212,175,55,0.8)]">
                      <span>Featured review</span>
                      <span>POV</span>
                    </div>
                    <h2 className="font-serif text-xl font-semibold text-[#f5f0e8]">
                      A new way to document your movie life
                    </h2>
                    <p className="mt-3 font-mono text-sm leading-6 text-gray-300">
                      Keep every entry, rate each watch, and share your personal take with a community that loves cinema.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      { title: "Review meter", description: "Score and reflect in one place." },
                      { title: "Public feed", description: "Discover POVs from other viewers." },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300"
                      >
                        <p className="font-mono text-xs font-semibold text-[rgba(212,175,55,0.7)]">
                          {item.title}
                        </p>
                        <p className="mt-2 font-serif text-sm">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-10 flex flex-col gap-4 rounded-[2rem] border border-white/5 bg-slate-950/95 p-6">
                <div className="flex items-center justify-between font-mono text-sm text-gray-400">
                  <span>Weekly activity</span>
                  <span className="text-[#d4af37]">+18%</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-[#d4af37] to-[#b8960c]" />
                  <div>
                    <p className="font-serif font-semibold text-[#f5f0e8]">Your cinema streak</p>
                    <p className="font-mono text-sm text-gray-400">8 entries logged this week</p>
                  </div>
                </div>
                <div className="rounded-3xl bg-white/5 p-4 text-sm text-gray-300">
                  <p className="font-mono text-xs font-semibold text-[rgba(212,175,55,0.7)]">
                    Search fast
                  </p>
                  <p className="mt-2 font-serif text-sm">
                    Find titles, add ratings, and keep your collection polished.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom features – gold hover cards */}
          <div className="mt-20 rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="grid gap-6 lg:grid-cols-3">
              {[
                {
                  name: "Seamless tracking",
                  description: "Record movies and TV shows with custom reviews, ratings, and privacy settings.",
                },
                {
                  name: "Curated recommendations",
                  description: "Receive suggestions based on your watch history and genre preferences.",
                },
                {
                  name: "Share your POV",
                  description: "Post public reviews to show your taste and connect with fellow fans.",
                },
              ].map((card) => (
                <div
                  key={card.name}
                  className="group rounded-3xl border border-white/10 bg-slate-950/80 p-6 transition-all duration-300 hover:border-[rgba(212,175,55,0.4)] hover:bg-white/5"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-[rgba(212,175,55,0.7)]">
                    {card.name}
                  </p>
                  <p className="mt-4 font-serif text-lg font-semibold text-[#f5f0e8]">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Landing;