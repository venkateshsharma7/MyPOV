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
    // Dark blue-grey gradient background to match the theme
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#2c2d3a");
    bg.addColorStop(1, "#15161d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── 2. POSTER CARD ────────────────────────────────────────────────────────
    const PW = 480;   // poster width
    const PH = 720;   // poster height  (standard 2:3 movie poster ratio)
    const PX = (W - PW) / 2;
    const PY = 140;   // Shifted down slightly to fit the avatar at the top
    const PR = 16;    // Slightly sharper corners to match Letterboxd

    // Shadow for poster
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 15;
    rr(ctx, PX, PY, PW, PH, PR);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();

    // Load Poster & Avatar
    const posterSrc = entry.poster
      ? entry.poster
      : entry.poster_path
      ? `https://image.tmdb.org/t/p/w780${entry.poster_path}`
      : null;
    
    // Provide a default avatar if none exists in the entry object
    const avatarSrc = entry.userAvatar || `https://ui-avatars.com/api/?name=User&background=1a1b24&color=fff`;

    const [posterImg, avatarImg] = await Promise.all([
      posterSrc ? loadImg(posterSrc) : Promise.resolve(null),
      loadImg(avatarSrc)
    ]);

    // Draw Poster Image
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
      ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(entry.title || "", W / 2, PY + PH / 2);
    }
    ctx.restore();

    // Poster border
    ctx.save();
    rr(ctx, PX, PY, PW, PH, PR);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // ── 3. AVATAR — circular, centered exactly on the top edge ────────────────
    if (avatarImg) {
      const AR = 46; // Avatar radius
      const AX = W / 2;
      const AY = PY; // Positioned exactly on the top edge of the poster

      // Avatar drop shadow
      ctx.save();
      ctx.beginPath();
      ctx.arc(AX, AY, AR, 0, Math.PI * 2);
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.restore();

      // Draw avatar image clipped to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(AX, AY, AR, 0, Math.PI * 2);
      ctx.clip();
      const scale = Math.max((AR * 2) / avatarImg.width, (AR * 2) / avatarImg.height);
      const dw = avatarImg.width * scale;
      const dh = avatarImg.height * scale;
      ctx.drawImage(avatarImg, AX - dw / 2, AY - dh / 2, dw, dh);
      ctx.restore();

      // Subtle inner/outer border around avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(AX, AY, AR, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.stroke();
      ctx.restore();
    }

    // ── 4. TITLE — white, bold, modern sans-serif ─────────────────────────────
    const TITLE_Y = PY + PH + 75;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 52px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

    let title = entry.title || "Untitled";
    while (ctx.measureText(title).width > W - 80 && title.length > 2) {
      title = title.slice(0, -1);
    }
    if (title !== (entry.title || "Untitled")) title = title.trimEnd() + "…";
    ctx.fillText(title, W / 2, TITLE_Y);

    // ── 5. STARS — gold, cleanly spaced ───────────────────────────────────────
    const r = Number(entry.rating) || 0;
    const fullStars = Math.floor(r / 2);
    const halfStar = r % 2 >= 1;
    const emptyStars = Math.max(0, 5 - fullStars - (halfStar ? 1 : 0));
    const starStr = "★".repeat(fullStars) + (halfStar ? "½" : "") + "☆".repeat(emptyStars);

    const STAR_Y = TITLE_Y + 65;
    ctx.fillStyle = "#d4af37"; // MyPOV Gold
    ctx.font = "48px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    // Adding slight tracking (letter-spacing) natively by adding thin spaces can be tricky in canvas,
    // so we render the star string cleanly centered.
    ctx.fillText(starStr, W / 2, STAR_Y);

    // ── 6. BRANDING — "ON" divider + logo, bottom centre ──────────────────────
    const BRAND_Y = H - 140;

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;

    ctx.beginPath(); ctx.moveTo(90, BRAND_Y); ctx.lineTo(W / 2 - 34, BRAND_Y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 + 34, BRAND_Y); ctx.lineTo(W - 90, BRAND_Y); ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ON", W / 2, BRAND_Y + 7);

    // MyPOV logo
    const logo = logoRef.current;
    if (logo && logo.naturalWidth > 0) {
      const LH = 60;
      const LW = (logo.naturalWidth / logo.naturalHeight) * LH;
      ctx.drawImage(logo, W / 2 - LW / 2, BRAND_Y + 30, LW, LH);
    } else {
      ctx.fillStyle = "#d4af37";
      ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
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
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px;
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
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px;
          color: rgba(212,175,55,0.7); text-align: center;
        }
        .sic-hint {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px;
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
