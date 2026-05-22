import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";
import HeroPOV from "../components/HeroPOV";
import PostCard from "../components/PostCard";
import { apiFetch } from "../api/client";

function Home() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadEntries();
  }, []);

  const stats = useMemo(() => {
    const ratedEntries = entries.filter((entry) => Number(entry.rating) > 0);
    const povCount = entries.filter((entry) => entry.pov).length;
    const average =
      ratedEntries.length === 0
        ? "0.0"
        : (
            ratedEntries.reduce(
              (sum, entry) => sum + Number(entry.rating || 0),
              0
            ) / ratedEntries.length
          ).toFixed(1);

    return [
      { label: "Total Watches", value: entries.length },
      { label: "Featured POVs", value: povCount },
      { label: "Average Rating", value: average },
    ];
  }, [entries]);

  async function loadEntries() {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/entries");
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load entries:", err);
      setError("Failed to load entries");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteEntry(id) {
    try {
      await apiFetch(`/entries/${id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((entry) => entry._id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  // Shared global styles (identical to Login)
  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&family=Cinzel:wght@400;600&display=swap');

    .cinema-btn {
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #d4af37, #b8960c, #d4af37);
      background-size: 200% 200%;
      color: #0a0803;
      border: none;
      border-radius: 8px;
      padding: 14px 24px;
      font-family: 'Cinzel', serif;
      font-size: 13px;
      letter-spacing: 3px;
      text-transform: uppercase;
      cursor: pointer;
      transition: background-position 0.5s ease, opacity 0.2s;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .cinema-btn:hover:not(:disabled) { background-position: 100% 0; }
    .cinema-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .cinema-btn::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
      pointer-events: none;
    }

    /* Glassy card hover */
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

  if (loading) {
    return (
      <main className="min-h-screen overflow-hidden bg-[#07060a] px-6 py-10 text-[#f5f0e8] md:px-10">
        <style>{globalStyles}</style>
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="mb-3 h-3 w-28 rounded-full bg-white/10" />
              <div className="h-9 w-72 rounded-full bg-white/10" />
            </div>
            <div className="hidden h-11 w-32 rounded-full bg-yellow-300/20 md:block" />
          </div>
          <div className="h-[420px] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/40 md:h-[520px]" />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-[270px] animate-pulse rounded-2xl bg-white/[0.06]" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#07060a] px-6 py-16 text-[#f5f0e8] md:px-10">
        <style>{globalStyles}</style>
        <div className="mx-auto flex max-w-2xl flex-col items-start rounded-2xl border border-red-400/20 bg-red-500/10 p-8 shadow-2xl shadow-red-950/30">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-red-300">
            Library Offline
          </p>
          <h1 className="mb-3 text-3xl font-semibold">Could not load your watches.</h1>
          <p className="mb-6 text-gray-300">{error}</p>
          <button
            type="button"
            onClick={loadEntries}
            className="cinema-btn"
            style={{ background: "white", color: "#0a0803", letterSpacing: "2px" }}
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07060a] text-[#f5f0e8]">
      <style>{globalStyles}</style>

      {/* Ambient gold vignette (same as Login) */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 25% 50%, rgba(212,175,55,0.04) 0%, transparent 70%), radial-gradient(ellipse 40% 80% at 80% 20%, rgba(120,80,200,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1500px] px-4 pb-12 pt-5 sm:px-6 md:px-10">
        {/* Hero section with subtle gold border */}
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/50 backdrop-blur">
          <HeroPOV entries={entries} />
          <Hero entries={entries} />
        </section>

        {/* Stats cards – gold hover effect */}
        <section className="-mt-5 mb-10 grid gap-3 px-2 sm:grid-cols-3 md:-mt-7 md:px-8">
          {stats.map((item) => (
            <div
              key={item.label}
              className="group rounded-2xl border border-white/10 bg-black/50 p-5 shadow-xl shadow-black/30 backdrop-blur transition-all duration-300 hover:border-[rgba(212,175,55,0.5)]"
            >
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-[rgba(212,175,55,0.7)]">
                {item.label}
              </p>
              <p className="mt-2 font-serif text-3xl font-semibold text-[#f5f0e8]">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* Main collection section */}
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
          <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.32em] text-[rgba(212,175,55,0.8)]">
                Private Collection
              </p>
              <h2 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
                My Recent Watches
              </h2>
            </div>

            <Link to="/log" className="cinema-btn" style={{ padding: "12px 24px" }}>
              Log a Watch
            </Link>
          </div>

          {entries.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black/30 px-6 text-center">
              <p className="mb-3 font-mono text-sm font-semibold uppercase tracking-[0.28em] text-[rgba(212,175,55,0.6)]">
                Your Screen Is Waiting
              </p>
              <h3 className="mb-3 font-serif text-2xl font-semibold">
                Build your first watch log.
              </h3>
              <p className="mb-6 max-w-md text-gray-400">
                Add a film, series, or comfort rewatch and your collection will start
                looking like a personal cinema archive.
              </p>
              <Link to="/log" className="cinema-btn">
                Add First Entry
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-6">
              {entries.map((entry) => (
                <div
                  key={entry._id || entry.id}
                  className="glass-card rounded-2xl bg-white/[0.03] p-2 shadow-xl shadow-black/30 ring-1 ring-white/10 transition-all duration-300"
                >
                  <PostCard entry={entry} onDelete={deleteEntry} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default Home;