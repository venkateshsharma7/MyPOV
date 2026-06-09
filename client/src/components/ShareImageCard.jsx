// src/components/ShareImageCard.jsx
// Letterboxd-style visual share card — poster-dominant layout with MyPOV logo
import { useRef, useEffect, useState } from "react";
import myPOVLogoSrc from "../assets/MyPOV_Logo.png";

const CARD_W = 630;
const CARD_H = 1120;

// ---- helpers ----------------------------------------------------------------

function starString(rating) {
  const r = Number(rating) || 0;
  const full = Math.floor(r / 2);
  const half = r % 2 >= 1;
  let s = "★".repeat(full);
  if (half) s += "½";
  s += "☆".repeat(Math.max(0, 5 - full - (half ? 1 : 0)));
  return s;
}

function loadImg(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
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

function wrapText(ctx, text, x, y, maxW, lh, maxLines = 4) {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  let lineCount = 0;
  for (let n = 0; n < words.length; n++) {
    const test = line + words[n] + " ";
    if (ctx.measureText(test).width > maxW && n > 0) {
      if (lineCount >= maxLines - 1) {
        ctx.fillText(line.trimEnd() + "…", x, cy);
        return cy + lh;
      }
      ctx.fillText(line, x, cy);
      line = words[n] + " ";
      cy += lh;
      lineCount++;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, cy);
  return cy + lh;
}

// ---- component --------------------------------------------------------------

export default function ShareImageCard({ entry, onClose }) {
  const canvasRef = useRef(null);
  const [generating, setGenerating] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => { draw(); }, [entry]);

  async function draw() {
    setGenerating(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = CARD_W;
    canvas.height = CARD_H;

    // ── dark background ──────────────────────────────────────────────────────
    ctx.fillStyle = "#0d0b0f";
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // ── poster (full-width, rounded top) ─────────────────────────────────────
    const POSTER_H = 780;
    const POSTER_PAD = 18;
    const posterSrc = entry.poster
      ? entry.poster
      : entry.poster_path
      ? `https://image.tmdb.org/t/p/w500${entry.poster_path}`
      : null;

    const posterImg = posterSrc ? await loadImg(posterSrc) : null;

    // clipping region for poster
    ctx.save();
    roundRect(ctx, POSTER_PAD, POSTER_PAD, CARD_W - POSTER_PAD * 2, POSTER_H, 18);
    ctx.clip();

    if (posterImg) {
      // cover-fit: scale so the image fills the area
      const scale = Math.max(
        (CARD_W - POSTER_PAD * 2) / posterImg.width,
        POSTER_H / posterImg.height
      );
      const dw = posterImg.width * scale;
      const dh = posterImg.height * scale;
      const dx = POSTER_PAD + ((CARD_W - POSTER_PAD * 2) - dw) / 2;
      const dy = POSTER_PAD + (POSTER_H - dh) / 2;
      ctx.drawImage(posterImg, dx, dy, dw, dh);
    } else {
      // gradient placeholder
      const g = ctx.createLinearGradient(0, 0, CARD_W, POSTER_H);
      g.addColorStop(0, "#1a1530");
      g.addColorStop(1, "#0d0b0f");
      ctx.fillStyle = g;
      ctx.fillRect(POSTER_PAD, POSTER_PAD, CARD_W - POSTER_PAD * 2, POSTER_H);
      ctx.fillStyle = "rgba(212,175,55,0.25)";
      ctx.font = "bold 32px serif";
      ctx.textAlign = "center";
      ctx.fillText(entry.title || "MyPOV", CARD_W / 2, POSTER_PAD + POSTER_H / 2);
      ctx.textAlign = "left";
    }

    // fade at bottom of poster into dark bg
    const fade = ctx.createLinearGradient(0, POSTER_PAD + POSTER_H - 220, 0, POSTER_PAD + POSTER_H);
    fade.addColorStop(0, "rgba(13,11,15,0)");
    fade.addColorStop(1, "rgba(13,11,15,0.92)");
    ctx.fillStyle = fade;
    ctx.fillRect(POSTER_PAD, POSTER_PAD + POSTER_H - 220, CARD_W - POSTER_PAD * 2, 220);

    ctx.restore();

    // ── info panel (below poster) ─────────────────────────────────────────────
    const INFO_Y = POSTER_PAD + POSTER_H + 28;

    // Title
    ctx.fillStyle = "#f5f0e8";
    ctx.font = "bold 38px Georgia, serif";
    ctx.textAlign = "left";
    const titleText = entry.title || "Untitled";
    // single-line or wrap at 2
    const titleMaxW = CARD_W - POSTER_PAD * 2 - 20;
    let titleEndY;
    if (ctx.measureText(titleText).width <= titleMaxW) {
      ctx.fillText(titleText, POSTER_PAD + 12, INFO_Y);
      titleEndY = INFO_Y + 44;
    } else {
      titleEndY = wrapText(ctx, titleText, POSTER_PAD + 12, INFO_Y, titleMaxW, 46, 2);
    }

    // Stars
    const STARS_Y = titleEndY + 14;
    ctx.fillStyle = "#d4af37";
    ctx.font = "30px serif";
    ctx.fillText(starString(entry.rating), POSTER_PAD + 12, STARS_Y);

    // Rating number badge
    const ratingLabel = `${entry.rating || 0}/10`;
    const ratingX = POSTER_PAD + 12 + ctx.measureText(starString(entry.rating)).width + 14;
    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillStyle = "rgba(212,175,55,0.75)";
    ctx.fillText(ratingLabel, ratingX, STARS_Y - 2);

    // Divider
    const DIV_Y = STARS_Y + 22;
    ctx.strokeStyle = "rgba(212,175,55,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(POSTER_PAD + 12, DIV_Y);
    ctx.lineTo(CARD_W - POSTER_PAD - 12, DIV_Y);
    ctx.stroke();

    // Review excerpt
    const reviewRaw = String(entry.review || "No review written.").trim();
    ctx.fillStyle = "#a09c94";
    ctx.font = "italic 16px Georgia, serif";
    wrapText(ctx, `"${reviewRaw}"`, POSTER_PAD + 12, DIV_Y + 28, titleMaxW, 26, 3);

    // ── branding bar (bottom) ─────────────────────────────────────────────────
    const BRAND_Y = CARD_H - 90;

    // thin gold separator
    ctx.strokeStyle = "rgba(212,175,55,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(POSTER_PAD + 12, BRAND_Y);
    ctx.lineTo(CARD_W - POSTER_PAD - 12, BRAND_Y);
    ctx.stroke();

    // "ON" text
    ctx.fillStyle = "rgba(212,175,55,0.4)";
    ctx.font = "11px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("ON", CARD_W / 2, BRAND_Y + 22);

    // MyPOV logo centered
    const logoImg = await loadImg(MYPOV_LOGO_B64);
    if (logoImg) {
      const LOGO_H = 44;
      const LOGO_W = (logoImg.width / logoImg.height) * LOGO_H;
      ctx.drawImage(logoImg, CARD_W / 2 - LOGO_W / 2, BRAND_Y + 30, LOGO_W, LOGO_H);
    } else {
      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 18px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText("MY POV", CARD_W / 2, BRAND_Y + 52);
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
          background: rgba(0,0,0,0.88);
          z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .sic-modal {
          background: #0d0b0f;
          border: 1px solid rgba(212,175,55,0.22);
          border-radius: 22px;
          padding: 24px;
          max-width: 480px; width: 100%;
          display: flex; flex-direction: column; align-items: center; gap: 18px;
          max-height: 96vh; overflow-y: auto;
        }
        .sic-title {
          font-family: 'Cinzel', serif;
          color: #d4af37; font-size: 13px;
          letter-spacing: 3px; text-transform: uppercase;
        }
        .sic-canvas-wrap {
          width: 100%; max-width: 340px;
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 10px 50px rgba(0,0,0,0.8);
          border: 1px solid rgba(212,175,55,0.15);
        }
        .sic-canvas-wrap canvas { width: 100%; height: auto; display: block; }
        .sic-btns { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
        .sic-btn-gold {
          background: linear-gradient(135deg, #d4af37, #b8960c);
          color: #0a0803; border: none; border-radius: 30px;
          padding: 11px 24px; font-family: 'Cinzel', serif;
          font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
          cursor: pointer; transition: transform 0.2s;
        }
        .sic-btn-gold:hover { transform: translateY(-2px); }
        .sic-btn-ghost {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(212,175,55,0.3);
          color: #d4af37; border-radius: 30px;
          padding: 11px 24px; font-family: 'Cinzel', serif;
          font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
          cursor: pointer; transition: transform 0.2s;
        }
        .sic-btn-ghost:hover { transform: translateY(-2px); }
        .sic-status {
          font-family: 'DM Mono', monospace;
          font-size: 12px; color: rgba(212,175,55,0.75);
          text-align: center;
        }
        .sic-hint {
          font-family: 'DM Mono', monospace;
          font-size: 11px; color: rgba(212,175,55,0.35);
          text-align: center; line-height: 1.5;
        }
      `}</style>

      <div className="sic-overlay" onClick={onClose}>
        <div className="sic-modal" onClick={(e) => e.stopPropagation()}>
          <p className="sic-title">Share Your POV</p>

          {generating && (
            <p className="sic-status" style={{ opacity: 0.5 }}>Generating card…</p>
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
              <p className="sic-hint">Save and post to Instagram, X, or any platform</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
