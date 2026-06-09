// src/components/ShareImageCard.jsx
import { useRef, useEffect, useState } from "react";
import myPOVLogoSrc from "../assets/MyPOV_Logo.png";

const W = 720;
const H = 1280;

function loadImg(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const attempt = (url, isFallback) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => {
        if (!isFallback) {
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

function drawInitialsAvatar(ctx, username, cx, cy, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1720";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(212,175,55, 0.8)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const initials = (username || "?")
    .split(/[\s_\-\.]+/)
    .map(w => w[0]?.toUpperCase() || "")
    .slice(0, 2)
    .join("") || username[0]?.toUpperCase() || "?";

  ctx.save();
  ctx.fillStyle = "#d4af37";
  ctx.font = `bold ${radius * 0.85}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials, cx, cy + 2); 
  ctx.restore();
}

export default function ShareImageCard({ entry, onClose }) {
  const canvasRef = useRef(null);
  const logoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");

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
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#2c2d3a");
    bg.addColorStop(1, "#15161d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Coordinate Setup
    const AR = 46;
    const AX = W / 2;
    const AY = 140;
    
    const PW = 480;
    const PH = 720;
    const PX = (W - PW) / 2;
    const PY = AY;

    const username = entry.user?.username || entry.username || null;
    const avatarSrc = entry.user?.avatar || entry.userAvatar || null;
    const posterSrc = entry.poster
      ? entry.poster
      : entry.poster_path
      ? `https://image.tmdb.org/t/p/w780${entry.poster_path}`
      : null;

    const [avatarImg, posterImg] = await Promise.all([
      avatarSrc ? loadImg(avatarSrc) : Promise.resolve(null),
      posterSrc ? loadImg(posterSrc) : Promise.resolve(null)
    ]);

    // ── 2. POSTER CARD ────────────────────────────────────────────────────────
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 15;
    rr(ctx, PX, PY, PW, PH, 16);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();

    ctx.save();
    rr(ctx, PX, PY, PW, PH, 16);
    ctx.clip();
    if (posterImg) {
      const scale = Math.max(PW / posterImg.width, PH / posterImg.height);
      const dw = posterImg.width * scale;
      const dh = posterImg.height * scale;
      ctx.drawImage(posterImg, PX + (PW - dw) / 2, PY + (PH - dh) / 2, dw, dh);
    } else {
      const g = ctx.createLinearGradient(PX, PY, PX + PW, PY + PH);
      g.addColorStop(0, "#2a2040");
      g.addColorStop(1, "#0d0b14");
      ctx.fillStyle = g;
      ctx.fillRect(PX, PY, PW, PH);
      ctx.fillStyle = "rgba(212,175,55,0.5)";
      ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(entry.title || "", W / 2, PY + PH / 2);
    }
    ctx.restore();

    ctx.save();
    rr(ctx, PX, PY, PW, PH, 16);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // ── 3. AVATAR BUBBLE ──────────────────────────────────────────────────────
    if (avatarImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(AX, AY, AR, 0, Math.PI * 2);
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(AX, AY, AR, 0, Math.PI * 2);
      ctx.clip();
      const scale = Math.max((AR * 2) / avatarImg.width, (AR * 2) / avatarImg.height);
      const dw = avatarImg.width * scale;
      const dh = avatarImg.height * scale;
      ctx.drawImage(avatarImg, AX - dw / 2, AY - dh / 2, dw, dh);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(AX, AY, AR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    } else {
      drawInitialsAvatar(ctx, username || "?", AX, AY, AR);
    }

    // ── 4. TITLE ──────────────────────────────────────────────────────────────
    const TITLE_Y = PY + PH + 72;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 52px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    let title = entry.title || "Untitled";
    while (ctx.measureText(title).width > W - 80 && title.length > 2) {
      title = title.slice(0, -1);
    }
    if (title !== (entry.title || "Untitled")) title = title.trimEnd() + "…";
    ctx.fillText(title, W / 2, TITLE_Y);

    // ── 5. STARS ──────────────────────────────────────────────────────────────
    const r = Number(entry.rating) || 0;
    const fullStars = Math.floor(r / 2);
    const halfStar = r % 2 >= 1;
    const emptyStars = Math.max(0, 5 - fullStars - (halfStar ? 1 : 0));
    const starStr = "★".repeat(fullStars) + (halfStar ? "½" : "") + "☆".repeat(emptyStars);

    const STAR_Y = TITLE_Y + 62;
    ctx.fillStyle = "#d4af37";
    ctx.font = "48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(starStr, W / 2, STAR_Y);

    // ── 6. USERNAME ───────────────────────────────────────────────────────────
    if (username) {
      const USER_Y = STAR_Y + 45;
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "600 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      
      const userText = `REVIEW BY @${username}`.toUpperCase().split('').join(String.fromCharCode(8202));
      ctx.fillText(userText, W / 2, USER_Y);
    }

    // ── 7. BRANDING — "ON" + BIGGER LOGO ──────────────────────────────────────
    const BRAND_Y = H - 150; // Shifted up slightly to accommodate the bigger logo

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(90, BRAND_Y); ctx.lineTo(W / 2 - 34, BRAND_Y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 + 34, BRAND_Y); ctx.lineTo(W - 90, BRAND_Y); ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ON", W / 2, BRAND_Y + 7);

    const logo = logoRef.current;
    if (logo && logo.naturalWidth > 0) {
      const LH = 86; // Increased from 60 to 86
      const LW = (logo.naturalWidth / logo.naturalHeight) * LH;
      ctx.drawImage(logo, W / 2 - LW / 2, BRAND_Y + 30, LW, LH);
    } else {
      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 34px sans-serif"; // Also made fallback text bigger
      ctx.textAlign = "center";
      ctx.fillText("MY POV", W / 2, BRAND_Y + 70);
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
        try {
          await navigator.share({ title: `${entry.title} — MyPOV`, files: [file] });
          setStatus("Shared!");
          return;
        } catch (e) { if (e?.name !== "AbortError") console.error(e); }
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
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #d4af37; font-weight: 700;
          font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
        }
        .sic-wrap {
          width: 100%;
          border-radius: 14px; overflow: hidden;
          box-shadow: 0 20px 70px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05);
        }
        .sic-wrap canvas { width: 100%; height: auto; display: block; }
        .sic-generating {
          font-family: monospace; font-size: 11px;
          color: rgba(212,175,55,0.4); letter-spacing: 0.1em;
        }
        .sic-btns { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
        .sic-gold {
          background: linear-gradient(135deg, #d4af37, #b8960c); color: #0a0803;
          border: none; border-radius: 30px; padding: 12px 28px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-weight: 700; font-size: 11px; letter-spacing: 1.5px;
          text-transform: uppercase; cursor: pointer;
          box-shadow: 0 4px 18px rgba(212,175,55,0.35);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .sic-gold:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(212,175,55,0.5); }
        .sic-ghost {
          background: transparent; border: 1px solid rgba(212,175,55,0.3);
          color: #d4af37; border-radius: 30px; padding: 12px 28px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-weight: 700; font-size: 11px; letter-spacing: 1.5px;
          text-transform: uppercase; cursor: pointer;
          transition: transform 0.15s, border-color 0.15s;
        }
        .sic-ghost:hover { transform: translateY(-2px); border-color: rgba(212,175,55,0.7); }
        .sic-status {
          font-family: monospace; font-size: 11px;
          color: rgba(212,175,55,0.7); text-align: center;
        }
        .sic-hint {
          font-family: monospace; font-size: 10px;
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
