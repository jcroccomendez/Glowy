import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Desktop, ArrowCircleDown, Sun, Moon, IconContext, XLogo, FacebookLogo, LinkedinLogo, X, CaretDown } from '@phosphor-icons/react';
import { getTokens } from './design-system/tokens';
import { Tooltip, Slider, Switch, DirectionPad, Modal } from './design-system/components';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import useSound from 'use-sound';

// --- CONFIGURATION AND UTILITIES ---
const APP_BG = '#0d0d0d'; // Unified general app background
const IS_MOBILE = typeof window !== 'undefined' && (('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
const MOBILE_DPR = 1;
const MOBILE_FPS = 30;

// iOS WebKit handles ctx.filter and large feGaussianBlur poorly. Detect once
// and use it ONLY to cap mobile/iOS rendering — desktop path stays untouched.
const IS_IOS = typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent);
const SUPPORTS_CANVAS_FILTER = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas').getContext('2d');
    c.filter = 'blur(2px)';
    return c.filter === 'blur(2px)';
  } catch (_e) {
    return false;
  }
})();

// Cache noise canvases per format so format changes don't re-allocate huge ImageData
const noiseCacheByFormat = new Map();

// Color Themes
const THEMES = {
  neon: {
    label: 'Neon',
    bg: '#062F2C',
    gradientStart: '#2482F1',
    gradientEnd: '#00F345',
    preview: ['#062F2C', '#2482F1', '#00F345'],
  },
  midnight: {
    label: 'Prism',
    bg: '#041050',
    gradientStart: '#0055FF',
    gradientEnd: '#5BFFC0',
    preview: ['#041050', '#0055FF', '#5BFFC0'],
  },
  ember: {
    label: 'Acid',
    bg: '#00545F',
    gradientStart: '#D6FB00',
    gradientEnd: '#ECFFB6',
    preview: ['#00545F', '#D6FB00', '#ECFFB6'],
  },
};

// Brand-inspired curated palettes for the Random theme button. Each is hand-picked
// so the dark bg + 2 gradient stops stay visually consistent (technology, social,
// medical, finance, etc.) instead of producing chaotic random hex values.
const RANDOM_PALETTES = [
  { label: 'Apple', bg: '#0B0F1A', gradientStart: '#0A84FF', gradientMid: '#5856D6', gradientEnd: '#64D2FF' },
  { label: 'Meta', bg: '#0B1F3D', gradientStart: '#1877F2', gradientMid: '#845EE5', gradientEnd: '#00C6FF' },
  { label: 'Instagram', bg: '#1F0C29', gradientStart: '#833AB4', gradientMid: '#E1306C', gradientEnd: '#FCAF45' },
  { label: 'Spotify', bg: '#0A1F0F', gradientStart: '#1DB954', gradientMid: '#B4FF39', gradientEnd: '#A0F0BC' },
  { label: 'Slack', bg: '#1A0A2E', gradientStart: '#E01E5A', gradientMid: '#36C5F0', gradientEnd: '#ECB22E' },
  { label: 'Twitch', bg: '#160A2E', gradientStart: '#6441A5', gradientMid: '#FF4DA6', gradientEnd: '#BF94FF' },
  { label: 'Stripe', bg: '#0A1733', gradientStart: '#635BFF', gradientMid: '#00C8FF', gradientEnd: '#00FFB3' },
  { label: 'Sunset', bg: '#2D0F2E', gradientStart: '#FF1B6B', gradientMid: '#FF9F45', gradientEnd: '#FFD93D' },
  { label: 'Ocean', bg: '#001D3D', gradientStart: '#003566', gradientMid: '#0077B6', gradientEnd: '#00C9FF' },
  { label: 'Aurora', bg: '#0B1426', gradientStart: '#5C6BC0', gradientMid: '#00E5BC', gradientEnd: '#FF6F9C' },
  { label: 'Volcano', bg: '#1F0A05', gradientStart: '#D32F2F', gradientMid: '#FF5722', gradientEnd: '#FFD740' },
  { label: 'Lavender', bg: '#1A0B2E', gradientStart: '#7B2CBF', gradientMid: '#FF7AC6', gradientEnd: '#C77DFF' },
  { label: 'Cyber', bg: '#0A0A23', gradientStart: '#FF00FF', gradientMid: '#A100FF', gradientEnd: '#00FFFF' },
  { label: 'Forest', bg: '#0E1F12', gradientStart: '#1B5E20', gradientMid: '#66BB6A', gradientEnd: '#DCEDC8' },
  { label: 'Rose', bg: '#2C0B14', gradientStart: '#FF1744', gradientMid: '#FF7A1F', gradientEnd: '#FFD93D' },
  { label: 'Medical', bg: '#062B26', gradientStart: '#00BFA5', gradientMid: '#80E27E', gradientEnd: '#B2FFDA' },
  { label: 'Finance', bg: '#1A1305', gradientStart: '#7B5E10', gradientMid: '#C9A227', gradientEnd: '#FFD700' },
  { label: 'Rose Gold', bg: '#1F1014', gradientStart: '#B76A6A', gradientMid: '#E0B97A', gradientEnd: '#FFDAB9' },
  { label: 'Mint', bg: '#04221F', gradientStart: '#00C9A7', gradientMid: '#4DD0E1', gradientEnd: '#A8FFD5' },
  { label: 'Berry', bg: '#1A0420', gradientStart: '#6A1B9A', gradientMid: '#F06292', gradientEnd: '#FFAB91' },
];

// Small HSL jitter helper so a random palette gets unique variation each click
// while still feeling cohesive (no hue jumps, no muddy values).
const hexToHsl = (hex) => {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return [h, s * 100, l * 100];
};
const hslToHex = (h, s, l) => {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};
const jitter = (hex, dH, dS, dL) => {
  const [h, s, l] = hexToHsl(hex);
  const r = () => (Math.random() * 2 - 1);
  return hslToHex(h + r() * dH, s + r() * dS, l + r() * dL);
};
const jitterPalette = (p) => ({
  label: p.label,
  bg: jitter(p.bg, 8, 6, 3),
  gradientStart: jitter(p.gradientStart, 12, 8, 5),
  gradientMid: p.gradientMid ? jitter(p.gradientMid, 13, 9, 5) : undefined,
  gradientEnd: jitter(p.gradientEnd, 14, 10, 6),
});

const FORMATS = {
  '9:16': { width: 1080, height: 1920, label: "9:16", name: "Full Portrait" },
  '1:1': { width: 1080, height: 1080, label: "1:1", name: "Square" },
  '16:9': { width: 1920, height: 1080, label: "16:9", name: "Landscape" },
};

// --- TAB ICONS (use currentColor so the active state can flip white → dark) ---
const PatternIcon = (props) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="19" cy="19" r="2" fill="currentColor" />
    <circle opacity="0.8" cx="19" cy="25" r="2" fill="currentColor" />
    <circle opacity="0.7" cx="19" cy="31" r="2" fill="currentColor" />
    <circle opacity="0.5" cx="19" cy="37" r="2" fill="currentColor" />
    <circle opacity="0.8" cx="25" cy="19" r="2" fill="currentColor" />
    <circle opacity="0.7" cx="25" cy="25" r="2" fill="currentColor" />
    <circle opacity="0.5" cx="25" cy="31" r="2" fill="currentColor" />
    <circle opacity="0.3" cx="25" cy="37" r="2" fill="currentColor" />
    <circle opacity="0.7" cx="31" cy="19" r="2" fill="currentColor" />
    <circle opacity="0.5" cx="31" cy="25" r="2" fill="currentColor" />
    <circle opacity="0.3" cx="31" cy="31" r="2" fill="currentColor" />
    <circle opacity="0.2" cx="31" cy="37" r="2" fill="currentColor" />
    <circle opacity="0.5" cx="37" cy="19" r="2" fill="currentColor" />
    <circle opacity="0.3" cx="37" cy="25" r="2" fill="currentColor" />
    <circle opacity="0.2" cx="37" cy="31" r="2" fill="currentColor" />
    <circle opacity="0.05" cx="37" cy="37" r="2" fill="currentColor" />
  </svg>
);

const SpectrumIcon = (props) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect x="18" y="16" width="4" height="24" fill="currentColor" />
    <rect opacity="0.8" x="22" y="23.2" width="4" height="16.8" fill="currentColor" />
    <rect opacity="0.6" x="26" y="26.8" width="4" height="13.2" fill="currentColor" />
    <rect opacity="0.4" x="30" y="18.4" width="4" height="21.6" fill="currentColor" />
    <rect opacity="0.2" x="34" y="26.8" width="4" height="13.2" fill="currentColor" />
  </svg>
);

const WavesIcon = (props) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#wavesIconClip)">
      <circle cx="16.5" cy="39.5" r="4.5" stroke="currentColor" strokeWidth="4" />
      <circle opacity="0.8" cx="16.5" cy="39.5" r="8.5" stroke="currentColor" strokeWidth="4" />
      <circle opacity="0.6" cx="16.5" cy="39.5" r="12.5" stroke="currentColor" strokeWidth="4" />
      <circle opacity="0.4" cx="16.5" cy="39.5" r="16.5" stroke="currentColor" strokeWidth="4" />
      <circle opacity="0.2" cx="16.5" cy="39.5" r="20.5" stroke="currentColor" strokeWidth="4" />
    </g>
    <defs>
      <clipPath id="wavesIconClip">
        <rect width="24" height="24" fill="white" transform="translate(16 16)" />
      </clipPath>
    </defs>
  </svg>
);

const PulseIcon = (props) => (
  <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g clipPath="url(#pulseIconClip)">
      <circle cx="27.5" cy="41.5" r="4.5" stroke="currentColor" strokeWidth="4" />
      <circle opacity="0.8" cx="27.5" cy="41.5" r="8.5" stroke="currentColor" strokeWidth="4" />
      <circle opacity="0.6" cx="27.5" cy="41.5" r="12.5" stroke="currentColor" strokeWidth="4" />
      <circle opacity="0.4" cx="27.5" cy="41.5" r="16.5" stroke="currentColor" strokeWidth="4" />
      <circle opacity="0.2" cx="27.5" cy="41.5" r="20.5" stroke="currentColor" strokeWidth="4" />
    </g>
    <defs>
      <clipPath id="pulseIconClip">
        <rect width="24" height="24" fill="white" transform="translate(16 16)" />
      </clipPath>
    </defs>
  </svg>
);

const TABS = [
  { id: 'neonPattern', label: 'Pattern', Icon: PatternIcon },
  { id: 'spectrum', label: 'Spectrum', Icon: SpectrumIcon },
  { id: 'radial', label: 'Waves', Icon: WavesIcon },
  { id: 'glass', label: 'Pulse', Icon: PulseIcon },
];

// --- INTRO LOADER ---
// Full-screen Waves (Neon theme) background animation with a centred card
// containing the app title, a subtitle, a 0→100% progress counter and the
// neonplace logo. Fades in on mount and fades out at 100%, then calls onDone.
const NeonplaceLogo = ({ className }) => (
  <div className={`inline-flex items-center gap-1.5 ${className || ''}`}>
    <svg viewBox="0 0 20 17" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[15px] w-auto" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M19.089 0v9.113l-6.356 6.357-6.367-6.367L0 15.47V6.357L6.356 0l6.367 6.368L19.089 0Z" fill="#24F187" />
      <path fillRule="evenodd" clipRule="evenodd" d="M6.367 15.47H4.71V14.3l1.657-1.657 1.656 1.657v1.17H6.367Z" fill="#fff" />
    </svg>
    <span className="text-white text-[14px] font-normal tracking-tight leading-none">neonplace</span>
  </div>
);

