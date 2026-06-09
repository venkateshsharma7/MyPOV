// src/components/ShareImageCard.jsx
// Letterboxd-exact layout — poster card floats, title+stars below, MyPOV branding
import { useRef, useEffect, useState } from "react";
import myPOVLogoSrc from "../assets/MyPOV_Logo.png";

// Card dimensions — portrait 9:16 for Instagram stories
const CARD_W = 720;
const CARD_H = 1280;

// ── helpers ──────────────────────────────────────────────────────────────────

function starString(rating) {
  const r = Number(rating) || 0;
  const full = Math.floor(r / 2);
  const half = r % 2 >= 1;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(Math.max(0, 5 - full - (half ? 1 : 0)));
}

function loadImg(src, proxy = false) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => proxy ? resolve(null) : loadImg(`https://wsrv.nl/?url=${encodeURIComponent(src)}&n=-1`, true).then(resolve);
    img.src = proxy ? `https://wsrv.nl/?url=${encodeURIComponent(src)}&n=-1` : src;
  });
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ShareImageCard({ entry, onClose }) {
  const canvasRef = useRef(null);
  const logoRef = useRef(null);
  const [generating, setGenerating] = useState(true);
  const [status, setStatus] = useState("");

  // Pre-load logo (same origin — no CORS)
  useEffect(() => {
    const img = new Image();
    img.src = myPOVLogoSrc;
    img.onload = () => { logoRef.current = img; };
  }, []);

  useEffect(() => { draw(); }, [entry]);

  async function draw() {
    setGenerating(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = CARD_W;
    canvas.height = CARD_H;

    // ── BACKGROUND — dark charcoal like Letterboxd's dark story bg ────────────
    const bgGrad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    bgGrad.addColorStop(0, "#1a1720");
    bgGrad.addColorStop(1, "#0d0b0f");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // Subtle radial vignette
    const vignette = ctx.createRadialGradient(CARD_W / 2, CARD_H / 2, 200, CARD_W / 2, CARD_H / 2, 900);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // ── POSTER CARD — floats with shadow, like Letterboxd ────────────────────
    const POSTER_W = 560;
    const POSTER_H = 760;
    const POSTER_X = (CARD_W - POSTER_W) / 2;
    const POSTER_Y = 80;
    const POSTER_R = 22;

    // Drop shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 20;
    roundedRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, POSTER_R);
    ctx.fillStyle = "#111";
    ctx.fill();
    ctx.restore();

    // Poster image clipped to rounded rect
    const posterSrc = entry.poster
      ? entry.poster
      : entry.poster_path
      ? `https://image.tmdb.org/t/p/w780${entry.poster_path}`
      : null;
    const posterImg = posterSrc ? await loadImg(posterSrc) : null;

    ctx.save();
    roundedRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, POSTER_R);
    ctx.clip();

    if (posterImg) {
      const scale = Math.max(POSTER_W / posterImg.width, POSTER_H / posterImg.height);
      const dw = posterImg.width * scale;
      const dh = posterImg.height * scale;
      const dx = POSTER_X + (POSTER_W - dw) / 2;
      const dy = POSTER_Y + (POSTER_H - dh) / 2;
      ctx.drawImage(posterImg, dx, dy, dw, dh);
    } else {
      // Gradient placeholder
      const pg = ctx.createLinearGradient(POSTER_X, POSTER_Y, POSTER_X + POSTER_W, POSTER_Y + POSTER_H);
      pg.addColorStop(0, "#2a2040");
      pg.addColorStop(1, "#0d0b0f");
      ctx.fillStyle = pg;
      ctx.fillRect(POSTER_X, POSTER_Y, POSTER_W, POSTER_H);
      ctx.fillStyle = "rgba(212,175,55,0.3)";
      ctx.font = "bold 40px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(entry.title || "MyPOV", CARD_W / 2, POSTER_Y + POSTER_H / 2);
    }
    ctx.restore();

    // Poster border — subtle gold tint
    ctx.save();
    roundedRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, POSTER_R);
    ctx.strokeStyle = "rgba(212,175,55,0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // ── TITLE — below poster, centered, white bold ────────────────────────────
    const TITLE_Y = POSTER_Y + POSTER_H + 52;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 52px Georgia, serif";
    ctx.textAlign = "center";
    const titleText = entry.title || "Untitled";
    // Truncate if too long
    let displayTitle = titleText;
    while (ctx.measureText(displayTitle).width > CARD_W - 80 && displayTitle.length > 4) {
      displayTitle = displayTitle.slice(0, -1);
    }
    if (displayTitle !== titleText) displayTitle = displayTitle.trimEnd() + "…";
    ctx.fillText(displayTitle, CARD_W / 2, TITLE_Y);

    // ── STARS — centered, gold, exactly like Letterboxd ──────────────────────
    const STARS_Y = TITLE_Y + 62;
    const stars = starString(entry.rating);
    ctx.fillStyle = "#d4af37";
    ctx.font = "52px serif";
    ctx.textAlign = "center";
    ctx.fillText(stars, CARD_W / 2, STARS_Y);

    // ── DIVIDER — "ON" label + logo, bottom centered ─────────────────────────
    const DIV_Y = CARD_H - 160;

    // Thin lines either side of "ON"
    const ON_LABEL = "ON";
    ctx.font = "bold 20px 'Courier New', monospace";
    ctx.fillStyle = "rgba(212,175,55,0.5)";
    ctx.textAlign = "center";
    const onW = ctx.measureText(ON_LABEL).width;

    ctx.strokeStyle = "rgba(212,175,55,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CARD_W / 2 - onW / 2 - 40, DIV_Y);
    ctx.lineTo(CARD_W / 2 - onW / 2 - 8, DIV_Y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(CARD_W / 2 + onW / 2 + 8, DIV_Y);
    ctx.lineTo(CARD_W / 2 + onW / 2 + 40, DIV_Y);
    ctx.stroke();

    ctx.fillText(ON_LABEL, CARD_W / 2, DIV_Y + 7);

    // MyPOV logo
    const logoImg = logoRef.current;
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      const LOGO_H = 64;
      const LOGO_W = (logoImg.naturalWidth / logoImg.naturalHeight) * LOGO_H;
      ctx.drawImage(logoImg, CARD_W / 2 - LOGO_W / 2, DIV_Y + 20, LOGO_W, LOGO_H);
    } else {
      // Text fallback
      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 28px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText("MY POV", CARD_W / 2, DIV_Y + 60);
    }

    ctx.textAlign = "left";
    setGenerating(false);
  }

  async function downloadImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `mypov-${(entry.title || "review").replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
    setStatus("Downloaded!");
  }

  async function shareImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!navigator.canShare) { downloadImage(); return; }
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `mypov-${entry.title || "review"}.png`, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ title: `${entry.title} — MyPOV`, files: [file] });
          setStatus("Shared!");
          return;
        } catch (e) { if (e?.name !== "AbortError") console.error(e); }
      }
      downloadImage();
    });
  }

  return (
    <>
      <style>{`
        .sic-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.9);
          z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .sic-modal {
          background: #0d0b0f;
          border: 1px solid rgba(212,175,55,0.2);
          border-radius: 24px;
          padding: 28px 24px;
          max-width: 420px; width: 100%;
          display: flex; flex-direction: column; align-items: center; gap: 20px;
          max-height: 96vh; overflow-y: auto;
        }
        .sic-title {
          font-family: 'Cinzel', serif;
          color: #d4af37; font-size: 12px;
          letter-spacing: 4px; text-transform: uppercase;
        }
        .sic-canvas-wrap {
          width: 100%; max-width: 300px;
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 16px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(212,175,55,0.1);
        }
        .sic-canvas-wrap canvas { width: 100%; height: auto; display: block; }
        .sic-btns { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
        .sic-btn-gold {
          background: linear-gradient(135deg, #d4af37, #b8960c);
          color: #0a0803; border: none; border-radius: 30px;
          padding: 12px 26px; font-family: 'Cinzel', serif;
          font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
          cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(212,175,55,0.3);
        }
        .sic-btn-gold:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(212,175,55,0.45); }
        .sic-btn-ghost {
          background: transparent;
          border: 1px solid rgba(212,175,55,0.3);
          color: #d4af37; border-radius: 30px;
          padding: 12px 26px; font-family: 'Cinzel', serif;
          font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
          cursor: pointer; transition: transform 0.2s, border-color 0.2s;
        }
        .sic-btn-ghost:hover { transform: translateY(-2px); border-color: rgba(212,175,55,0.7); }
        .sic-status {
          font-family: 'DM Mono', monospace;
          font-size: 12px; color: rgba(212,175,55,0.8);
          text-align: center;
        }
        .sic-hint {
          font-family: 'DM Mono', monospace;
          font-size: 10px; color: rgba(255,255,255,0.2);
          text-align: center; line-height: 1.6;
        }
      `}</style>

      <div className="sic-overlay" onClick={onClose}>
        <div className="sic-modal" onClick={(e) => e.stopPropagation()}>
          <p className="sic-title">Share Your POV</p>

          {generating && (
            <p className="sic-status" style={{ opacity: 0.4, fontSize: "11px" }}>Generating card…</p>
          )}

          <div className="sic-canvas-wrap">
            <canvas ref={canvasRef} />
          </div>

          {!generating && (
            <>
              <div className="sic-btns">
                <button className="sic-btn-gold" onClick={downloadImage}>Download</button>
                <button className="sic-btn-gold" onClick={shareImage}>Share</button>
                <button className="sic-btn-ghost" onClick={onClose}>Close</button>
              </div>
              {status && <p className="sic-status">{status}</p>}
              <p className="sic-hint">Save and post to Instagram, X, or any social platform</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
