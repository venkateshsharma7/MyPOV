// src/utils/placeholderImage.js

export function CinematicPlaceholder({ title = "MyPOV", width = 1200, height = 600 }) {
  const svgString = `
    <svg width="${width}" height="${height}" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0803" />
          <stop offset="50%" stop-color="#1c1810" />
          <stop offset="100%" stop-color="#0a0803" />
        </linearGradient>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#d4af37" />
          <stop offset="100%" stop-color="#b8960c" />
        </linearGradient>
        <pattern id="filmStrip" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="none" />
          <rect x="0" y="0" width="8" height="40" fill="rgba(212,175,55,0.08)" />
          <rect x="20" y="0" width="8" height="40" fill="rgba(212,175,55,0.05)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <rect width="100%" height="100%" fill="url(#filmStrip)" />
      <circle cx="600" cy="300" r="120" fill="rgba(212,175,55,0.04)" />
      <circle cx="600" cy="300" r="80" fill="rgba(212,175,55,0.06)" />
      <text x="600" y="280" text-anchor="middle" font-family="'Cinzel', serif" font-size="48" font-weight="600" fill="url(#gold)" letter-spacing="8">${title}</text>
      <text x="600" y="340" text-anchor="middle" font-family="'DM Mono', monospace" font-size="14" fill="rgba(212,175,55,0.4)" letter-spacing="4">CINEMA JOURNAL</text>
      <rect x="0" y="20" width="12" height="24" fill="rgba(212,175,55,0.15)" rx="2" />
      <rect x="0" y="60" width="12" height="24" fill="rgba(212,175,55,0.15)" rx="2" />
      <rect x="0" y="100" width="12" height="24" fill="rgba(212,175,55,0.15)" rx="2" />
      <rect x="1188" y="20" width="12" height="24" fill="rgba(212,175,55,0.15)" rx="2" />
      <rect x="1188" y="60" width="12" height="24" fill="rgba(212,175,55,0.15)" rx="2" />
      <rect x="1188" y="100" width="12" height="24" fill="rgba(212,175,55,0.15)" rx="2" />
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}