const Loader = ({ onDone, onFadeStart, bgColor = APP_BG }) => {
  const canvasRef = useRef(null);
  const cardRef = useRef(null);
  const overlayRef = useRef(null);
  const mousePosRef = useRef(null);
  const interactRef = useRef({ x: 0, y: 0, weight: 0 });
  const tiltRef = useRef({ trx: 0, tryY: 0, rx: 0, ry: 0 });
  const [progress, setProgress] = useState(0);
  const [shown, setShown] = useState(false);
  const [hiding, setHiding] = useState(false);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const card = cardRef.current;
    if (!canvas || !card) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      mousePosRef.current = null;
      tiltRef.current.trx = 0;
      tiltRef.current.tryY = 0;
      return;
    }
    const W = 669, H = 351.369;
    mousePosRef.current = { x: (x / rect.width) * W, y: (y / rect.height) * H };
    // 3D tilt: cursor offset from center → small rotation (max ±5°)
    const cardRect = card.getBoundingClientRect();
    const nx = (e.clientX - cardRect.left) / cardRect.width - 0.5;  // -0.5..0.5
    const ny = (e.clientY - cardRect.top) / cardRect.height - 0.5;
    tiltRef.current.tryY = nx * 6;   // rotateY range ±3°
    tiltRef.current.trx = -ny * 6;   // rotateX range ±3°
    startTilt();
  };
  const tiltRafRef = useRef(null);
  const startTilt = () => {
    if (tiltRafRef.current != null) return;
    const tick = () => {
      if (document.hidden) { tiltRafRef.current = requestAnimationFrame(tick); return; }
      const t = tiltRef.current;
      const dx = t.trx - t.rx;
      const dy = t.tryY - t.ry;
      if (Math.abs(dx) < 0.005 && Math.abs(dy) < 0.005) {
        t.rx = t.trx; t.ry = t.tryY;
        const el = cardRef.current;
        if (el) {
          el.style.transform = `perspective(1600px) rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg)`;
        }
        tiltRafRef.current = null;
        return;
      }
      t.rx += dx * 0.12;
      t.ry += dy * 0.12;
      const el = cardRef.current;
      if (el) {
        el.style.transform = `perspective(1600px) rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg)`;
      }
      tiltRafRef.current = requestAnimationFrame(tick);
    };
    tiltRafRef.current = requestAnimationFrame(tick);
  };
  const handleMouseLeave = () => {
    mousePosRef.current = null;
    tiltRef.current.trx = 0;
    tiltRef.current.tryY = 0;
    startTilt();
  };

  // Spring-eased 3D tilt — RAF only while in motion
  useEffect(() => {
    startTilt();
    return () => {
      if (tiltRafRef.current != null) cancelAnimationFrame(tiltRafRef.current);
      tiltRafRef.current = null;
    };
  }, []);

  // Trigger the entry fade after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Full-screen Waves animation (Neon theme).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    const ctx = canvas.getContext('2d');

    // Downscaled offscreen for the heavy 170px blur.
    const DOWNSCALE = 4;
    const off = document.createElement('canvas');
    const offCtx = off.getContext('2d');

    W = 669;
    H = 351.369;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    off.width = Math.max(1, Math.ceil(W / DOWNSCALE));
    off.height = Math.max(1, Math.ceil(H / DOWNSCALE));

    // Cycle through default themes + a sample of brand-inspired random palettes
    // during the loader. Each slot holds for a moment then quick-fades to the
    // next so the color shift is unmistakable while the progress fills.
    const randomSample = ['Apple', 'Instagram', 'Spotify', 'Sunset', 'Aurora', 'Cyber', 'Mint']
      .map((n) => RANDOM_PALETTES.find((p) => p.label === n))
      .filter(Boolean)
      .map((p) => ({ bg: p.bg, gradientStart: p.gradientStart, gradientEnd: p.gradientEnd }));
    // Force the first cycle slot to read clearly green so the intro opens with
    // Neon's signature color instead of the blue gradient stop dominating.
    const cycleNeon = {
      ...THEMES.neon,
      gradientStart: '#1DB954',
      gradientEnd: '#00F345',
    };
    const themesCycle = [cycleNeon, THEMES.midnight, THEMES.ember, ...randomSample];
    const hexToRgb = (h) => {
      const m = h.replace('#', '');
      return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
    };
    const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    const lerpHex = (a, b, t) => {
      const ra = hexToRgb(a), rb = hexToRgb(b);
      return rgbToHex([ra[0] + (rb[0] - ra[0]) * t, ra[1] + (rb[1] - ra[1]) * t, ra[2] + (rb[2] - ra[2]) * t]);
    };

    // Noise tile (same look as the main canvas's noise overlay).
    const noiseSize = 256;
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = noiseSize;
    noiseCanvas.height = noiseSize;
    const noiseCtx = noiseCanvas.getContext('2d');
    const imgData = noiseCtx.createImageData(noiseSize, noiseSize);
    const nd = imgData.data;
    for (let i = 0; i < nd.length; i += 4) {
      const v = Math.random() * 255;
      nd[i] = v; nd[i + 1] = v; nd[i + 2] = v; nd[i + 3] = 255;
    }
    noiseCtx.putImageData(imgData, 0, 0);

    let raf;
    const startTime = performance.now();
    const SLOT_MS = 400;
    const FADE_MS = 250;
    const draw = (time) => {
      if (document.hidden) { raf = requestAnimationFrame(draw); return; }
      try {
        const elapsed = time - startTime;
        const mPos = mousePosRef.current;
        if (mPos) {
          interactRef.current.weight += (0.2 - interactRef.current.weight) * 0.2;
          interactRef.current.x += (mPos.x - interactRef.current.x) * 0.2;
          interactRef.current.y += (mPos.y - interactRef.current.y) * 0.2;
        } else {
          interactRef.current.weight += (0 - interactRef.current.weight) * 0.2;
        }

        // Theme cycling: hold each theme purely for SLOT_MS then crossfade
        // for FADE_MS into the next. Each segment = SLOT_MS + FADE_MS.
        const SEG_MS = SLOT_MS + FADE_MS;
        const slot = Math.floor(elapsed / SEG_MS);
        const segElapsed = elapsed - slot * SEG_MS;
        const idxA = slot % themesCycle.length;
        const idxB = (slot + 1) % themesCycle.length;
        const inFade = segElapsed > SLOT_MS;
        const blend = inFade ? (segElapsed - SLOT_MS) / FADE_MS : 0;
        const themeA = themesCycle[idxA];
        const themeB = themesCycle[idxB];
        const bgNow = lerpHex(themeA.bg, themeB.bg, blend);

        const offS = off.width / W;
        ctx.fillStyle = bgNow;
        ctx.fillRect(0, 0, W, H);

        // Sync left overlay gradient to the current theme bg color
        if (overlayRef.current) {
          const [r, g, b] = hexToRgb(bgNow);
          const rgb = `${r}, ${g}, ${b}`;
          overlayRef.current.style.background = `linear-gradient(90deg, rgb(${rgb}) 0%, rgb(${rgb}) 22%, rgba(${rgb},0.98) 32%, rgba(${rgb},0.93) 42%, rgba(${rgb},0.84) 52%, rgba(${rgb},0.7) 62%, rgba(${rgb},0.52) 72%, rgba(${rgb},0.32) 82%, rgba(${rgb},0.14) 92%, rgba(${rgb},0) 100%)`;
        }

        const spectrumCols = 9;
        const colWidth = W / spectrumCols;
        const extraLeft = 4, extraRight = 4;
        const numCols = spectrumCols + extraLeft + extraRight;
        const startX = -extraLeft * colWidth;

        const radius = Math.max(W, H) * 0.4;
        const baseBlobY = H + radius * 0.30;
        const animT = time * 0.00012;
        const numPoints = 60;

        const getWarpedX = (baseX, y) => {
          const yRatio = y / H;
          const focalX = W * 0.05;
          const spread = Math.pow(yRatio, 0.7);
          const targetX = baseX * 1.2;
          const fanX = focalX + (targetX - focalX) * spread;
          const arc = Math.sin(yRatio * Math.PI) * W * 0.035;
          const breath = Math.sin(animT) * W * 0.008 * yRatio;
          return fanX + arc + breath;
        };

        const boundaries = [];
        for (let col = 0; col <= numCols; col++) {
          const baseX = startX + col * colWidth;
          const points = [];
          for (let j = 0; j <= numPoints; j++) {
            const y = (j / numPoints) * H;
            points.push({ x: getWarpedX(baseX, y), y });
          }
          boundaries.push(points);
        }

        for (let i = 0; i < numCols; i++) {
          const colDelayMs = i * 60;
          const colDurationMs = 800;
          const rawColP = Math.max(0, Math.min((elapsed - 100 - colDelayMs) / colDurationMs, 1));
          const pColFade = Math.pow(rawColP, 2);

          ctx.save();
          const leftBound = boundaries[i];
          const rightBound = boundaries[i + 1];
          ctx.beginPath();
          ctx.moveTo(leftBound[0].x, leftBound[0].y);
          for (let j = 1; j < leftBound.length; j++) ctx.lineTo(leftBound[j].x, leftBound[j].y);
          for (let j = rightBound.length - 1; j >= 0; j--) ctx.lineTo(rightBound[j].x, rightBound[j].y);
          ctx.closePath();
          ctx.clip();

          const t = (time + i * 400) * 0.0015;
          const waveX = W / 2 + Math.sin(t * 0.5) * (W * 0.25);
          const waveY = baseBlobY + Math.cos(t * 0.8) * (H * 0.15);
          const iw = interactRef.current.weight;
          const blobX = waveX * (1 - iw) + interactRef.current.x * iw;
          const blobY = waveY * (1 - iw) + interactRef.current.y * iw;
          let rx = radius + Math.sin(t * 1.2) * (W * 0.15);
          let ry = radius + Math.cos(t * 1.5) * (H * 0.10);
          const gradScale = 0.9 + (0.1 * pColFade);
          rx *= gradScale;
          ry *= gradScale;

          // Render blurred gradient ellipse via offscreen ctx.filter blur. Lerped
          // gradient colors so the cycle transitions remain visible. Reliable
          // across browsers — no SVG sprite loading dependency.
          const fbStart = lerpHex(themeA.gradientStart, themeB.gradientStart, blend);
          const fbEnd = lerpHex(themeA.gradientEnd, themeB.gradientEnd, blend);
          offCtx.clearRect(0, 0, off.width, off.height);
          // iOS clamps large blur radii — keep effective radius ≤ 40px on iOS
          // so the loader gradient still reads as blurred, not as a hard ellipse.
          offCtx.filter = `blur(${(IS_IOS ? Math.min(40, 170 * offS) : 170 * offS)}px)`;
          const grad = offCtx.createLinearGradient(
            (blobX - rx) * offS, blobY * offS,
            (blobX + rx) * offS, blobY * offS,
          );
          grad.addColorStop(0.1529, fbStart);
          grad.addColorStop(0.8046, fbEnd);
          offCtx.fillStyle = grad;
          offCtx.beginPath();
          offCtx.ellipse(blobX * offS, blobY * offS, rx * offS, ry * offS, 0, 0, Math.PI * 2);
          offCtx.fill();
          offCtx.filter = 'none';
          ctx.globalAlpha = pColFade;
          ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, W, H);
          ctx.globalAlpha = 1;
          ctx.restore();

          if (i < numCols - 1) {
            ctx.save();
            ctx.globalAlpha = pColFade * 0.5;
            ctx.setLineDash([5, 9.3]);
            ctx.lineWidth = 1.24;
            // Tint the dashed line tip with the current theme's gradient end color
            const tipColor = lerpHex(themeA.gradientEnd, themeB.gradientEnd, blend);
            const lineGrad = ctx.createLinearGradient(0, 0, 0, H);
            lineGrad.addColorStop(0, 'rgba(255,255,255,0)');
            lineGrad.addColorStop(0.35, 'rgba(255,255,255,0)');
            lineGrad.addColorStop(1, tipColor);
            ctx.strokeStyle = lineGrad;
            const b = boundaries[i + 1];
            ctx.beginPath();
            ctx.moveTo(b[0].x, b[0].y);
            for (let j = 1; j < b.length; j++) ctx.lineTo(b[j].x, b[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }
        ctx.save();
        ctx.globalAlpha = 0.025;
        const pat = ctx.createPattern(noiseCanvas, 'repeat');
        if (pat) { ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); }
        ctx.restore();
      } catch (err) {
        // swallow per-frame errors so the rAF chain keeps running
      } finally {
        raf = requestAnimationFrame(draw);
      }
    };
    // Immediate first frame so the canvas never appears blank while waiting on rAF.
    try { draw(performance.now()); } catch (e) { /* defensive */ }
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  // 0 → 100 progress counter with ease-in-out timing. When it hits 100 we
  // pause briefly, then fade out and notify the parent.
  useEffect(() => {
    const start = performance.now();
    const duration = 5200;
    let raf;
    let lastProgress = -1;
    const tick = (now) => {
      const k = Math.min(1, (now - start) / duration);
      const eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const next = Math.floor(eased * 100);
      if (next !== lastProgress) {
        lastProgress = next;
        setProgress(next);
      }
      if (k < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setProgress(100);
        setTimeout(() => {
          setHiding(true);
          onFadeStart?.();
          setTimeout(() => onDone?.(), 600);
        }, 350);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className={`fixed inset-0 z-[100] overflow-hidden flex items-center justify-center transition-opacity duration-[600ms] ease-out ${shown && !hiding ? 'opacity-100' : 'opacity-0'}`}
    >
      <div
        ref={cardRef}
        className="relative overflow-hidden flex flex-col"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: 669,
          height: 351.369,
          flexShrink: 0,
          background: '#052825',
          padding: 50,
          borderRadius: 16,
          boxShadow: '0 4px 116px rgba(0,0,0,0.24)',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block pointer-events-none"
          style={{ borderRadius: 16 }}
        />
        <div
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none"
        />
        <img
          src="/glowydark.png"
          alt="Glowy"
          className="relative object-contain self-start mr-auto"
          style={{ height: 22, width: 'auto' }}
        />
        <div
          className="relative text-white mt-3"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '30px',
            fontWeight: 300,
            lineHeight: '120%',
            display: 'inline-block',
          }}
        >
          Built for anyone who<br />needs a nice background
        </div>
        <div
          className="relative mt-auto rounded-full overflow-hidden"
          style={{ width: 160, height: 4, backgroundColor: 'rgba(255,255,255,0.12)' }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%`, backgroundColor: '#FFFFFF' }}
          />
        </div>
      </div>
    </div>
  );
};

// UI primitives (Tooltip, Slider, Switch, DirectionPad) live in
// src/design-system/components — imported above.

// --- MAIN APP COMPONENT ---
export default function App() {
  // General state
  const [format, setFormat] = useState('9:16');
  const [isAnimated, setIsAnimated] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [svgExporting, setSvgExporting] = useState(false);
  const [svgProgress, setSvgProgress] = useState(0);
  const [loaderDone, setLoaderDone] = useState(false);
  const [shapeCount, setShapeCount] = useState(9);
  const [customTheme, setCustomTheme] = useState(null);
  const [showDashed, setShowDashed] = useState(true);
  const [showNoise, setShowNoise] = useState(true);
  const [themePref, setThemePref] = useState('system'); // 'system' | 'light' | 'dark'
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  const uiTheme = themePref === 'system' ? (systemDark ? 'dark' : 'light') : themePref;
  const isLight = uiTheme === 'light';
  const ui = getTokens(uiTheme);

  // Preload all UI sounds on first paint
  useEffect(() => {
    const urls = ['/sounds/type_02.wav', '/sounds/rollover6.ogg'];
    urls.forEach((url) => {
      const a = new Audio();
      a.preload = 'auto';
      a.src = url;
      a.load();
    });
  }, []);

  // Classic Mode state
  const [direction, setDirection] = useState('left');
  const [dotSize, setDotSize] = useState(1.8);
  const [dotSpacing, setDotSpacing] = useState(28);
  const [gradientPos, setGradientPos] = useState('bottom');
  const [activeTab, setActiveTab] = useState('neonPattern'); // 'neonPattern' | 'spectrum' | 'radial'
  const [panelOpen, setPanelOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [mobileWarningOpen, setMobileWarningOpen] = useState(IS_MOBILE);
  const exportMenuRef = useRef(null);
  useEffect(() => {
    if (!exportMenuOpen) return;
    const onDown = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [exportMenuOpen]);
  const [playHover] = useSound('/sounds/type_02.wav', { volume: 1, interrupt: true });
  const [playSwitch] = useSound('/sounds/rollover6.ogg', { volume: 0.4 });

  // Click on a nav: same tab → toggle the panel; different tab → switch + open
  const handleTabClick = (id) => {
    if (id === activeTab) {
      setPanelOpen((p) => !p);
    } else {
      setActiveTab(id);
      setPanelOpen(true);
    }
  };

  // Close the side panel when clicking anywhere outside the rail/panel.
  useEffect(() => {
    if (!panelOpen) return;
    const onMouseDown = (e) => {
      if (railRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setPanelOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [panelOpen]);
  const [colorTheme, setColorTheme] = useState('neon');
  const [uploadedImageSrc, setUploadedImageSrc] = useState(null);
  const [uploadedImageObj, setUploadedImageObj] = useState(null);
  const [imageScale, setImageScale] = useState(1.0);


  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target.result;
        setUploadedImageSrc(src);
        const img = new Image();
        img.onload = () => setUploadedImageObj(img);
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
  };

  // References (Refs)
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fadeWrapRef = useRef(null);
  const noiseCanvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const introStartTimeRef = useRef(-1);
  const formatRef = useRef(null);
  const mousePosRef = useRef(null);
  const interactRef = useRef({ x: 0, y: 0, weight: 0 });
  const timeStateRef = useRef({ lastTime: performance.now(), animatedTime: 1000 });
  const liquidCanvasRef = useRef(null);
  const blurOffscreenRef = useRef(null);
  const blobSpriteRef = useRef({});
  const dotsCacheRef = useRef(null);
  const wavesBufRef = useRef({ key: '', xs: null, ys: null, staticXs: null, breathFactor: null, numCols: 0, numPoints: 0, stride: 0 });
  const lineGradRef = useRef({ key: '', grad: null });
  const requestPreviewRedrawRef = useRef(() => {});
  const railRef = useRef(null);
  const panelRef = useRef(null);
  const tiltRef = useRef({ trx: 0, tryY: 0, rx: 0, ry: 0 });

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasAspect = canvas.width / canvas.height;
    const rectAspect = rect.width / rect.height;

    let drawWidth, drawHeight, offsetX, offsetY;
    if (canvasAspect > rectAspect) {
      drawWidth = rect.width;
      drawHeight = rect.width / canvasAspect;
      offsetX = 0;
      offsetY = (rect.height - drawHeight) / 2;
    } else {
      drawHeight = rect.height;
      drawWidth = rect.height * canvasAspect;
      offsetX = (rect.width - drawWidth) / 2;
      offsetY = 0;
    }

    const clickX = e.clientX - rect.left - offsetX;
    const clickY = e.clientY - rect.top - offsetY;

    if (clickX >= 0 && clickX <= drawWidth && clickY >= 0 && clickY <= drawHeight) {
      // Reuse single object — mousemove fires often, avoid per-event allocations
      const mp = mousePosRef.current || (mousePosRef.current = { x: 0, y: 0 });
      mp.x = (clickX / drawWidth) * canvas.width;
      mp.y = (clickY / drawHeight) * canvas.height;
      requestPreviewRedrawRef.current();
    } else {
      mousePosRef.current = null;
    }

    // 3D tilt: cursor offset from canvas-container center → small rotation (±5°)
    if (container) {
      const cr = container.getBoundingClientRect();
      const nx = (e.clientX - cr.left) / cr.width - 0.5;
      const ny = (e.clientY - cr.top) / cr.height - 0.5;
      tiltRef.current.tryY = nx * 6;
      tiltRef.current.trx = -ny * 6;
      startContainerTilt();
    }
  };

  const containerTiltRafRef = useRef(null);
  const startContainerTilt = () => {
    if (containerTiltRafRef.current != null) return;
    const tick = () => {
      if (document.hidden) { containerTiltRafRef.current = requestAnimationFrame(tick); return; }
      const t = tiltRef.current;
      const dx = t.trx - t.rx;
      const dy = t.tryY - t.ry;
      if (Math.abs(dx) < 0.005 && Math.abs(dy) < 0.005) {
        t.rx = t.trx; t.ry = t.tryY;
        const el = containerRef.current;
        if (el) {
          el.style.transform = `perspective(1600px) rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg)`;
        }
        containerTiltRafRef.current = null;
        return;
      }
      t.rx += dx * 0.12;
      t.ry += dy * 0.12;
      const el = containerRef.current;
      if (el) {
        el.style.transform = `perspective(1600px) rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg)`;
      }
      containerTiltRafRef.current = requestAnimationFrame(tick);
    };
    containerTiltRafRef.current = requestAnimationFrame(tick);
  };
  const handleMouseLeave = () => {
    mousePosRef.current = null;
    tiltRef.current.trx = 0;
    tiltRef.current.tryY = 0;
    startContainerTilt();
    // Drive the interactRef weight back to 0; preview loop needs to wake to animate that
    requestPreviewRedrawRef.current();
  };

  // Spring-eased 3D tilt on canvas container — RAF only while in motion
  useEffect(() => {
    startContainerTilt();
    return () => {
      if (containerTiltRafRef.current != null) cancelAnimationFrame(containerTiltRafRef.current);
      containerTiltRafRef.current = null;
    };
  }, []);

  // Generate noise pattern + allocate blur offscreen + invalidate dots cache
  useEffect(() => {
    const { width, height } = FORMATS[format];
    let canvas = noiseCacheByFormat.get(format);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(width, height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const val = Math.random() * 255;
        data[i] = val; data[i + 1] = val; data[i + 2] = val; data[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
      noiseCacheByFormat.set(format, canvas);
    }
    noiseCanvasRef.current = canvas;

    // Pre-allocate blur offscreen at 1/4 resolution.
    // ctx.filter = 'blur(170px)' on 1080x1350 ≈ 248M ops; on 270x337 ≈ 3.9M ops (~63x faster).
    // The drawImage upscale provides bilinear smoothing imperceptible against a 170px blur.
    const DOWNSCALE = 4;
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = Math.ceil(width / DOWNSCALE);
    blurCanvas.height = Math.ceil(height / DOWNSCALE);
    blurOffscreenRef.current = {
      canvas: blurCanvas,
      ctx: blurCanvas.getContext('2d'),
      scale: 1 / DOWNSCALE,
    };

    dotsCacheRef.current = null;
  }, [format]);

  const stateRef = useRef({ direction, dotSize, dotSpacing, gradientPos, isAnimated, format, isRecording, uploadedImageObj, uploadedImageSrc, activeTab, imageScale, colorTheme, shapeCount, customTheme, showDashed, showNoise });
  useEffect(() => {
    stateRef.current = { direction, dotSize, dotSpacing, gradientPos, isAnimated, format, isRecording, uploadedImageObj, uploadedImageSrc, activeTab, imageScale, colorTheme, shapeCount, customTheme, showDashed, showNoise };
    requestPreviewRedrawRef.current();
  }, [direction, dotSize, dotSpacing, gradientPos, isAnimated, format, isRecording, uploadedImageObj, uploadedImageSrc, activeTab, imageScale, colorTheme, shapeCount, customTheme, showDashed, showNoise]);

  // Reset intro animation when changing tabs, theme, or main UI becomes visible
  useEffect(() => {
    introStartTimeRef.current = -1;
  }, [activeTab, loaderDone, colorTheme, customTheme]);

  // Fade-in-up on the entire canvas wrapper whenever tab, format, theme,
  // or random theme changes (animation moves the whole rounded card).
  useEffect(() => {
    const el = fadeWrapRef.current;
    if (!el) return;
    el.classList.remove('canvas-fade-in-up');
    void el.offsetWidth;
    el.classList.add('canvas-fade-in-up');
  }, [activeTab, format, colorTheme, customTheme]);

  // Pre-render a blurred linear-gradient ellipse via SVG feGaussianBlur (works
  // on every browser, no canvas ctx.filter dependency). Sprite size matches the
  // current format's largest dimension so per-frame drawImage scaling stays
  // close to 1:1 — no pixelation when stretched to the blob's rx/ry.
  const getBlobSprite = (gradStart, gradEnd, format, gradMid) => {
    const key = `${gradStart}|${gradMid || ''}|${gradEnd}|${format}`;
    if (blobSpriteRef.current[key]) return blobSpriteRef.current[key];
    const { width, height } = FORMATS[format] || FORMATS.post;
    const SS = Math.max(width, height);
    // iOS WebKit silently clamps large stdDeviation in feGaussianBlur and
    // struggles with 2048² rasters. Cap aggressively on iOS only — desktop
    // keeps full fidelity.
    const blurSD = IS_IOS ? Math.min(120, SS * 0.10) : SS * 0.157;
    // Sprite is a heavily blurred ellipse — high raster res buys no visible gain
    // and pushes more pixels per frame across N composited draws (17 in Waves).
    const rasterPx = IS_IOS ? 1024 : Math.min(1024, Math.round(SS));
    const cacheCanvas = document.createElement('canvas');
    cacheCanvas.width = rasterPx;
    cacheCanvas.height = rasterPx;
    blobSpriteRef.current[key] = { canvas: cacheCanvas, ready: false };

    const midStop = gradMid ? `<stop offset='50%' stop-color='${gradMid}'/>` : '';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${rasterPx}' height='${rasterPx}' viewBox='0 0 ${SS} ${SS}'><defs><linearGradient id='g' x1='0' y1='0.5' x2='1' y2='0.5'><stop offset='15.29%' stop-color='${gradStart}'/>${midStop}<stop offset='80.46%' stop-color='${gradEnd}'/></linearGradient><filter id='b' x='-100%' y='-100%' width='300%' height='300%'><feGaussianBlur stdDeviation='${blurSD.toFixed(1)}'/></filter></defs><ellipse cx='${SS / 2}' cy='${SS / 2}' rx='${SS / 2 * 0.7}' ry='${SS / 2 * 0.7}' fill='url(%23g)' filter='url(%23b)'/></svg>`;
    const img = new Image();
    img.onload = () => {
      const cctx = cacheCanvas.getContext('2d');
      cctx.drawImage(img, 0, 0, rasterPx, rasterPx);
      blobSpriteRef.current[key].ready = true;
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + svg;
    return blobSpriteRef.current[key];
  };

  const drawBlurredGradientEllipse = (ctx, mainW, mainH, cx, cy, rx, ry, gradStart, gradEnd, alpha, gradMid) => {
    const fmt = stateRef.current.format;
    const sprite = getBlobSprite(gradStart, gradEnd, fmt, gradMid);
    if (sprite.ready) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite.canvas, cx - rx, cy - ry, rx * 2, ry * 2);
      ctx.globalAlpha = 1;
      return;
    }
    // SVG sprite still loading — fall back to ctx.filter path for first frames.
    // Skip entirely on iOS / browsers without canvas filter to avoid drawing a
    // sharp ellipse that looks broken. Sprite usually loads within ~50ms.
    if (!SUPPORTS_CANVAS_FILTER || IS_IOS) return;
    const off = blurOffscreenRef.current;
    if (!off) return;
    const { canvas, ctx: offCtx, scale: s } = off;

    offCtx.clearRect(0, 0, canvas.width, canvas.height);
    offCtx.filter = `blur(${170 * s}px)`;
    const gradient = offCtx.createLinearGradient((cx - rx) * s, cy * s, (cx + rx) * s, cy * s);
    gradient.addColorStop(0.1529, gradStart);
    gradient.addColorStop(0.8046, gradEnd);
    offCtx.fillStyle = gradient;
    offCtx.beginPath();
    offCtx.ellipse(cx * s, cy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
    offCtx.fill();
    offCtx.filter = 'none';
    ctx.globalAlpha = alpha;
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, mainW, mainH);
    ctx.globalAlpha = 1;
  };

  // --- SPECTRUM DRAWING LOGIC ---
  // Cache the vertical white-fade gradient used by dashed borders; only depends on height + ctx
  const getCachedVerticalWhiteGradient = (ctx, height) => {
    const ref = lineGradRef.current;
    if (ref.key === `${height}` && ref.grad && ref.ctx === ctx) return ref.grad;
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, '#FFFFFF');
    lineGradRef.current = { key: `${height}`, grad, ctx };
    return grad;
  };

  const drawSpectrum = (ctx, width, height, time, state, elapsed) => {
    const theme = state.customTheme || THEMES[state.colorTheme] || THEMES.neon;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    const numCols = state.shapeCount || 9;
    const colWidth = width / numCols;
    const radius = Math.max(width, height) * 0.6;
    const yOffsetMultiplier = state.format === '16:9' ? 0.50 : 0.30;
    const baseBlobY = state.gradientPos === 'bottom' ? height + (radius * yOffsetMultiplier) : -(radius * yOffsetMultiplier);

    // Background and base variables
    for (let i = 0; i < numCols; i++) {
      ctx.save();

      // --- DOMINO EFFECT (INTRO) ---
      // Each column has a delay based on its index from left (0) to right (numCols-1)
      const colDelayMs = i * 120; // 120ms difference between each column
      const colDurationMs = 800;  // Time it takes for each column to appear

      // Current column appearance progress (0 to 1)
      let rawColP = Math.max(0, Math.min((elapsed - 100 - colDelayMs) / colDurationMs, 1));

      // Ease-in (quadratic)
      const pColFade = Math.pow(rawColP, 2);

      // Overlap adjacent clips by 1px so AA along the shared edge double-covers
      // and no dark seam shows between columns
      ctx.beginPath();
      ctx.rect(i * colWidth - 0.5, 0, colWidth + 1, height);
      ctx.clip();

      const delayMs = i * 400;
      const currentTime = state.animatedTime !== undefined ? state.animatedTime : time;
      const t = (currentTime + delayMs) * 0.0015;

      let baseBlobX = width / 2;
      let cBlobY = baseBlobY;
      let rx = radius;
      let ry = radius;

      let animX = 0, animY = 0;
      animX = Math.sin(t * 0.5) * (width * 0.25);
      animY = Math.cos(t * 0.8) * (height * 0.15);
      rx += Math.sin(t * 1.2) * (width * 0.15);
      ry += Math.cos(t * 1.5) * (height * 0.10);

      const waveX = baseBlobX + animX;
      const waveY = cBlobY + animY;

      let blobX = waveX * (1 - interactRef.current.weight) + interactRef.current.x * interactRef.current.weight;
      let blobY = waveY * (1 - interactRef.current.weight) + interactRef.current.y * interactRef.current.weight;

      const gradScale = 0.9 + (0.1 * pColFade);
      const scaledRx = rx * gradScale;
      const scaledRy = ry * gradScale;

      drawBlurredGradientEllipse(ctx, width, height, blobX, blobY, scaledRx, scaledRy, theme.gradientStart, theme.gradientEnd, pColFade, theme.gradientMid);

      ctx.restore();

      // --- DASHED BORDER BETWEEN COLUMNS ---
      if (state.showDashed !== false && i < numCols - 1) {
        ctx.save();
        ctx.globalAlpha = pColFade;
        ctx.setLineDash([8, 15]);
        ctx.lineWidth = 2.0;

        ctx.strokeStyle = getCachedVerticalWhiteGradient(ctx, height);
        ctx.beginPath();
        const borderX = (i + 1) * colWidth;
        ctx.moveTo(borderX, 0);
        ctx.lineTo(borderX, height);
        ctx.stroke();
        ctx.restore();
      }
    }

    // --- IMAGEN INCRUSTADA ---
    if (state.uploadedImageObj) {
      const img = state.uploadedImageObj;
      let drawWidth = img.width;
      let drawHeight = img.height;
      const maxDrawWidth = width * 0.6;
      const maxDrawHeight = height * 0.6;

      if (drawWidth > maxDrawWidth || drawHeight > maxDrawHeight) {
        const ratio = Math.min(maxDrawWidth / drawWidth, maxDrawHeight / drawHeight);
        drawWidth *= ratio;
        drawHeight *= ratio;
      }

      drawWidth *= state.imageScale;
      drawHeight *= state.imageScale;

      const drawX = (width - drawWidth) / 2;
      const drawY = (height - drawHeight) / 2;

      let imgP = Math.max(0, Math.min((elapsed - 300) / 400, 1));
      let pImgFade = Math.pow(imgP, 2);

      ctx.save();
      ctx.globalAlpha = pImgFade;
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();
    }

    if (state.showNoise !== false && noiseCanvasRef.current) {
      ctx.globalAlpha = 0.05;
      ctx.drawImage(noiseCanvasRef.current, 0, 0, width, height);
      ctx.globalAlpha = 1.0;
    }
  };

  // --- WAVES DRAWING LOGIC (Deformed Spectrum) ---
  const drawWaves = (ctx, width, height, time, state, elapsed) => {
    const theme = state.customTheme || THEMES[state.colorTheme] || THEMES.neon;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    const spectrumCols = state.shapeCount || 9;
    const colWidth = width / spectrumCols;
    const extraLeft = 4;
    const extraRight = 4;
    const numCols = spectrumCols + extraLeft + extraRight;
    const startX = -extraLeft * colWidth;

    const radius = Math.max(width, height) * 0.4;
    const yOffsetMultiplier = state.format === '16:9' ? 0.50 : 0.30;
    const baseBlobY = state.gradientPos === 'bottom' ? height + (radius * yOffsetMultiplier) : -(radius * yOffsetMultiplier);

    const currentTime = state.animatedTime !== undefined ? state.animatedTime : time;
    const animT = currentTime * 0.00012;
    const numPoints = 60;
    const stride = numPoints + 1;
    const totalCols = numCols + 1;

    // Reusable buffers: static layout (xs without breath) precomputed once per
    // (width, height, spectrumCols). Per frame only the breath term is added.
    const cacheKey = `${width}|${height}|${numCols}|${numPoints}`;
    let buf = wavesBufRef.current;
    if (buf.key !== cacheKey) {
      const total = totalCols * stride;
      const ys = new Float32Array(total);
      const staticXs = new Float32Array(total);
      const breathFactor = new Float32Array(stride);
      const focalX = width * 0.05;
      for (let j = 0; j <= numPoints; j++) {
        const y = (j / numPoints) * height;
        const yRatio = y / height;
        const spread = Math.pow(yRatio, 0.7);
        const arc = Math.sin(yRatio * Math.PI) * width * 0.035;
        breathFactor[j] = width * 0.008 * yRatio;
        for (let col = 0; col <= numCols; col++) {
          const baseX = startX + col * colWidth;
          const targetX = baseX * 1.2;
          const idx = col * stride + j;
          ys[idx] = y;
          staticXs[idx] = focalX + (targetX - focalX) * spread + arc;
        }
      }
      buf = { key: cacheKey, xs: new Float32Array(total), ys, staticXs, breathFactor, numCols, numPoints, stride };
      wavesBufRef.current = buf;
    }

    // Per-frame: breath offset only — no object allocations
    const sinAnim = Math.sin(animT);
    const xs = buf.xs;
    const staticXs = buf.staticXs;
    const breathFactor = buf.breathFactor;
    for (let j = 0; j <= numPoints; j++) {
      const breath = sinAnim * breathFactor[j];
      for (let col = 0; col <= numCols; col++) {
        const idx = col * stride + j;
        xs[idx] = staticXs[idx] + breath;
      }
    }
    const ys = buf.ys;

    // Draw each warped column (same logic as spectrum)
    for (let i = 0; i < numCols; i++) {
      ctx.save();

      // Domino intro per column. Waves has 17 columns (vs Spectrum's 9), so the
      // per-column delay is ~half of Spectrum's so total intro time matches.
      const colDelayMs = i * 60;
      const colDurationMs = 800;
      let rawColP = Math.max(0, Math.min((elapsed - 100 - colDelayMs) / colDurationMs, 1));
      const pColFade = Math.pow(rawColP, 2);

      // Clip path from buffered boundary coords. Overlap adjacent clips by 0.5px
      // on each side along x so AA at shared edges double-covers — no seam.
      const leftBase = i * stride;
      const rightBase = (i + 1) * stride;
      ctx.beginPath();
      ctx.moveTo(xs[leftBase] - 0.5, ys[leftBase]);
      for (let j = 1; j < stride; j++) {
        ctx.lineTo(xs[leftBase + j] - 0.5, ys[leftBase + j]);
      }
      for (let j = stride - 1; j >= 0; j--) {
        ctx.lineTo(xs[rightBase + j] + 0.5, ys[rightBase + j]);
      }
      ctx.closePath();
      ctx.clip();

      // Animated gradient blob (identical to spectrum)
      const delayMs = i * 400;
      const t = (currentTime + delayMs) * 0.0015;

      let baseBlobX = width / 2;
      let cBlobY = baseBlobY;
      let rx = radius;
      let ry = radius;

      let animX = Math.sin(t * 0.5) * (width * 0.25);
      let animY = Math.cos(t * 0.8) * (height * 0.15);
      rx += Math.sin(t * 1.2) * (width * 0.15);
      ry += Math.cos(t * 1.5) * (height * 0.10);

      const waveX = baseBlobX + animX;
      const waveY = cBlobY + animY;

      let blobX = waveX * (1 - interactRef.current.weight) + interactRef.current.x * interactRef.current.weight;
      let blobY = waveY * (1 - interactRef.current.weight) + interactRef.current.y * interactRef.current.weight;

      const gradScale = 0.9 + (0.1 * pColFade);
      const scaledRx = rx * gradScale;
      const scaledRy = ry * gradScale;

      drawBlurredGradientEllipse(ctx, width, height, blobX, blobY, scaledRx, scaledRy, theme.gradientStart, theme.gradientEnd, pColFade, theme.gradientMid);

      ctx.restore();

      // Dashed border along the right boundary curve
      if (state.showDashed !== false && i < numCols - 1) {
        ctx.save();
        ctx.globalAlpha = pColFade;
        ctx.setLineDash([8, 15]);
        ctx.lineWidth = 2.0;

        const borderBase = (i + 1) * stride;
        ctx.strokeStyle = getCachedVerticalWhiteGradient(ctx, height);
        ctx.beginPath();
        ctx.moveTo(xs[borderBase], ys[borderBase]);
        for (let j = 1; j < stride; j++) {
          ctx.lineTo(xs[borderBase + j], ys[borderBase + j]);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // Uploaded image
    if (state.uploadedImageObj) {
      const img = state.uploadedImageObj;
      let drawWidth = img.width;
      let drawHeight = img.height;
      const maxDrawWidth = width * 0.6;
      const maxDrawHeight = height * 0.6;

      if (drawWidth > maxDrawWidth || drawHeight > maxDrawHeight) {
        const ratio = Math.min(maxDrawWidth / drawWidth, maxDrawHeight / drawHeight);
        drawWidth *= ratio;
        drawHeight *= ratio;
      }

      drawWidth *= state.imageScale;
      drawHeight *= state.imageScale;

      const drawX = (width - drawWidth) / 2;
      const drawY = (height - drawHeight) / 2;

      let imgP = Math.max(0, Math.min((elapsed - 300) / 400, 1));
      let pImgFade = Math.pow(imgP, 2);

      ctx.save();
      ctx.globalAlpha = pImgFade;
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();
    }

    if (state.showNoise !== false && noiseCanvasRef.current) {
      ctx.globalAlpha = 0.05;
      ctx.drawImage(noiseCanvasRef.current, 0, 0, width, height);
      ctx.globalAlpha = 1.0;
    }
  };

  // --- PULSE DRAWING LOGIC (centred concentric ring sectors — circular variant of Waves) ---
  const drawGlass = (ctx, width, height, time, state, elapsed) => {
    const theme = state.customTheme || THEMES[state.colorTheme] || THEMES.neon;

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    // Origin: bottom-centre (or top-centre when gradientPos === 'top'). Rings
    // emanate as half-circles facing into the canvas, like ripples on a pond
    // anchored to the bottom (or top) edge.
    const cornerX = width / 2;
    const cornerY = state.gradientPos === 'bottom' ? height : 0;
    const maxDiag = Math.hypot(width / 2, height);

    const visibleRings = state.shapeCount || 13;
    const numRings = visibleRings;
    const ringStep = maxDiag / visibleRings;

    const radius = Math.max(width, height) * 0.4;
    const yOffsetMultiplier = state.format === '16:9' ? 0.50 : 0.30;
    const baseBlobY = state.gradientPos === 'bottom'
      ? height + (radius * yOffsetMultiplier)
      : -(radius * yOffsetMultiplier);

    const currentTime = state.animatedTime !== undefined ? state.animatedTime : time;

    for (let i = 0; i < numRings; i++) {
      ctx.save();

      // Domino intro per ring — same timing profile as Waves
      const ringDelayMs = i * 60;
      const ringDurationMs = 800;
      const rawColP = Math.max(0, Math.min((elapsed - 100 - ringDelayMs) / ringDurationMs, 1));
      const pColFade = Math.pow(rawColP, 2);

      // Annular clip (outer arc minus inner arc, evenodd via reverse-direction arc)
      const innerR = i * ringStep;
      const outerR = (i + 1) * ringStep;
      // Overlap adjacent rings by 0.5px on each side so AA along the shared
      // boundary double-covers — no dark seam between rings.
      ctx.beginPath();
      ctx.arc(cornerX, cornerY, outerR + 0.5, 0, Math.PI * 2, false);
      if (innerR > 0) {
        ctx.arc(cornerX, cornerY, innerR - 0.5, 0, Math.PI * 2, true);
      }
      ctx.clip();

      // Same time-shifted blob math as Spectrum/Waves
      const delayMs = i * 400;
      const t = (currentTime + delayMs) * 0.0015;

      let baseBlobX = width / 2;
      let cBlobY = baseBlobY;
      let rx = radius;
      let ry = radius;

      const animX = Math.sin(t * 0.5) * (width * 0.25);
      const animY = Math.cos(t * 0.8) * (height * 0.15);
      rx += Math.sin(t * 1.2) * (width * 0.15);
      ry += Math.cos(t * 1.5) * (height * 0.10);

      const waveX = baseBlobX + animX;
      const waveY = cBlobY + animY;

      const blobX = waveX * (1 - interactRef.current.weight) + interactRef.current.x * interactRef.current.weight;
      const blobY = waveY * (1 - interactRef.current.weight) + interactRef.current.y * interactRef.current.weight;

      const gradScale = 0.9 + (0.1 * pColFade);
      const scaledRx = rx * gradScale;
      const scaledRy = ry * gradScale;

      drawBlurredGradientEllipse(
        ctx, width, height,
        blobX, blobY, scaledRx, scaledRy,
        theme.gradientStart, theme.gradientEnd, pColFade, theme.gradientMid
      );

      ctx.restore();

      // Dashed circular border at the inner edge of each visible ring (skip i=0
      // — that would draw a degenerate dot at the corner).
      if (state.showDashed !== false && i > 0 && i <= visibleRings) {
        ctx.save();
        ctx.globalAlpha = pColFade;
        ctx.setLineDash([8, 15]);
        ctx.lineWidth = 2.0;

        ctx.strokeStyle = getCachedVerticalWhiteGradient(ctx, height);
        ctx.beginPath();
        ctx.arc(cornerX, cornerY, innerR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Uploaded image overlay
    if (state.uploadedImageObj) {
      const img = state.uploadedImageObj;
      let drawWidth = img.width;
      let drawHeight = img.height;
      const maxDrawWidth = width * 0.6;
      const maxDrawHeight = height * 0.6;
      if (drawWidth > maxDrawWidth || drawHeight > maxDrawHeight) {
        const ratio = Math.min(maxDrawWidth / drawWidth, maxDrawHeight / drawHeight);
        drawWidth *= ratio;
        drawHeight *= ratio;
      }
      drawWidth *= state.imageScale;
      drawHeight *= state.imageScale;
      const drawX = (width - drawWidth) / 2;
      const drawY = (height - drawHeight) / 2;
      const imgP = Math.max(0, Math.min((elapsed - 300) / 400, 1));
      const pImgFade = Math.pow(imgP, 2);
      ctx.save();
      ctx.globalAlpha = pImgFade;
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();
    }

    if (state.showNoise !== false && noiseCanvasRef.current) {
      ctx.globalAlpha = 0.05;
      ctx.drawImage(noiseCanvasRef.current, 0, 0, width, height);
      ctx.globalAlpha = 1.0;
    }
  };

  // --- DRAWING LOGIC (RENDER LOOP) ---
  const drawScene = useCallback((ctx, width, height, time, injectedState) => {
    const state = injectedState || stateRef.current;

    const mPos = mousePosRef.current;
    if (mPos) {
      // The maximum attraction weight is now 0.2 (20%), and the transition speed is 0.2 (20%)
      interactRef.current.weight += (0.2 - interactRef.current.weight) * 0.2;
      // The speed with which it chases the cursor is 0.2 (20%)
      interactRef.current.x += (mPos.x - interactRef.current.x) * 0.2;
      interactRef.current.y += (mPos.y - interactRef.current.y) * 0.2;
    } else {
      // The speed with which it releases control when leaving is 0.2 (20%)
      interactRef.current.weight += (0 - interactRef.current.weight) * 0.2;
    }

    // --- INTRO ANIMATION CONTROL ---
    if (formatRef.current !== state.format) {
      introStartTimeRef.current = time;
      formatRef.current = state.format;
    }
    if (introStartTimeRef.current === -1) {
      introStartTimeRef.current = time;
    }

    let elapsed = time - introStartTimeRef.current;

    if (state.activeTab === 'spectrum') {
      drawSpectrum(ctx, width, height, time, state, elapsed);
      return;
    }

    if (state.activeTab === 'radial') {
      drawWaves(ctx, width, height, time, state, elapsed);
      return;
    }

    if (state.activeTab === 'glass') {
      drawGlass(ctx, width, height, time, state, elapsed);
      return;
    }








    // 1. Base background
    const theme = state.customTheme || THEMES[state.colorTheme] || THEMES.neon;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    // --- CLASSIC MODE (Dots and Oval Gradient) ---

    // Slowed sweep parameters
    const WAVE_SPEED = 900;
    const DOT_ANIM_DURATION = 600;
    const FADE_OUT_POINT = 0.60; // Los puntos se desvanecen al 60% del canvas

    const cols = Math.floor((width - state.dotSpacing) / state.dotSpacing);
    const rows = Math.floor((height - state.dotSpacing) / state.dotSpacing);
    const startX = (width - (cols * state.dotSpacing)) / 2;
    const startY = (height - (rows * state.dotSpacing)) / 2;

    // After the intro sweep finishes, the dot grid is fully static. Cache it
    // to a single offscreen canvas and replace ~1800 arc/fill calls per frame
    // with one drawImage. The cache key invalidates if any input changes.
    const introSweepDoneAt = WAVE_SPEED + DOT_ANIM_DURATION; // 3400ms
    if (elapsed >= introSweepDoneAt) {
      const cacheKey = `${state.direction}|${state.dotSize}|${state.dotSpacing}|${width}x${height}`;
      let cached = dotsCacheRef.current;
      if (!cached || cached.key !== cacheKey) {
        const off = document.createElement('canvas');
        off.width = width;
        off.height = height;
        const offCtx = off.getContext('2d');
        offCtx.fillStyle = '#FFFFFF';

        for (let x = startX; x <= width - startX + 0.1; x += state.dotSpacing) {
          for (let y = startY; y <= height - startY + 0.1; y += state.dotSpacing) {
            let fadeRatio = 0;
            if (state.direction === 'left') fadeRatio = x / width;
            else if (state.direction === 'right') fadeRatio = 1 - (x / width);
            else if (state.direction === 'top') fadeRatio = y / height;
            else if (state.direction === 'bottom') fadeRatio = 1 - (y / height);

            const opacityRatio = fadeRatio < FADE_OUT_POINT ? 1 - (fadeRatio / FADE_OUT_POINT) : 0;
            const targetOpacityBase = Math.pow(opacityRatio, 1.5);
            if (targetOpacityBase <= 0.001) continue;

            offCtx.globalAlpha = 0.25 * targetOpacityBase;
            offCtx.beginPath();
            offCtx.arc(x, y, state.dotSize, 0, Math.PI * 2);
            offCtx.fill();
          }
        }

        cached = { key: cacheKey, canvas: off };
        dotsCacheRef.current = cached;
      }
      ctx.drawImage(cached.canvas, 0, 0);
    } else {
      for (let x = startX; x <= width - startX + 0.1; x += state.dotSpacing) {
        for (let y = startY; y <= height - startY + 0.1; y += state.dotSpacing) {
          let fadeRatio = 0;
          let sweepRatio = 0;

          if (state.direction === 'left') {
            fadeRatio = x / width;
            sweepRatio = (x / width + y / height) / 2;
          } else if (state.direction === 'right') {
            fadeRatio = 1 - (x / width);
            sweepRatio = ((1 - x / width) + (1 - y / height)) / 2;
          } else if (state.direction === 'top') {
            fadeRatio = y / height;
            sweepRatio = ((1 - x / width) + y / height) / 2;
          } else if (state.direction === 'bottom') {
            fadeRatio = 1 - (y / height);
            sweepRatio = (x / width + (1 - y / height)) / 2;
          }

          const opacityRatio = fadeRatio < FADE_OUT_POINT ? 1 - (fadeRatio / FADE_OUT_POINT) : 0;
          const targetOpacityBase = Math.pow(opacityRatio, 1.5);
          if (targetOpacityBase <= 0.001) continue;

          const dotDelay = sweepRatio * WAVE_SPEED;
          const dotElapsed = elapsed - dotDelay;
          if (dotElapsed < 0) continue;

          const dotP = Math.min(dotElapsed / DOT_ANIM_DURATION, 1);
          const flashIntensity = Math.pow(opacityRatio, 0.5);
          const peakAlpha = 0.27 * flashIntensity;
          const endAlpha = 0.25 * targetOpacityBase;

          let currentAlpha;
          if (dotP < 0.2) {
            currentAlpha = peakAlpha * (dotP / 0.2);
          } else {
            const easeP = Math.pow((dotP - 0.2) / 0.8, 2);
            currentAlpha = peakAlpha + (endAlpha - peakAlpha) * easeP;
          }

          ctx.globalAlpha = currentAlpha;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(x, y, state.dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;
    }

    // Oval Gradient
    ctx.save();
    const radius = Math.max(width, height) * 0.6;
    // Moving up 10% more
    const yOffsetMultiplier = state.format === '16:9' ? 0.50 : 0.30;
    let baseBlobX = width / 2;
    let baseBlobY = state.gradientPos === 'bottom' ? height + (radius * yOffsetMultiplier) : -(radius * yOffsetMultiplier);
    let rx = radius;
    let ry = radius;

    // Organic movement (increased speed)
    const t = time * 0.0005;
    let animX = 0, animY = 0;
    if (state.isAnimated) {
      animX = Math.sin(t * 0.5) * (width * 0.25);
      animY = Math.cos(t * 0.8) * (height * 0.15);
      rx += Math.sin(t * 1.2) * (width * 0.15);
      ry += Math.cos(t * 1.5) * (height * 0.10);
    }

    const waveX = baseBlobX + animX;
    const waveY = baseBlobY + animY;

    let blobX = waveX * (1 - interactRef.current.weight) + interactRef.current.x * interactRef.current.weight;
    let blobY = waveY * (1 - interactRef.current.weight) + interactRef.current.y * interactRef.current.weight;

    // Gradient Intro Animation
    // Appears progressively very smoothly over 1200ms
    let rawGradP = Math.max(0, Math.min((elapsed - 100) / 1200, 1));
    const pGradFade = (1 - Math.cos(rawGradP * Math.PI)) / 2; // Ease-in-out for greater smoothness

    const gradScale = 0.9 + (0.1 * pGradFade);
    const scaledRx = rx * gradScale;
    const scaledRy = ry * gradScale;

    drawBlurredGradientEllipse(ctx, width, height, blobX, blobY, scaledRx, scaledRy, theme.gradientStart, theme.gradientEnd, pGradFade);

    ctx.restore();

    // --- IMAGEN INCRUSTADA ---
    if (state.uploadedImageObj) {
      const img = state.uploadedImageObj;
      let drawWidth = img.width;
      let drawHeight = img.height;
      const maxDrawWidth = width * 0.6;
      const maxDrawHeight = height * 0.6;

      if (drawWidth > maxDrawWidth || drawHeight > maxDrawHeight) {
        const ratio = Math.min(maxDrawWidth / drawWidth, maxDrawHeight / drawHeight);
        drawWidth *= ratio;
        drawHeight *= ratio;
      }
      // Apply user scaling
      drawWidth *= state.imageScale;
      drawHeight *= state.imageScale;

      const drawX = (width - drawWidth) / 2;
      const drawY = (height - drawHeight) / 2;

      // Faster fade-in for the uploaded image (appears in 400ms)
      let imgP = Math.max(0, Math.min((elapsed - 300) / 400, 1));
      let pImgFade = Math.pow(imgP, 2);

      ctx.save();
      ctx.globalAlpha = pImgFade;
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();
    }

    if (state.showNoise !== false && noiseCanvasRef.current) {
      ctx.globalAlpha = 0.05;
      ctx.drawImage(noiseCanvasRef.current, 0, 0, width, height);
      ctx.globalAlpha = 1.0;
    }
  }, []);

  // --- MAIN LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    const logical = FORMATS[stateRef.current.format];
    const logicalW = logical.width;
    const logicalH = logical.height;

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.objectFit = 'contain';

    let scaleX = 1;
    let scaleY = 1;
    const applySize = () => {
      // Cap DPR at 1.5 — full DPR doubles pixel work for negligible visual gain
      // against the heavy blur sprite which is already lo-res relative to display.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const cssW = container.clientWidth;
      if (cssW <= 0) return;
      const desired = Math.min((cssW * dpr) / logicalW, 1);
      const targetW = Math.max(1, Math.round(logicalW * desired));
      const targetH = Math.max(1, Math.round(logicalH * desired));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      // Use exact ratios so fillRect(0,0,logicalW,logicalH) fully covers the
      // backbuffer — Math.round above can leave a sub-pixel transparent strip
      // that the browser samples as a dark fringe at the rounded border.
      scaleX = targetW / logicalW;
      scaleY = targetH / logicalH;
    };
    applySize();
    const ro = new ResizeObserver(applySize);
    ro.observe(container);

    let animFrame = null;
    const loop = (time) => {
      // Stop entirely while hidden or while video export runs — restart hooks
      // (visibilitychange + isRecording state change) call requestRedraw.
      if (document.hidden || stateRef.current.isRecording) { animFrame = null; return; }

      // Adaptive frame budget: 30 fps while interacting, 24 fps for auto anim only
      const interacting = !!mousePosRef.current || interactRef.current.weight > 0.001;
      const frameBudget = interacting ? 32 : 41;
      const sinceLast = time - timeStateRef.current.lastTime;
      if (sinceLast < frameBudget) { animFrame = requestAnimationFrame(loop); return; }

      let dt = sinceLast;
      if (dt > 100) dt = 16;
      timeStateRef.current.lastTime = time;

      const state = stateRef.current;
      if (state.isAnimated) {
        timeStateRef.current.animatedTime += dt;
      }

      // Fully static: stop the rAF chain entirely. Restart on input or state change
      // via requestPreviewRedrawRef. This drops idle CPU near-zero vs. burning ~60Hz
      // wake-ups on a short-circuit return.
      const introAge = introStartTimeRef.current >= 0 ? time - introStartTimeRef.current : 0;
      const introSettled = introAge > 1200;
      const noInteraction = interactRef.current.weight < 0.001 && !mousePosRef.current;
      if (!state.isAnimated && introSettled && noInteraction) {
        animFrame = null;
        return;
      }

      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
      ctx.clearRect(0, 0, logicalW, logicalH);
      // Mutate ref in place — avoids a per-frame object spread alloc
      stateRef.current.animatedTime = timeStateRef.current.animatedTime;
      drawScene(ctx, logicalW, logicalH, time);
      animFrame = requestAnimationFrame(loop);
    };

    const requestRedraw = () => {
      if (animFrame != null) return;
      timeStateRef.current.lastTime = performance.now();
      animFrame = requestAnimationFrame(loop);
    };
    requestPreviewRedrawRef.current = requestRedraw;

    // Prevent a large dt spike when returning to the tab
    const onVisibilityChange = () => {
      if (!document.hidden) {
        timeStateRef.current.lastTime = performance.now();
        requestRedraw();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    requestRedraw();

    return () => {
      requestPreviewRedrawRef.current = () => {};
      if (animFrame) cancelAnimationFrame(animFrame);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      ro.disconnect();
    };
  }, [drawScene, format]);

  // --- BUILD SVG STRING (shared by SVG + PNG export) ---
  const buildSvgString = () => {
    const state = stateRef.current;
    const theme = state.customTheme || THEMES[state.colorTheme] || THEMES.neon;
    const { width, height } = FORMATS[state.format];
    const FADE_OUT_POINT = 0.60;

    const radius = Math.max(width, height) * 0.6;
    const yOffsetMultiplier = state.format === '16:9' ? 0.50 : 0.30;
    const blobY = state.gradientPos === 'bottom' ? height + (radius * yOffsetMultiplier) : -(radius * yOffsetMultiplier);
    const rx = radius;
    const ry = radius;

    let imageHtml = '';
    if (state.uploadedImageSrc && state.uploadedImageObj) {
      const img = state.uploadedImageObj;
      let drawWidth = img.width;
      let drawHeight = img.height;
      const maxDrawWidth = width * 0.6;
      const maxDrawHeight = height * 0.6;
      if (drawWidth > maxDrawWidth || drawHeight > maxDrawHeight) {
        const ratio = Math.min(maxDrawWidth / drawWidth, maxDrawHeight / drawHeight);
        drawWidth *= ratio;
        drawHeight *= ratio;
      }
      drawWidth *= state.imageScale;
      drawHeight *= state.imageScale;

      const drawX = (width - drawWidth) / 2;
      const drawY = (height - drawHeight) / 2;
      imageHtml = `<image href="${state.uploadedImageSrc}" x="${drawX}" y="${drawY}" width="${drawWidth}" height="${drawHeight}" />`;
    }

    let contentHtml = '';

    if (state.activeTab === 'neonPattern') {
      let dotsHtml = '';

      const cols = Math.floor((width - state.dotSpacing) / state.dotSpacing);
      const rows = Math.floor((height - state.dotSpacing) / state.dotSpacing);
      const startX = (width - (cols * state.dotSpacing)) / 2;
      const startY = (height - (rows * state.dotSpacing)) / 2;

      for (let x = startX; x <= width - startX + 0.1; x += state.dotSpacing) {
        for (let y = startY; y <= height - startY + 0.1; y += state.dotSpacing) {
          let posRatio = 0;
          if (state.direction === 'left') posRatio = x / width;
          else if (state.direction === 'right') posRatio = 1 - (x / width);
          else if (state.direction === 'top') posRatio = y / height;
          else if (state.direction === 'bottom') posRatio = 1 - (y / height);

          let opacityRatio = posRatio < FADE_OUT_POINT ? 1 - (posRatio / FADE_OUT_POINT) : 0;
          let opacityBase = Math.pow(opacityRatio, 1.5);
          let finalAlpha = opacityBase * 0.25;

          if (finalAlpha > 0.001) {
            dotsHtml += `<circle cx="${x}" cy="${y}" r="${state.dotSize}" fill="#FFFFFF" opacity="${finalAlpha.toFixed(3)}" />`;
          }
        }
      }

      contentHtml = `
        <g>
          ${dotsHtml}
        </g>
        ${imageHtml}
        <ellipse cx="${width / 2}" cy="${blobY}" rx="${rx}" ry="${ry}" fill="url(#blobGrad)" filter="url(#blurFilter)" />
      `;
    } else if (state.activeTab === 'spectrum') {
      let colsHtml = '';
      const numCols = state.shapeCount || 9;
      const colWidth = width / numCols;
      for (let i = 0; i < numCols; i++) {
        const delayMs = i * 400;
        const t = 1000 + (delayMs * 0.0015);

        let cBlobX = width / 2;
        let cBlobY = blobY;
        let cRx = rx;
        let cRy = ry;

        cBlobX += Math.sin(t * 0.5) * (width * 0.25);
        cBlobY += Math.cos(t * 0.8) * (height * 0.15);
        cRx += Math.sin(t * 1.2) * (width * 0.15);
        cRy += Math.cos(t * 1.5) * (height * 0.10);

        colsHtml += `
          <g clip-path="url(#clipCol${i})">
            <ellipse cx="${cBlobX}" cy="${cBlobY}" rx="${cRx}" ry="${cRy}" fill="url(#blobGrad)" filter="url(#blurFilter)" />
          </g>
        `;

        if (i < numCols - 1) {
          const borderX = (i + 1) * colWidth;
          colsHtml += `
            <line x1="${borderX}" y1="0" x2="${borderX}" y2="${height}" 
                  stroke="url(#borderGrad)" 
                  stroke-width="2.0" 
                  stroke-dasharray="8,15" 
                  opacity="0.5" />
          `;
        }
      }

      let defsClips = '';
      for (let i = 0; i < numCols; i++) {
        defsClips += `
          <clipPath id="clipCol${i}">
            <rect x="${i * colWidth}" y="0" width="${colWidth}" height="${height}" />
          </clipPath>
        `;
      }

      contentHtml = `
        <defs>
          ${defsClips}
        </defs>
        ${colsHtml}
        ${imageHtml}
      `;

    } else if (state.activeTab === 'radial') {
      // Waves — vector: warped column clip paths + blurred ellipse per column + dashed boundary curves
      const spectrumCols = state.shapeCount || 9;
      const colWidth = width / spectrumCols;
      const extraLeft = 4, extraRight = 4;
      const numColsW = spectrumCols + extraLeft + extraRight;
      const startXW = -extraLeft * colWidth;
      const radiusW = Math.max(width, height) * 0.4;
      const yOffW = state.format === '16:9' ? 0.50 : 0.30;
      const baseBlobYW = state.gradientPos === 'bottom' ? height + (radiusW * yOffW) : -(radiusW * yOffW);
      const exportTime = 5000;
      const animTW = exportTime * 0.00012;
      const numPointsW = 60;

      const getWarpedX = (baseX, y) => {
        const yRatio = y / height;
        const focalX = width * 0.05;
        const spread = Math.pow(yRatio, 0.7);
        const targetX = baseX * 1.2;
        const fanX = focalX + (targetX - focalX) * spread;
        const arc = Math.sin(yRatio * Math.PI) * width * 0.035;
        const breath = Math.sin(animTW) * width * 0.008 * yRatio;
        return fanX + arc + breath;
      };

      const boundariesW = [];
      for (let col = 0; col <= numColsW; col++) {
        const baseX = startXW + col * colWidth;
        const pts = [];
        for (let j = 0; j <= numPointsW; j++) {
          const yy = (j / numPointsW) * height;
          pts.push({ x: getWarpedX(baseX, yy), y: yy });
        }
        boundariesW.push(pts);
      }

      const pathFromPoints = (pts) => pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
      const clipPathFromColumn = (left, right) => {
        const lp = pathFromPoints(left);
        const rp = right.slice().reverse().map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
        return `${lp} ${rp} Z`;
      };

      let defsCols = '';
      let groupsCols = '';
      let dashedCols = '';
      for (let i = 0; i < numColsW; i++) {
        const leftB = boundariesW[i];
        const rightB = boundariesW[i + 1];
        defsCols += `<clipPath id="clipW${i}"><path d="${clipPathFromColumn(leftB, rightB)}" /></clipPath>`;

        const delayMs = i * 400;
        const t = (exportTime + delayMs) * 0.0015;
        const animX = Math.sin(t * 0.5) * (width * 0.25);
        const animY = Math.cos(t * 0.8) * (height * 0.15);
        const rxx = radiusW + Math.sin(t * 1.2) * (width * 0.15);
        const ryy = radiusW + Math.cos(t * 1.5) * (height * 0.10);
        const cx = width / 2 + animX;
        const cy = baseBlobYW + animY;

        groupsCols += `<g clip-path="url(#clipW${i})"><ellipse cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${rxx.toFixed(2)}" ry="${ryy.toFixed(2)}" fill="url(#blobGrad)" filter="url(#blurFilter)" /></g>`;

        if (i < numColsW - 1) {
          const b = boundariesW[i + 1];
          const dStr = pathFromPoints(b);
          dashedCols += `<path d="${dStr}" stroke="url(#borderGrad)" stroke-width="2" stroke-dasharray="8,15" fill="none" opacity="0.5" />`;
        }
      }

      contentHtml = `<defs>${defsCols}</defs>${groupsCols}${dashedCols}${imageHtml}`;

    } else if (state.activeTab === 'glass') {
      // Halo — vector: annular ring clips + blurred ellipse per ring + dashed circles
      const cornerX = width / 2;
      const cornerY = state.gradientPos === 'bottom' ? height : 0;
      const maxDiag = Math.hypot(width / 2, height);
      const visibleRings = state.shapeCount || 13;
      const ringStep = maxDiag / visibleRings;
      const radiusG = Math.max(width, height) * 0.4;
      const yOffG = state.format === '16:9' ? 0.50 : 0.30;
      const baseBlobYG = state.gradientPos === 'bottom' ? height + (radiusG * yOffG) : -(radiusG * yOffG);
      const exportTime = 5000;

      let defsRings = '';
      let groupsRings = '';
      let dashedRings = '';
      for (let i = 0; i < visibleRings; i++) {
        const innerR = i * ringStep;
        const outerR = (i + 1) * ringStep;
        const circ = (cx, cy, r) => `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0`;
        const outerD = circ(cornerX, cornerY, outerR);
        const innerD = innerR > 0 ? ' ' + circ(cornerX, cornerY, innerR) : '';
        defsRings += `<clipPath id="clipG${i}" clipPathUnits="userSpaceOnUse"><path d="${outerD}${innerD}" fill-rule="evenodd" /></clipPath>`;

        const delayMs = i * 400;
        const t = (exportTime + delayMs) * 0.0015;
        const animX = Math.sin(t * 0.5) * (width * 0.25);
        const animY = Math.cos(t * 0.8) * (height * 0.15);
        const rxx = radiusG + Math.sin(t * 1.2) * (width * 0.15);
        const ryy = radiusG + Math.cos(t * 1.5) * (height * 0.10);
        const cx = width / 2 + animX;
        const cy = baseBlobYG + animY;
        groupsRings += `<g clip-path="url(#clipG${i})"><ellipse cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${rxx.toFixed(2)}" ry="${ryy.toFixed(2)}" fill="url(#blobGrad)" filter="url(#blurFilter)" /></g>`;

        if (i > 0) {
          dashedRings += `<circle cx="${cornerX}" cy="${cornerY}" r="${innerR.toFixed(2)}" fill="none" stroke="url(#borderGrad)" stroke-width="2" stroke-dasharray="8,15" opacity="0.5" />`;
        }
      }

      contentHtml = `<defs>${defsRings}</defs>${groupsRings}${dashedRings}${imageHtml}`;
    }

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
        <defs>
          <filter id="blurFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="170" />
          </filter>
          <linearGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="15.29%" stop-color="${theme.gradientStart}" />
            ${theme.gradientMid ? `<stop offset="50%" stop-color="${theme.gradientMid}" />` : ''}
            <stop offset="80.46%" stop-color="${theme.gradientEnd}" />
          </linearGradient>
          <linearGradient id="borderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(255,255,255,0)" />
            <stop offset="35%" stop-color="rgba(255,255,255,0)" />
            <stop offset="100%" stop-color="#FFFFFF" />
          </linearGradient>

          <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          </filter>
        </defs>
        
        <rect width="${width}" height="${height}" fill="${theme.bg}" />
        
        ${contentHtml}
        
        <rect width="${width}" height="${height}" opacity="0.15" filter="url(#noiseFilter)" style="mix-blend-mode: overlay; pointer-events: none;" />
      </svg>
    `;

    return { svgString, width, height, format: state.format };
  };

  // --- EXPORT SVG ---
  const handleExportSVG = async () => {
    if (svgExporting) return;
    setSvgExporting(true);
    setSvgProgress(0);
    await new Promise((r) => setTimeout(r, 30));
    for (const p of [15, 35, 55, 75]) {
      setSvgProgress(p);
      await new Promise((r) => setTimeout(r, 60));
    }
    const { svgString, format } = buildSvgString();
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Glowy-${format}.svg`;
    setSvgProgress(100);
    await new Promise((r) => setTimeout(r, 120));
    a.click();
    URL.revokeObjectURL(url);
    setShareModalOpen(true);
    setSvgExporting(false);
    setSvgProgress(0);
  };

  // --- EXPORT PNG (rasterize SVG at given scale) ---
  const handleExportPNG = async (scale) => {
    if (svgExporting) return;
    setSvgExporting(true);
    setSvgProgress(0);
    await new Promise((r) => setTimeout(r, 30));
    for (const p of [10, 25, 45]) {
      setSvgProgress(p);
      await new Promise((r) => setTimeout(r, 50));
    }
    try {
      const { svgString, width, height, format } = buildSvgString();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.decoding = 'sync';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = svgUrl;
      });
      setSvgProgress(70);
      const outW = Math.round(width * scale);
      const outH = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, outW, outH);
      URL.revokeObjectURL(svgUrl);
      setSvgProgress(90);
      const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const url = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Glowy-${format}-${scale}x.png`;
      setSvgProgress(100);
      await new Promise((r) => setTimeout(r, 80));
      a.click();
      URL.revokeObjectURL(url);
      setShareModalOpen(true);
    } catch (e) {
      console.error('PNG export failed:', e);
      alert('PNG export error: ' + e.message);
    } finally {
      setSvgExporting(false);
      setSvgProgress(0);
    }
  };

  // --- EXPORT MP4 VIDEO (High Quality Offline) ---
  const handleExportVideo = async (targetShort = 1080) => {
    if (isRecording) return;
    setIsRecording(true);

    if (!stateRef.current.isAnimated) setIsAnimated(true);

    const base = FORMATS[stateRef.current.format];
    const baseShort = Math.min(base.width, base.height);
    const factor = targetShort / baseShort;
    const width = Math.round((base.width * factor) / 2) * 2;
    const height = Math.round((base.height * factor) / 2) * 2;

    // Give React a moment to update the state (isRecording = true)
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      let muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
          codec: 'avc',
          width: width,
          height: height
        },
        fastStart: false
      });

      let videoEncoder = new window.VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: e => console.error(e)
      });

      // High Profile @ Level 4.2 — significantly better gradient compression than
      // Main Profile, still broadly supported on macOS/iOS/Windows players.
      // Bitrate bumped to 40 Mbps + CBR for consistent quality across gradients
      // (gradient content is bandwidth-hungry due to subtle color transitions).
      videoEncoder.configure({
        codec: 'avc1.64002a',
        width: width,
        height: height,
        bitrate: 40_000_000,
        bitrateMode: 'constant',
        framerate: 30,
        latencyMode: 'quality',
      });

      const FPS = 30;
      const durationSeconds = 15;
      const totalFrames = FPS * durationSeconds;

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
      const ctx = offscreenCanvas.getContext('2d');

      const baseTime = performance.now();
      // Force the animation intro to restart for the video
      introStartTimeRef.current = baseTime;

      setVideoProgress(0);
      let lastReportedPct = -1;
      for (let i = 0; i < totalFrames; i++) {
        const frameTimeMs = baseTime + (i * (1000 / FPS));

        ctx.clearRect(0, 0, width, height);
        drawScene(ctx, width, height, frameTimeMs);

        const videoFrame = new window.VideoFrame(offscreenCanvas, { timestamp: i * (1000000 / FPS) });
        const keyFrame = (i % 15 === 0);
        videoEncoder.encode(videoFrame, { keyFrame });
        videoFrame.close();

        // Report progress to UI (encoding ~80% of total work, mux + flush ~20%)
        const pct = Math.floor(((i + 1) / totalFrames) * 80);
        if (pct !== lastReportedPct) {
          lastReportedPct = pct;
          setVideoProgress(pct);
        }

        // Pause for a moment to not block the UI completely
        if (i % 5 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }
      setVideoProgress(90);

      await videoEncoder.flush();
      muxer.finalize();

      let buffer = muxer.target.buffer;
      let blob = new Blob([buffer], { type: 'video/mp4' });
      let url = URL.createObjectURL(blob);
      let a = document.createElement('a');
      a.href = url;
      a.download = `Glowy-${stateRef.current.format}-${targetShort}p.mp4`;
      setVideoProgress(100);
      a.click();
      URL.revokeObjectURL(url);
      setShareModalOpen(true);

    } catch (e) {
      console.error("Video export failed:", e);
      alert("Video export error: " + e.message);
    } finally {
      setIsRecording(false);
      setVideoProgress(0);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;800&display=swap');
        body { font-family: 'Inter', sans-serif; margin: 0; background: ${ui.appBg}; transition: background-color 300ms ease; }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .tab-fade-in-left { animation: fadeInLeft 200ms cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes canvasFadeInUp {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .canvas-fade-in-up { animation: canvasFadeInUp 520ms cubic-bezier(0.22, 1, 0.36, 1) both; transform-origin: center bottom; }
        @keyframes loadingShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .loading-shimmer {
          background-image: linear-gradient(
            90deg,
            transparent 0%,
            color-mix(in srgb, currentColor 22%, transparent) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          background-repeat: no-repeat;
          animation: loadingShimmer 1.6s linear infinite;
        }
        .panel-scroll::-webkit-scrollbar { width: 4px; }
        .panel-scroll::-webkit-scrollbar-track { background: transparent; }
        .panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }
        .panel-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.12) transparent; }
        .app-themed .text-white { color: var(--text-primary) !important; }
        .app-themed .text-\\[\\#666\\] { color: var(--text-subtle) !important; }
        .app-themed .text-\\[\\#999\\] { color: var(--text-muted) !important; }
        .app-themed .text-\\[\\#bbb\\] { color: var(--text-primary) !important; }
        @keyframes themeFadeIn {
          from { opacity: 0; transform: scale(0.86); }
          50% { opacity: 1; }
          to { opacity: 1; transform: scale(1); }
        }
        .theme-fade-in { animation: themeFadeIn 480ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent);
          border: none;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent);
          border: none;
          cursor: pointer;
        }
      `}} />

      <IconContext.Provider value={{ weight: 'fill' }}>
        {!loaderDone && (
          <Loader onDone={() => setLoaderDone(true)} bgColor={ui.appBg} />
        )}

        <div
          className="app-themed flex flex-col h-screen w-screen overflow-hidden"
          style={{
            backgroundColor: ui.appBg,
            color: ui.textPrimary,
            opacity: loaderDone ? 1 : 0,
            pointerEvents: loaderDone ? 'auto' : 'none',
            transition: 'opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), background-color 300ms ease',
            '--sec-bg': ui.sectionBg,
            '--text-primary': ui.textPrimary,
            '--text-muted': ui.textMuted,
            '--text-subtle': ui.textSubtle,
            '--tab-hover': ui.tabHover,
            '--tab-active': ui.tabActive,
            '--tab-active-text': ui.tabActiveText,
            '--accent': ui.accent,
            '--accent-inverse': ui.accentInverse,
            '--slider-track': ui.sliderTrack,
          }}
        >

          {/* TOP BAR */}
          <header className="relative flex items-center justify-between px-6 pt-4 pb-0 flex-shrink-0">
            <img src={isLight ? '/glowylight.png' : '/glowydark.png'} alt="Glowy" className="h-[22px] w-auto object-contain" />
            <div className="flex items-center gap-3">
              <div
                role="tablist"
                aria-label="UI theme"
                className="flex items-center gap-1 p-1 rounded-full"
                style={{ backgroundColor: ui.tabInactive }}
              >
                {[
                  { key: 'system', Icon: Desktop, label: 'System' },
                  { key: 'light', Icon: Sun, label: 'Light' },
                  { key: 'dark', Icon: Moon, label: 'Dark' },
                ].map(({ key, Icon, label }) => {
                  const active = themePref === key;
                  return (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={active}
                      aria-label={label}
                      onClick={() => { playSwitch(); setThemePref(key); }}
                      className="flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-200"
                      style={{
                        backgroundColor: active ? ui.tabHover : 'transparent',
                        color: active ? ui.tabActiveText : ui.textSubtle,
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = ui.tabHover; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
              <div className="h-5 w-px" style={{ backgroundColor: ui.border }} />
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => { playSwitch(); if (!isRecording && !svgExporting) setExportMenuOpen((v) => !v); }}
                  disabled={isRecording || svgExporting}
                  className={`relative overflow-hidden flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-normal text-[12px] disabled:cursor-not-allowed ${isLight ? 'bg-[#161616] hover:bg-[#161616]/90' : 'bg-white hover:bg-white/90'}`}
                  style={{ color: isLight ? '#FFFFFF' : '#000000' }}
                >
                  {(isRecording || svgExporting) && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 transition-[width] duration-150 ease-out loading-shimmer"
                      style={{ width: `${isRecording ? videoProgress : svgProgress}%`, backgroundColor: 'rgba(255,255,255,0.15)' }}
                    />
                  )}
                  {(isRecording || svgExporting) ? (
                    <span className="relative flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      Exporting… {isRecording ? videoProgress : svgProgress}%
                    </span>
                  ) : (
                    <span className="relative flex items-center gap-2">
                      <ArrowCircleDown className="w-3.5 h-3.5" />
                      Export
                      <CaretDown className="w-3 h-3" />
                    </span>
                  )}
                </button>
                {exportMenuOpen && !isRecording && !svgExporting && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-[269px] rounded-2xl py-2 z-50"
                    style={{ backgroundColor: isLight ? '#EDEDED' : ui.sectionBg }}
                  >
                    {(() => {
                      const sectionStyle = { color: ui.textSubtle };
                      const itemStyle = { color: ui.textPrimary };
                      const disabledStyle = { color: ui.textSubtle, opacity: 0.5 };
                      const Item = ({ label, onClick, disabled, hint }) => (
                        <button
                          role="menuitem"
                          onClick={onClick}
                          disabled={disabled}
                          className="w-[calc(100%-12px)] mx-1.5 rounded-full text-left px-4 py-2 text-[12px] flex items-center justify-between transition-colors disabled:cursor-not-allowed"
                          style={disabled ? disabledStyle : itemStyle}
                          onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = ui.tabHover; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <span>{label}</span>
                          {hint && <span className="text-[10px]" style={{ color: ui.textSubtle }}>{hint}</span>}
                        </button>
                      );
                      const Divider = () => <div className="my-1.5 h-px" style={{ backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }} />;
                      const Header = ({ children }) => (
                        <div className="px-[22px] pt-1.5 pb-1 text-[10px] uppercase tracking-wider" style={sectionStyle}>{children}</div>
                      );
                      const run = (fn) => { playSwitch(); setExportMenuOpen(false); fn(); };
                      return (
                        <>
                          <Header>SVG Format</Header>
                          <Item label="SVG File" onClick={() => run(() => handleExportSVG())} />
                          <Divider />
                          <Header>PNG Format</Header>
                          {(() => {
                            const base = FORMATS[format];
                            const pngDims = (s) => `${Math.round(base.width * s)}×${Math.round(base.height * s)}`;
                            return (
                              <>
                                <Item label="PNG 1x" hint={pngDims(1)} onClick={() => run(() => handleExportPNG(1))} />
                                <Item label="PNG 2x" hint={pngDims(2)} onClick={() => run(() => handleExportPNG(2))} />
                                <Item label="PNG 3x" hint={pngDims(3)} onClick={() => run(() => handleExportPNG(3))} />
                              </>
                            );
                          })()}
                          <Divider />
                          <div className="px-[22px] pt-1.5 pb-1 flex items-center justify-between text-[10px] uppercase tracking-wider" style={sectionStyle}>
                            <span>Video Format</span>
                            <span className="normal-case tracking-normal">MP4 · H.264 · 30 fps · 15 s</span>
                          </div>
                          {(() => {
                            const base = FORMATS[format];
                            const baseShort = Math.min(base.width, base.height);
                            const dimsFor = (target) => {
                              const f = target / baseShort;
                              const w = Math.round((base.width * f) / 2) * 2;
                              const h = Math.round((base.height * f) / 2) * 2;
                              return `${w}×${h}`;
                            };
                            return (
                              <>
                                <Item label="Video 480p" hint={dimsFor(480)} onClick={() => run(() => handleExportVideo(480))} />
                                <Item label="Video 720p" hint={dimsFor(720)} onClick={() => run(() => handleExportVideo(720))} />
                                <Item label="Video 1080p" hint={dimsFor(1080)} onClick={() => run(() => handleExportVideo(1080))} />
                                <Item label="Video 4k" disabled hint="Soon" />
                              </>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* MAIN AREA — relative so children can be absolutely positioned and centred */}
          <div className="flex-1 relative px-6 pb-6 overflow-hidden">

            {/* ICON RAIL — vertically centred against the viewport */}
            <div ref={railRef} className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
              {TABS.map(({ id, label, Icon }) => {
                const isActive = activeTab === id;
                const isOpen = panelOpen;
                const btn = (
                  <button
                    onClick={() => { playHover(); handleTabClick(id); }}
                    aria-label={label}
                    className="w-12 h-12 rounded-[100px] transition-colors duration-200 flex items-center justify-center"
                    style={{
                      backgroundColor: isActive ? (isLight ? '#161616' : '#FFFFFF') : ui.tabInactive,
                      color: isActive ? (isLight ? '#FFFFFF' : '#000000') : ui.textPrimary,
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = ui.tabHover; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = ui.tabInactive; }}
                  >
                    <Icon className="w-[95%] h-[95%]" />
                  </button>
                );
                return isOpen ? <div key={id}>{btn}</div> : <Tooltip key={id} label={label} side="right">{btn}</Tooltip>;
              })}
            </div>

            {/* TAB PANEL — vertically centred, auto-height, hidden by default */}
            <div
              ref={panelRef}
              key={activeTab}
              className={`panel-themed tab-fade-in-left absolute left-[88px] top-0 bottom-0 my-auto w-[280px] flex flex-col rounded-[16px] overflow-hidden z-10 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${panelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
              style={{
                backgroundColor: ui.panelBg,
                color: ui.textPrimary,
                maxHeight: 'calc(100% - 16px)',
                height: 'fit-content',
                transform: `translateX(${panelOpen ? '0px' : '-16px'})`,
                '--sec-bg': ui.sectionBg,
                '--text-primary': ui.textPrimary,
                '--text-muted': ui.textMuted,
                '--text-subtle': ui.textSubtle,
                '--tab-hover': ui.tabHover,
                '--tab-active': ui.tabActive,
                '--tab-active-text': ui.tabActiveText,
                '--accent': ui.accent,
                '--accent-inverse': ui.accentInverse,
                '--slider-track': ui.sliderTrack,
              }}
            >
              <div className="flex flex-col flex-1 min-h-0">

                {/* PANEL TITLE — matches the active tab */}
                <div className="px-4 pt-4 pb-2">
                  <h2 className="text-[12px] font-normal tracking-tight" style={{ color: isLight ? ui.textPrimary : '#FFFFFF' }}>
                    {TABS.find((t) => t.id === activeTab)?.label}
                  </h2>
                </div>

                {/* CONTROLS — height auto-fits content, scrolls only when overflowing the viewport */}
                <div className="panel-scroll flex flex-col overflow-y-auto px-3 pt-1 pb-3 gap-2 flex-1 min-h-0">

                  {/* PRESETS SECTION */}
                  <div className="bg-[var(--sec-bg)] rounded-[16px] p-3">
                    <label className="text-[11px] font-normal text-white mb-2 block">Presets</label>
                    <div className="flex justify-between">
                      {Object.entries(FORMATS).map(([key, { label }]) => {
                        const isActive = format === key;
                        const shapeStyle = key === '9:16'
                          ? { width: 12, height: 20 }
                          : key === '1:1'
                            ? { width: 17, height: 17 }
                            : { width: 22, height: 14 };
                        return (
                          <button
                            key={key}
                            onClick={() => { playSwitch(); setFormat(key); }}
                            className={`flex flex-col items-center justify-center gap-2 rounded-[16px] transition-colors duration-200 w-[70px] h-[70px] ${isActive
                              ? 'bg-[var(--tab-active)] text-[var(--tab-active-text)]'
                              : 'bg-transparent text-[var(--text-subtle)] hover:bg-[var(--tab-hover)] hover:text-[var(--text-muted)]'
                              }`}
                          >
                            <div className="flex items-center justify-center" style={{ height: 22 }}>
                              <div
                                className="rounded-[3px] shrink-0"
                                style={{ ...shapeStyle, backgroundColor: 'currentColor' }}
                              />
                            </div>
                            <span className="w-full text-center text-[10px] font-normal leading-none opacity-70 tabular-nums">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* COLOR THEME SECTION */}
                  <div className="bg-[var(--sec-bg)] rounded-[16px] p-3">
                    <label className="text-[11px] font-normal text-white mb-2 block">Color Theme</label>
                    <div className="flex justify-between">
                      {Object.entries(THEMES).map(([key, t]) => {
                        const isActive = colorTheme === key;
                        return (
                          <button
                            key={key}
                            onClick={() => { playSwitch(); setCustomTheme(null); setColorTheme(key); }}
                            className={`flex flex-col items-center justify-center gap-2 px-1 rounded-[16px] transition-colors duration-200 w-[70px] h-[70px] ${isActive
                              ? 'bg-[var(--tab-active)]'
                              : 'bg-transparent hover:bg-[var(--tab-hover)]'
                              }`}
                          >
                            <div className="flex justify-center">
                              {t.preview.map((c, i) => (
                                <div
                                  key={i}
                                  className="w-3.5 h-3.5 rounded-full"
                                  style={{
                                    backgroundColor: c,
                                    marginLeft: i === 0 ? 0 : -2,
                                    zIndex: 3 - i,
                                    boxShadow: 'none',
                                  }}
                                />
                              ))}
                            </div>
                            <span className={`text-[11px] font-normal text-center leading-none ${isActive ? 'text-[var(--tab-active-text)]' : 'text-[var(--text-subtle)]'
                              }`}>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CLASSIC MODE CONTROLS (Pattern only) */}
                  {activeTab === 'neonPattern' && (
                    <>
                      <div className="bg-[var(--sec-bg)] rounded-[16px] p-3">
                        <DirectionPad
                          label="Dot Direction"
                          direction={direction}
                          onChange={setDirection}
                        />
                      </div>

                      <div className="bg-[var(--sec-bg)] rounded-[16px] p-3">
                        <Slider
                          label="Thickness"
                          min={0.5} max={5} step={0.1}
                          value={dotSize}
                          onChange={setDotSize}
                          formatValue={(v) => v.toFixed(1) + 'px'}
                        />
                        <div style={{ height: 8 }}></div>
                        <Slider
                          label="Density"
                          min={10} max={60} step={2}
                          value={dotSpacing}
                          onChange={setDotSpacing}
                          formatValue={(v) => v + 'px'}
                        />
                      </div>

                      <div className="bg-[var(--sec-bg)] rounded-[16px] p-3">
                        <DirectionPad
                          label="Gradient position"
                          direction={gradientPos}
                          onChange={setGradientPos}
                          disabledDirs={['left', 'right']}
                        />
                      </div>
                    </>
                  )}

                  {/* SHAPE COUNT (Spectrum / Waves / Pulse) */}
                  {activeTab !== 'neonPattern' && (
                    <div className="bg-[var(--sec-bg)] rounded-[16px] p-3">
                      <Slider
                        label={activeTab === 'glass' ? 'Rings' : 'Columns'}
                        min={activeTab === 'glass' ? 5 : 4}
                        max={activeTab === 'glass' ? 24 : 20}
                        step={1}
                        value={shapeCount}
                        onChange={setShapeCount}
                        formatValue={(v) => v}
                      />
                    </div>
                  )}

                  {/* ANIMATION TOGGLE */}
                  <div className="bg-[var(--sec-bg)] rounded-[16px] p-3">
                    <Switch
                      label="Animate Effect"
                      checked={isAnimated}
                      onChange={setIsAnimated}
                    />
                  </div>

                  {/* DASHED LINES TOGGLE — hidden in Pattern tab */}
                  {activeTab !== 'neonPattern' && (
                    <div className="bg-[var(--sec-bg)] rounded-[16px] p-3">
                      <Switch
                        label="Dashed Lines"
                        checked={showDashed}
                        onChange={setShowDashed}
                      />
                    </div>
                  )}

                  {/* NOISE TOGGLE */}
                  <div className="bg-[var(--sec-bg)] rounded-[16px] p-3">
                    <Switch
                      label="Noise"
                      checked={showNoise}
                      onChange={setShowNoise}
                    />
                  </div>


                </div>
              </div>
            </div>

            {/* CANVAS PREVIEW — canvas itself is centred (label is absolutely
              positioned above it so it doesn't shift the centre point) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative pointer-events-auto">
                <span className="absolute -top-7 left-1 text-[13px] font-normal text-[#888] select-none">
                  {FORMATS[format].label}
                </span>
                <div ref={fadeWrapRef} style={{ display: 'inline-block' }}>
                  <div
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className="relative overflow-hidden"
                    style={{
                      aspectRatio: `${FORMATS[format].width} / ${FORMATS[format].height}`,
                      maxHeight: 'calc(100vh - 140px)',
                      maxWidth: 'calc(100vw - 160px)',
                      transformStyle: 'preserve-3d',
                      willChange: 'transform',
                      boxShadow: 'none',
                      borderRadius: 16,
                      backgroundColor: (customTheme || THEMES[colorTheme] || THEMES.neon).bg,
                    }}
                  >
                    <canvas ref={canvasRef} className="block w-full h-full transition-all" />
                  </div>
                </div>

                {/* THEME SELECTOR — vertical on right of canvas. Active = gray
                  rounded-square container holding both overlapping dots and the
                  current tab label; inactive = dots + theme label only. */}
                <div className="absolute left-full top-0 flex flex-col" style={{ gap: 13, marginLeft: 13 }}>
                  {Object.entries(THEMES).map(([key, t]) => {
                    const isActive = colorTheme === key && !customTheme;
                    const label = t.label;
                    const dots = (
                      <div className="flex">
                        {t.preview.map((c, i) => (
                          <div
                            key={i}
                            className="w-3.5 h-3.5 rounded-full"
                            style={{
                              backgroundColor: c,
                              marginLeft: i === 0 ? 0 : -2,
                              zIndex: 3 - i,
                              boxShadow: 'none',
                            }}
                          />
                        ))}
                      </div>
                    );
                    return (
                      <button
                        key={key}
                        onClick={() => { playSwitch(); setCustomTheme(null); setColorTheme(key); }}
                        className={`group flex flex-col items-center justify-center gap-2 rounded-2xl transition-colors duration-300 ease-out ${isActive ? 'bg-[var(--tab-active)]' : 'bg-transparent hover:bg-[var(--tab-hover)]'}`}
                        style={{ width: 70, height: 70 }}
                      >
                        <div className="flex flex-col items-center gap-2">
                          {dots}
                          <span className={`text-[12px] font-normal leading-none transition-colors duration-300 ${isActive ? 'text-[var(--tab-active-text)]' : 'text-[var(--text-subtle)] group-hover:text-[var(--text-muted)]'}`}>{label}</span>
                        </div>
                      </button>
                    );
                  })}

                  {/* RANDOM THEME — picks a curated brand-inspired palette */}
                  <button
                    onClick={() => {
                      playSwitch();
                      const base = RANDOM_PALETTES[Math.floor(Math.random() * RANDOM_PALETTES.length)];
                      const j = jitterPalette(base);
                      setCustomTheme({
                        label: j.label,
                        bg: j.bg,
                        gradientStart: j.gradientStart,
                        gradientMid: j.gradientMid,
                        gradientEnd: j.gradientEnd,
                        preview: [j.gradientStart, j.gradientMid || j.gradientEnd, j.gradientEnd],
                      });
                    }}
                    className={`group flex flex-col items-center justify-center gap-2 rounded-2xl transition-colors duration-300 ease-out ${customTheme ? 'bg-[var(--tab-active)]' : 'bg-transparent hover:bg-[var(--tab-hover)]'}`}
                    style={{ width: 70, height: 70 }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex">
                        {(customTheme ? customTheme.preview : ['#3a3a3a', '#5a5a5a', '#8a8a8a']).map((c, i) => (
                          <div
                            key={i}
                            className="w-3.5 h-3.5 rounded-full"
                            style={{
                              backgroundColor: c,
                              marginLeft: i === 0 ? 0 : -2,
                              zIndex: 3 - i,
                              boxShadow: 'none',
                            }}
                          />
                        ))}
                      </div>
                      <span className={`text-[12px] font-normal leading-none transition-colors duration-300 ${customTheme ? 'text-[var(--tab-active-text)]' : 'text-[var(--text-subtle)] group-hover:text-[var(--text-muted)]'}`}>Random</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {mobileWarningOpen && (() => {
          const sysLight = !systemDark;
          const sysAppBg = sysLight ? '#fbfbfb' : '#141414';
          const sysText = sysLight ? '#0A0A0B' : '#FFFFFF';
          const sysSubtle = sysLight ? '#8A8A93' : '#666666';
          return (
            <div
              className="fixed inset-0 z-[300] flex items-center justify-center px-[60px]"
              style={{ backgroundColor: sysAppBg }}
            >
              <div className="w-full max-w-[380px] text-center">
                <img src="/favicon.png" alt="Glowy" className="h-[74px] w-auto object-contain mx-auto mb-4" />
                <h2 className="text-[20px] font-normal tracking-tight mb-3" style={{ color: sysText }}>
                  Best on desktop
                </h2>
                <p className="text-[13px] font-normal leading-relaxed" style={{ color: sysSubtle }}>
                  Glowy shines on a bigger screen. Open it on desktop for the full experience.
                </p>
              </div>
            </div>
          );
        })()}

        <Modal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          bgColor={isLight ? '#FFFFFF' : ui.panelBg}
        >
          <button
            onClick={() => setShareModalOpen(false)}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
            style={{ color: ui.textSubtle }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = ui.tabHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <X className="w-4 h-4" weight="regular" />
          </button>

          <div className="text-center mb-2">
            <img src="/favicon.png" alt="Glowy" className="h-[74px] w-auto object-contain mx-auto" />
          </div>
          <h2 className="text-center text-[20px] font-normal tracking-tight mb-3" style={{ color: ui.textPrimary }}>
            Your file is ready!
          </h2>
          <p className="text-center text-[13px] font-normal leading-relaxed mb-6" style={{ color: ui.textSubtle }}>
            Glowy is free and built with love. If you enjoyed it, share it with your friends and fellow creators!
          </p>

          <div className="flex flex-col gap-2 mb-5">
            {[
              { key: 'x', Icon: XLogo, label: 'Share on X', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent('I just designed a stunning gradient with @glowy_app — open-source, free, and ridiculously fun. Make yours in seconds ✨')}&url=${encodeURIComponent(window.location.href)}` },
              { key: 'fb', Icon: FacebookLogo, label: 'Share on Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent('Just made a beautiful gradient with Glowy — free, fast, and built for creators. Try it 👇')}` },
              { key: 'li', Icon: LinkedinLogo, label: 'Share on LinkedIn', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent('Discovered Glowy — a free creative tool that turns simple controls into bold, brand-ready visuals. Worth a look for designers and marketers alike.')}` },
            ].map(({ key, Icon, label, url }) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-full transition-colors duration-150"
                style={{ backgroundColor: ui.tabInactive, color: isLight ? ui.textMuted : ui.textPrimary }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = ui.tabHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ui.tabInactive; }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[13px] font-normal">{label}</span>
              </a>
            ))}
          </div>

          <div className="rounded-[12px] p-4 mb-5" style={{ backgroundColor: ui.sectionBg }}>
            <p className="text-[12px] font-normal leading-relaxed" style={{ color: ui.textSubtle }}>
              Your share keeps Glowy alive and growing — every post helps spread the glow.
            </p>
          </div>

          <div className="pt-4 text-center" style={{ borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}` }}>
            <p className="text-[12px] font-normal" style={{ color: ui.textSubtle }}>
              Designed & built by{' '}
              <a
                href="https://x.com/javiercrocco"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: ui.textPrimary }}
              >
                Javier Crocco Mendez
              </a>
            </p>
          </div>
        </Modal>
      </IconContext.Provider>
    </>
  );
}
