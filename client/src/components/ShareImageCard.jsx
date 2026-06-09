// src/components/ShareImageCard.jsx
import { useRef, useEffect, useState } from "react";
import myPOVLogoSrc from "../assets/MyPOV_Logo.png";

const W = 720;
const H = 1280;

// Load image with automatic CORS proxy fallback (no double-proxy)
function loadImg(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);

    const attempt = (url, isFallback) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => {
        if (!isFallback) {
          // One retry through a different proxy
          attempt(`https://images.weserv.nl/?url=${encodeURIComponent(src)}`, true);
        } else {
          resolve(null);
        }
      };
      img.src = url;
    };

    attempt(src, false);
  });
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function ShareImageCard({ entry, onClose }) {
  const canvasRef = useRef(null);
  const logoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");

  // Preload logo
  useEffect(() => {
    const img = new Image();
    img.onload = () => { logoRef.current = img; };
    img.src = myPOVLogoSrc;
  }, []);

  useEffect(() => { draw(); }, [entry]);

  async function draw() {
    setReady(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = W;
    canvas.height = H;

    // ── 1. BACKGROUND ─────────────────────────────────────────────────────────
    // Letterboxd uses a dark blue-grey gradient background for story cards
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#2c2d3a");
    bg.addColorStop(1, "#1a1b24");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── 2. POSTER CARD — floats centred, rounded, with shadow ─────────────────
    const PW = 480;   // poster width
    const PH = 720;   // poster height  (standard 2:3 movie poster ratio)
    const PX = (W - PW) / 2;
    const PY = 100;
    const PR = 20;    // corner radius

    // Shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.75)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 18;
    rr(ctx, PX, PY, PW, PH, PR);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();

    // Poster image
    const posterSrc = entry.poster
      ? entry.poster
      : entry.poster_path
      ? `https://image.tmdb.org/t/p/w780${entry.poster_path}`
      : null;
    const posterImg = posterSrc ? await loadImg(posterSrc) : null;

    ctx.save();
    rr(ctx, PX, PY, PW, PH, PR);
    ctx.clip();
    if (posterImg) {
      const scale = Math.max(PW / posterImg.width, PH / posterImg.height);
      const dw = posterImg.width * scale;
      const dh = posterImg.height * scale;
      ctx.drawImage(posterImg, PX + (PW - dw) / 2, PY + (PH - dh) / 2, dw, dh);
    } else {
      // Fallback gradient with title
      const g = ctx.createLinearGradient(PX, PY, PX + PW, PY + PH);
      g.addColorStop(0, "#2a2040");
      g.addColorStop(1, "#0d0b14");
      ctx.fillStyle = g;
      ctx.fillRect(PX, PY, PW, PH);
      ctx.fillStyle = "rgba(212,175,55,0.5)";
      ctx.font = "bold 36px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(entry.title || "", W / 2, PY + PH / 2);
    }
    ctx.restore();

    // Poster border
    ctx.save();
    rr(ctx, PX, PY, PW, PH, PR);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // ── 3. TITLE — white, bold, centred below poster ──────────────────────────
    // Letterboxd uses a clean sans-serif. We use Georgia bold as closest match.
    const TITLE_Y = PY + PH + 64;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px Georgia, serif";

    let title = entry.title || "Untitled";
    // Shrink until fits
    while (ctx.measureText(title).width > W - 80 && title.length > 2) {
      title = title.slice(0, -1);
    }
    if (title !== (entry.title || "Untitled")) title = title.trimEnd() + "…";
    ctx.fillText(title, W / 2, TITLE_Y);

    // ── 4. STARS — gold, centred, large ───────────────────────────────────────
    // Letterboxd uses green stars; we use MyPOV gold
    const r = Number(entry.rating) || 0;
    const fullStars = Math.floor(r / 2);
    const halfStar = r % 2 >= 1;
    const emptyStars = Math.max(0, 5 - fullStars - (halfStar ? 1 : 0));
    const starStr = "★".repeat(fullStars) + (halfStar ? "½" : "") + "☆".repeat(emptyStars);

    const STAR_Y = TITLE_Y + 68;
    ctx.fillStyle = "#d4af37";
    ctx.font = "58px serif";
    ctx.textAlign = "center";
    ctx.fillText(starStr, W / 2, STAR_Y);

    // ── 5. BRANDING — "ON" divider + logo, bottom centre ─────────────────────
    // Letterboxd has two horizontal lines flanking "ON" then the logo below
    const BRAND_Y = H - 155;

    // Left + right lines flanking "ON"
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;

    ctx.beginPath(); ctx.moveTo(80, BRAND_Y); ctx.lineTo(W / 2 - 34, BRAND_Y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 + 34, BRAND_Y); ctx.lineTo(W - 80, BRAND_Y); ctx.stroke();

    // "ON" text
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "600 22px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ON", W / 2, BRAND_Y + 8);

    // MyPOV logo
    const logo = logoRef.current;
    if (logo && logo.naturalWidth > 0) {
      const LH = 70;
      const LW = (logo.naturalWidth / logo.naturalHeight) * LH;
      ctx.drawImage(logo, W / 2 - LW / 2, BRAND_Y + 22, LW, LH);
    } else {
      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 30px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("MY POV", W / 2, BRAND_Y + 68);
    }

    setReady(true);
  }

  function download() {
    const a = document.createElement("a");
    a.href = canvasRef.current.toDataURL("image/png");
    a.download = `mypov-${(entry.title || "review").replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
    setStatus("Downloaded!");
  }

  function share() {
    const canvas = canvasRef.current;
    if (!navigator.canShare) { download(); return; }
    canvas.toBlob(async (blob) => {
      const file = new File([blob], `mypov-${entry.title || "review"}.png`, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        try { await navigator.share({ title: `${entry.title} — MyPOV`, files: [file] }); setStatus("Shared!"); return; }
        catch (e) { if (e?.name !== "AbortError") console.error(e); }
      }
      download();
    });
  }

  return (
    <>
      <style>{`
        .sic-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.92);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .sic-modal {
          background: #13121a;
          border: 1px solid rgba(212,175,55,0.18);
          border-radius: 24px; padding: 28px 22px;
          max-width: 400px; width: 100%;
          display: flex; flex-direction: column; align-items: center; gap: 20px;
          max-height: 96vh; overflow-y: auto;
        }
        .sic-label {
          font-family: 'Cinzel', serif; color: #d4af37;
          font-size: 11px; letter-spacing: 4px; text-transform: uppercase;
        }
        .sic-wrap {
          width: 100%;
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 20px 70px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05);
        }
        .sic-wrap canvas { width: 100%; height: auto; display: block; }
        .sic-generating {
          font-family: 'DM Mono', monospace; font-size: 11px;
          color: rgba(212,175,55,0.4); letter-spacing: 0.1em;
        }
        .sic-btns { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
        .sic-gold {
          background: linear-gradient(135deg, #d4af37, #b8960c); color: #0a0803;
          border: none; border-radius: 30px; padding: 12px 28px;
          font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 2px;
          text-transform: uppercase; cursor: pointer;
          box-shadow: 0 4px 18px rgba(212,175,55,0.35);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .sic-gold:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(212,175,55,0.5); }
        .sic-ghost {
          background: transparent; border: 1px solid rgba(212,175,55,0.3);
          color: #d4af37; border-radius: 30px; padding: 12px 28px;
          font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 2px;
          text-transform: uppercase; cursor: pointer;
          transition: transform 0.15s, border-color 0.15s;
        }
        .sic-ghost:hover { transform: translateY(-2px); border-color: rgba(212,175,55,0.7); }
        .sic-status {
          font-family: 'DM Mono', monospace; font-size: 11px;
          color: rgba(212,175,55,0.7); text-align: center;
        }
        .sic-hint {
          font-family: 'DM Mono', monospace; font-size: 10px;
          color: rgba(255,255,255,0.18); text-align: center; line-height: 1.7;
        }
      `}</style>

      <div className="sic-overlay" onClick={onClose}>
        <div className="sic-modal" onClick={e => e.stopPropagation()}>
          <p className="sic-label">Share Your POV</p>

          {!ready && <p className="sic-generating">Generating card…</p>}

          <div className="sic-wrap">
            <canvas ref={canvasRef} />
          </div>

          {ready && (
            <>
              <div className="sic-btns">
                <button className="sic-gold" onClick={download}>Download</button>
                <button className="sic-gold" onClick={share}>Share</button>
                <button className="sic-ghost" onClick={onClose}>Close</button>
              </div>
              {status && <p className="sic-status">{status}</p>}
              <p className="sic-hint">Save and post to Instagram, X, or anywhere</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
