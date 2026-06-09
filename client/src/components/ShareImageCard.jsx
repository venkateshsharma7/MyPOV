// src/components/ShareImageCard.jsx
// Letterboxd-style visual share card generator
import { useRef, useEffect, useState } from "react";

const CARD_W = 480;
const CARD_H = 720;

function StarRow({ rating }) {
  const full = Math.floor(rating / 2);
  const half = (rating % 2) >= 1;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push("★");
    else if (i === full && half) stars.push("½");
    else stars.push("☆");
  }
  return stars.join(" ");
}

async function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line, x, cy);
      line = words[n] + " ";
      cy += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, cy);
  return cy + lineHeight;
}

export default function ShareImageCard({ entry, onClose }) {
  const canvasRef = useRef(null);
  const [generating, setGenerating] = useState(true);
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    drawCard();
  }, [entry]);

  async function drawCard() {
    setGenerating(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = CARD_W;
    canvas.height = CARD_H;

    // Background gradient (dark cinema)
    const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
    bg.addColorStop(0, "#0e0c10");
    bg.addColorStop(1, "#07060a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // Gold border
    ctx.strokeStyle = "rgba(212,175,55,0.5)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 10, CARD_W - 20, CARD_H - 20);

    // Load poster
    const posterSrc = entry.poster || entry.poster_path
      ? (entry.poster || `https://image.tmdb.org/t/p/w500${entry.poster_path}`)
      : null;

    let posterImg = null;
    if (posterSrc) {
      // Use a CORS proxy for cross-origin images
      posterImg = await loadImage(posterSrc);
    }

    if (posterImg) {
      // Poster full width top portion
      const posterH = 380;
      ctx.save();
      ctx.beginPath();
      ctx.rect(10, 10, CARD_W - 20, posterH);
      ctx.clip();
      ctx.drawImage(posterImg, 10, 10, CARD_W - 20, posterH);
      ctx.restore();

      // Gradient fade over poster
      const fade = ctx.createLinearGradient(0, posterH - 120, 0, posterH + 40);
      fade.addColorStop(0, "rgba(7,6,10,0)");
      fade.addColorStop(1, "rgba(7,6,10,1)");
      ctx.fillStyle = fade;
      ctx.fillRect(10, posterH - 120, CARD_W - 20, 160);
    } else {
      // Placeholder gradient block
      const placeholderGrad = ctx.createLinearGradient(0, 0, CARD_W, 380);
      placeholderGrad.addColorStop(0, "#1a1530");
      placeholderGrad.addColorStop(1, "#0e0c10");
      ctx.fillStyle = placeholderGrad;
      ctx.fillRect(10, 10, CARD_W - 20, 380);

      // Movie title as placeholder
      ctx.fillStyle = "rgba(212,175,55,0.3)";
      ctx.font = "bold 28px serif";
      ctx.textAlign = "center";
      ctx.fillText(entry.title || "MyPOV", CARD_W / 2, 200);
      ctx.textAlign = "left";
    }

    const contentY = posterImg ? 410 : 420;

    // Title
    ctx.fillStyle = "#f5f0e8";
    ctx.font = "bold 26px Georgia, serif";
    ctx.textAlign = "left";
    const titleText = entry.title || "Untitled";
    const titleLines = titleText.length > 28 ? [titleText.slice(0, 28), titleText.slice(28, 56) + (titleText.length > 56 ? "…" : "")] : [titleText];
    titleLines.forEach((line, i) => ctx.fillText(line, 28, contentY + i * 32));

    const afterTitle = contentY + titleLines.length * 32 + 14;

    // Year badge
    if (entry.date) {
      const yr = String(entry.date).slice(0, 4);
      ctx.fillStyle = "rgba(212,175,55,0.15)";
      const yrW = ctx.measureText(yr).width + 20;
      ctx.beginPath();
      ctx.roundRect(28, afterTitle - 2, yrW, 22, 11);
      ctx.fill();
      ctx.fillStyle = "#d4af37";
      ctx.font = "12px 'Courier New', monospace";
      ctx.fillText(yr, 38, afterTitle + 13);
    }

    // Stars row
    const starsY = afterTitle + 34;
    ctx.fillStyle = "#d4af37";
    ctx.font = "22px serif";
    ctx.fillText(StarRow({ rating: entry.rating || 0 }), 28, starsY);

    // Rating number
    ctx.fillStyle = "rgba(212,175,55,0.7)";
    ctx.font = "13px 'Courier New', monospace";
    ctx.fillText(`${entry.rating || 0} / 10`, 28, starsY + 22);

    // Divider
    ctx.strokeStyle = "rgba(212,175,55,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(28, starsY + 38);
    ctx.lineTo(CARD_W - 28, starsY + 38);
    ctx.stroke();

    // Review excerpt
    const review = String(entry.review || "No review written.").slice(0, 220);
    const reviewText = review.length < (entry.review || "").length ? review + "…" : review;
    ctx.fillStyle = "#a09c94";
    ctx.font = "italic 14px Georgia, serif";
    wrapText(ctx, `"${reviewText}"`, 28, starsY + 62, CARD_W - 56, 22);

    // Bottom branding
    ctx.fillStyle = "rgba(212,175,55,0.6)";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("MY POV", CARD_W / 2, CARD_H - 30);
    ctx.fillStyle = "rgba(212,175,55,0.3)";
    ctx.font = "10px 'Courier New', monospace";
    ctx.fillText("mypov.app", CARD_W / 2, CARD_H - 16);
    ctx.textAlign = "left";

    setGenerating(false);
  }

  async function downloadImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `mypov-${(entry.title || "review").replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
    setShareStatus("Image downloaded!");
  }

  async function shareImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (navigator.canShare) {
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `mypov-${entry.title || "review"}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `${entry.title} — MyPOV`,
              text: `I rated ${entry.title} ${entry.rating}/10`,
              files: [file],
            });
            setShareStatus("Shared!");
            return;
          } catch (e) {
            if (e?.name !== "AbortError") console.error(e);
          }
        }
        downloadImage();
      });
    } else {
      downloadImage();
    }
  }

  return (
    <>
      <style>{`
        .share-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .share-modal {
          background: #0e0c10;
          border: 1px solid rgba(212,175,55,0.25);
          border-radius: 20px;
          padding: 24px;
          max-width: 520px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          max-height: 95vh;
          overflow-y: auto;
        }
        .share-modal-title {
          font-family: 'Cinzel', serif;
          color: #d4af37;
          font-size: 14px;
          letter-spacing: 3px;
          text-transform: uppercase;
        }
        .share-canvas-wrap {
          width: 100%;
          max-width: 360px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 40px rgba(0,0,0,0.7);
        }
        .share-canvas-wrap canvas {
          width: 100%;
          height: auto;
          display: block;
        }
        .share-btn-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .share-dl-btn {
          background: linear-gradient(135deg, #d4af37, #b8960c);
          color: #0a0803;
          border: none;
          border-radius: 30px;
          padding: 11px 24px;
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .share-dl-btn:hover { transform: translateY(-2px); }
        .share-cl-btn {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(212,175,55,0.3);
          color: #d4af37;
          border-radius: 30px;
          padding: 11px 24px;
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .share-cl-btn:hover { transform: translateY(-2px); }
        .share-status-text {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: rgba(212,175,55,0.75);
        }
        .share-generating {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: rgba(212,175,55,0.5);
          letter-spacing: 0.1em;
        }
      `}</style>

      <div className="share-modal-overlay" onClick={onClose}>
        <div className="share-modal" onClick={(e) => e.stopPropagation()}>
          <p className="share-modal-title">Share Your POV</p>

          {generating && (
            <p className="share-generating">Generating card…</p>
          )}

          <div className="share-canvas-wrap">
            <canvas ref={canvasRef} />
          </div>

          {!generating && (
            <>
              <div className="share-btn-row">
                <button className="share-dl-btn" onClick={downloadImage}>
                  Download Image
                </button>
                <button className="share-dl-btn" onClick={shareImage}>
                  Share
                </button>
                <button className="share-cl-btn" onClick={onClose}>
                  Close
                </button>
              </div>
              {shareStatus && (
                <p className="share-status-text">{shareStatus}</p>
              )}
              <p className="share-status-text" style={{ textAlign: "center", opacity: 0.6 }}>
                Save this image and post it to Instagram, X, or any social platform
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
