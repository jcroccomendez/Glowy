import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Video, Monitor, Smartphone, Layout as ImageIcon } from 'lucide-react';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

// --- CONFIGURATION AND UTILITIES ---
const APP_BG = '#131413'; // Unified general app background

// Color Themes
const THEMES = {
  neon: {
    label: 'Neon',
    bg: '#062F2C',
    gradientStart: '#2482F1',
    gradientEnd: '#00FF48',
    preview: ['#062F2C', '#2482F1', '#00FF48'],
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

const FORMATS = {
  post: { width: 1080, height: 1350, label: "Post", icon: ImageIcon },
  story: { width: 1080, height: 1920, label: "Story", icon: Smartphone },
  desktop: { width: 1920, height: 1080, label: "Desktop", icon: Monitor }
};

// --- COMPONENTS ---

const Slider = ({ label, value, min, max, step, onChange, formatValue = (v) => v }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-1 mb-1 last:mb-0">
      <div className="flex justify-between items-center">
        <label className="text-[11px] font-medium text-white">{label}</label>
        <span className="text-[11px] text-[#666] font-mono tabular-nums">{formatValue(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-[2px] rounded-full appearance-none cursor-pointer focus:outline-none"
        style={{
          background: `linear-gradient(to right, #00FF48 0%, #00FF48 ${percentage}%, #333 ${percentage}%, #333 100%)`
        }}
      />
    </div>
  );
};

const Switch = ({ label, checked, onChange, icon }) => (
  <div className="flex items-center justify-between py-1.5">
    <div className="flex items-center gap-2">
      {icon && <span className="text-[#666]">{icon}</span>}
      <label className="text-[12px] font-medium text-white cursor-pointer" onClick={() => onChange(!checked)}>
        {label}
      </label>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[18px] w-9 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-[#00FF48]' : 'bg-[#333]'
        }`}
    >
      <span
        className={`inline-block h-[14px] w-[14px] transform rounded-full transition-transform shadow-sm ${checked ? 'translate-x-[18px] bg-[#181818]' : 'translate-x-0.5 bg-[#666]'
          }`}
      />
    </button>
  </div>
);

const DirectionPad = ({ label, direction, onChange, disabledDirs = [] }) => {
  const getPillClass = (dir) => {
    const isDisabled = disabledDirs.includes(dir);
    const isActive = direction === dir;
    const base = `absolute transition-colors ${isDisabled ? 'opacity-10 cursor-not-allowed' : 'cursor-pointer'}`;

    const activeColor = "bg-[#00FF48]";
    const inactiveColor = "bg-[#333] hover:bg-[#444]";

    let shape = "";
    if (dir === 'top') shape = "w-1.5 h-4 top-1.5 left-1/2 -translate-x-1/2 rounded-full";
    if (dir === 'bottom') shape = "w-1.5 h-4 bottom-1.5 left-1/2 -translate-x-1/2 rounded-full";
    if (dir === 'left') shape = "w-4 h-1.5 left-1.5 top-1/2 -translate-y-1/2 rounded-full";
    if (dir === 'right') shape = "w-4 h-1.5 right-1.5 top-1/2 -translate-y-1/2 rounded-full";

    return `${base} ${shape} ${isActive ? activeColor : inactiveColor}`;
  };

  return (
    <div className="flex items-center justify-between">
      <label className="text-[11px] font-medium text-white">{label}</label>
      <div className="relative w-24 h-14 bg-[#222] rounded-xl flex items-center justify-center">
        <div className="relative w-4 h-4 pointer-events-none opacity-30">
          <div className="absolute top-1/2 left-0 w-full h-px bg-[#666] -translate-y-1/2"></div>
          <div className="absolute left-1/2 top-0 w-px h-full bg-[#666] -translate-x-1/2"></div>
        </div>

        <div onClick={() => !disabledDirs.includes('top') && onChange('top')} className={getPillClass('top')} />
        <div onClick={() => !disabledDirs.includes('bottom') && onChange('bottom')} className={getPillClass('bottom')} />
        <div onClick={() => !disabledDirs.includes('left') && onChange('left')} className={getPillClass('left')} />
        <div onClick={() => !disabledDirs.includes('right') && onChange('right')} className={getPillClass('right')} />
      </div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---
export default function App() {
  // General state
  const [format, setFormat] = useState('post');
  const [isAnimated, setIsAnimated] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  // Classic Mode state
  const [direction, setDirection] = useState('left');
  const [dotSize, setDotSize] = useState(1.8);
  const [dotSpacing, setDotSpacing] = useState(28);
  const [gradientPos, setGradientPos] = useState('bottom');
  const [activeTab, setActiveTab] = useState('neonPattern'); // 'neonPattern' | 'spectrum' | 'radial'
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
  const noiseCanvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const introStartTimeRef = useRef(-1);
  const formatRef = useRef(null);
  const mousePosRef = useRef(null);
  const interactRef = useRef({ x: 0, y: 0, weight: 0 });
  const timeStateRef = useRef({ lastTime: performance.now(), animatedTime: 1000 });
  const liquidCanvasRef = useRef(null);
  const blurOffscreenRef = useRef(null);
  const dotsCacheRef = useRef(null);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
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
      mousePosRef.current = {
        x: (clickX / drawWidth) * canvas.width,
        y: (clickY / drawHeight) * canvas.height
      };
    } else {
      mousePosRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    mousePosRef.current = null;
  };

  // Generate noise pattern + allocate blur offscreen + invalidate dots cache
  useEffect(() => {
    const { width, height } = FORMATS[format];
    const canvas = document.createElement('canvas');
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

  const stateRef = useRef({ direction, dotSize, dotSpacing, gradientPos, isAnimated, format, isRecording, uploadedImageObj, uploadedImageSrc, activeTab, imageScale, colorTheme });
  useEffect(() => {
    stateRef.current = { direction, dotSize, dotSpacing, gradientPos, isAnimated, format, isRecording, uploadedImageObj, uploadedImageSrc, activeTab, imageScale, colorTheme };
  }, [direction, dotSize, dotSpacing, gradientPos, isAnimated, format, isRecording, uploadedImageObj, uploadedImageSrc, activeTab, imageScale, colorTheme]);

  // Reset intro animation when changing tabs
  useEffect(() => {
    introStartTimeRef.current = -1;
  }, [activeTab]);

  // Render a heavily-blurred gradient ellipse via downscale-blur-upscale.
  // The destination ctx draws an offscreen 1/4-size pre-blurred canvas instead
  // of running ctx.filter='blur(170px)' on the full-resolution canvas.
  const drawBlurredGradientEllipse = (ctx, mainW, mainH, cx, cy, rx, ry, gradStart, gradEnd, alpha) => {
    const off = blurOffscreenRef.current;
    if (!off) return;
    const { canvas, ctx: offCtx, scale: s } = off;

    offCtx.clearRect(0, 0, canvas.width, canvas.height);
    offCtx.filter = `blur(${170 * s}px)`;

    const gradient = offCtx.createLinearGradient(
      (cx - rx) * s, cy * s,
      (cx + rx) * s, cy * s
    );
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
  const drawSpectrum = (ctx, width, height, time, state, elapsed) => {
    const theme = THEMES[state.colorTheme] || THEMES.neon;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    const numCols = 9;
    const colWidth = width / numCols;
    const radius = Math.max(width, height) * 0.6;
    const yOffsetMultiplier = state.format === 'desktop' ? 0.50 : 0.30;
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

      ctx.beginPath();
      ctx.rect(i * colWidth, 0, colWidth, height);
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

      drawBlurredGradientEllipse(ctx, width, height, blobX, blobY, scaledRx, scaledRy, theme.gradientStart, theme.gradientEnd, pColFade);

      ctx.restore();

      // --- DASHED BORDER BETWEEN COLUMNS ---
      if (i < numCols - 1) {
        ctx.save();
        ctx.globalAlpha = pColFade * 0.5; // A bit more transparent
        ctx.setLineDash([8, 15]);
        ctx.lineWidth = 2.0;

        const lineGrad = ctx.createLinearGradient(0, 0, 0, height);
        lineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        lineGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0)'); // Transparency goes lower
        lineGrad.addColorStop(1, '#FFFFFF');

        ctx.strokeStyle = lineGrad;
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

    if (noiseCanvasRef.current) {
      ctx.globalAlpha = 0.05;
      ctx.drawImage(noiseCanvasRef.current, 0, 0, width, height);
      ctx.globalAlpha = 1.0;
    }
  };

  // --- WAVES DRAWING LOGIC (Deformed Spectrum) ---
  const drawWaves = (ctx, width, height, time, state, elapsed) => {
    const theme = THEMES[state.colorTheme] || THEMES.neon;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    const spectrumCols = 9;
    const colWidth = width / spectrumCols; // Same width as spectrum columns
    const extraLeft = 4;  // Extra columns on the left
    const extraRight = 4; // Extra columns on the right
    const numCols = spectrumCols + extraLeft + extraRight; // 17 total
    const startX = -extraLeft * colWidth; // Start 4 columns to the left

    const radius = Math.max(width, height) * 0.4;
    const yOffsetMultiplier = state.format === 'desktop' ? 0.50 : 0.30;
    const baseBlobY = state.gradientPos === 'bottom' ? height + (radius * yOffsetMultiplier) : -(radius * yOffsetMultiplier);

    const currentTime = state.animatedTime !== undefined ? state.animatedTime : time;
    const animT = currentTime * 0.00012;
    const numPoints = 60;

    // Fan warp: columns radiate from upper-left corner outward
    const getWarpedX = (baseX, y) => {
      const yRatio = y / height;
      // Focal point: upper-left area
      const focalX = width * 0.05;
      // Fan spread: converge at top, spread at bottom
      const spread = Math.pow(yRatio, 0.7);
      const targetX = baseX * 1.2;
      const fanX = focalX + (targetX - focalX) * spread;
      // Subtle arc curvature
      const arc = Math.sin(yRatio * Math.PI) * width * 0.035;
      // Very subtle breathing animation
      const breath = Math.sin(animT) * width * 0.008 * yRatio;
      return fanX + arc + breath;
    };

    // Generate boundary paths (numCols + 1 boundaries)
    const boundaries = [];
    for (let col = 0; col <= numCols; col++) {
      const baseX = startX + col * colWidth;
      const points = [];
      for (let j = 0; j <= numPoints; j++) {
        const y = (j / numPoints) * height;
        const x = getWarpedX(baseX, y);
        points.push({ x, y });
      }
      boundaries.push(points);
    }

    // Draw each warped column (same logic as spectrum)
    for (let i = 0; i < numCols; i++) {
      ctx.save();

      // Domino intro per column
      const colDelayMs = i * 120;
      const colDurationMs = 800;
      let rawColP = Math.max(0, Math.min((elapsed - 100 - colDelayMs) / colDurationMs, 1));
      const pColFade = Math.pow(rawColP, 2);

      // Create clip path: left boundary down, right boundary up
      const leftBound = boundaries[i];
      const rightBound = boundaries[i + 1];

      ctx.beginPath();
      ctx.moveTo(leftBound[0].x, leftBound[0].y);
      for (let j = 1; j < leftBound.length; j++) {
        ctx.lineTo(leftBound[j].x, leftBound[j].y);
      }
      for (let j = rightBound.length - 1; j >= 0; j--) {
        ctx.lineTo(rightBound[j].x, rightBound[j].y);
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

      drawBlurredGradientEllipse(ctx, width, height, blobX, blobY, scaledRx, scaledRy, theme.gradientStart, theme.gradientEnd, pColFade);

      ctx.restore();

      // Dashed border along the right boundary curve
      if (i < numCols - 1) {
        ctx.save();
        ctx.globalAlpha = pColFade * 0.5;
        ctx.setLineDash([8, 15]);
        ctx.lineWidth = 2.0;

        const borderBound = boundaries[i + 1];

        const lineGrad = ctx.createLinearGradient(0, 0, 0, height);
        lineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        lineGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0)');
        lineGrad.addColorStop(1, '#FFFFFF');

        ctx.strokeStyle = lineGrad;
        ctx.beginPath();
        ctx.moveTo(borderBound[0].x, borderBound[0].y);
        for (let j = 1; j < borderBound.length; j++) {
          ctx.lineTo(borderBound[j].x, borderBound[j].y);
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

    if (noiseCanvasRef.current) {
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








    // 1. Base background
    const theme = THEMES[state.colorTheme] || THEMES.neon;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    // --- CLASSIC MODE (Dots and Oval Gradient) ---

    // Slowed sweep parameters
    const WAVE_SPEED = 2000;
    const DOT_ANIM_DURATION = 1400;
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
    const yOffsetMultiplier = state.format === 'desktop' ? 0.50 : 0.30;
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

    if (noiseCanvasRef.current) {
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
    const { width, height } = FORMATS[stateRef.current.format];

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.objectFit = 'contain';

    let animFrame;
    const loop = (time) => {
      animFrame = requestAnimationFrame(loop);

      // Pause completely when tab is hidden
      if (document.hidden) return;

      // Cap to ~30fps — halves GPU/CPU work vs 60fps
      const sinceLast = time - timeStateRef.current.lastTime;
      if (sinceLast < 32) return;

      let dt = sinceLast;
      if (dt > 100) dt = 16;
      timeStateRef.current.lastTime = time;

      const state = stateRef.current;
      if (state.isAnimated) {
        timeStateRef.current.animatedTime += dt;
      }

      // Skip redraw when the scene is fully static:
      // intro animation done, animation off, no mouse interaction
      const introAge = introStartTimeRef.current >= 0 ? time - introStartTimeRef.current : 0;
      const introSettled = introAge > 3500;
      const noInteraction = interactRef.current.weight < 0.001 && !mousePosRef.current;
      if (!state.isAnimated && introSettled && noInteraction) return;

      ctx.clearRect(0, 0, width, height);
      const renderState = { ...state, animatedTime: timeStateRef.current.animatedTime };
      drawScene(ctx, width, height, time, renderState);
    };

    // Prevent a large dt spike when returning to the tab
    const onVisibilityChange = () => {
      if (!document.hidden) timeStateRef.current.lastTime = performance.now();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    animFrame = requestAnimationFrame(loop);

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [drawScene, format]);

  // --- EXPORT SVG ---
  const handleExportSVG = () => {
    const state = stateRef.current;
    const theme = THEMES[state.colorTheme] || THEMES.neon;
    const { width, height } = FORMATS[state.format];
    const FADE_OUT_POINT = 0.60;

    const radius = Math.max(width, height) * 0.6;
    const yOffsetMultiplier = state.format === 'desktop' ? 0.50 : 0.30;
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
      const numCols = 9;
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
      // Waves: render to canvas and embed as raster
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      drawWaves(tempCtx, width, height, performance.now(), state, 5000);
      const dataUrl = tempCanvas.toDataURL('image/png');
      contentHtml = `<image href="${dataUrl}" x="0" y="0" width="${width}" height="${height}" />${imageHtml}`;


    }

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
        <defs>
          <filter id="blurFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="170" />
          </filter>
          <linearGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="15.29%" stop-color="${theme.gradientStart}" />
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

    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neon-theme-creator-${state.format}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- EXPORT MP4 VIDEO (High Quality Offline) ---
  const handleExportVideo = async () => {
    if (isRecording) return;
    setIsRecording(true);

    if (!stateRef.current.isAnimated) setIsAnimated(true);

    const { width, height } = FORMATS[stateRef.current.format];

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

      videoEncoder.configure({
        codec: 'avc1.4d002a', // Main Profile (alta compatibilidad)
        width: width,
        height: height,
        bitrate: 15_000_000, // 15 Mbps para alta calidad
        framerate: 30
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

      for (let i = 0; i < totalFrames; i++) {
        const frameTimeMs = baseTime + (i * (1000 / FPS));

        ctx.clearRect(0, 0, width, height);
        drawScene(ctx, width, height, frameTimeMs);

        const videoFrame = new window.VideoFrame(offscreenCanvas, { timestamp: i * (1000000 / FPS) });
        const keyFrame = (i % 30 === 0);
        videoEncoder.encode(videoFrame, { keyFrame });
        videoFrame.close();

        // Pause for a moment to not block the UI completely
        if (i % 5 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      await videoEncoder.flush();
      muxer.finalize();

      let buffer = muxer.target.buffer;
      let blob = new Blob([buffer], { type: 'video/mp4' });
      let url = URL.createObjectURL(blob);
      let a = document.createElement('a');
      a.href = url;
      a.download = `neon-theme-creator-${stateRef.current.format}.mp4`;
      a.click();
      URL.revokeObjectURL(url);

    } catch (e) {
      console.error("Video export failed:", e);
      alert("Video export error: " + e.message);
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&display=swap');
        body { font-family: 'Inter', sans-serif; margin: 0; background: ${APP_BG}; }
      `}} />

      <div className="flex h-screen w-screen overflow-hidden text-zinc-100" style={{ backgroundColor: APP_BG }}>

        {/* CONTROLS SIDEBAR */}
        <div className="flex-shrink-0 p-3 flex">
          <div className="w-[280px] bg-[#181818] flex flex-col overflow-y-auto z-10 rounded-2xl">

          {/* HEADER */}
          <div className="px-4 pt-4 pb-3">
            <h1 className="text-[14px] font-bold tracking-tight text-white">
              Neon Theme Creator
            </h1>
          </div>

          {/* GENERAL TABS */}
          <div className="flex">
            {[
              { id: 'neonPattern', label: 'Pattern' },
              { id: 'spectrum', label: 'Spectrum' },
              { id: 'radial', label: 'Waves' }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 text-[11px] font-semibold transition-all relative ${isActive ? 'text-white' : 'text-[#666] hover:text-[#999]'
                    }`}
                >
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#00FF48]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* SCROLLABLE CONTROLS */}
          <div className="flex flex-col flex-1 overflow-y-auto px-3 pt-2 gap-2">

            {/* PRESETS SECTION */}
            <div className="bg-[#1e1e1e] rounded-xl px-3 py-3">
              <label className="text-[11px] font-semibold text-white mb-2 block">Presets</label>
              <div className="flex gap-1">
                {Object.entries(FORMATS).map(([key, { label, icon: Icon }]) => {
                  const isActive = format === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setFormat(key)}
                      className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-lg transition-all border ${isActive
                        ? 'bg-[#00FF48]/8 border-[#00FF48]/40 text-[#00FF48]'
                        : 'bg-transparent border-[#333] text-[#666] hover:border-[#444] hover:text-[#999]'
                        }`}
                    >
                      <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-[#00FF48]' : ''}`} />
                      <span className="text-[11px] font-medium">{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* COLOR THEME SECTION */}
            <div className="bg-[#1e1e1e] rounded-xl px-3 py-3">
              <label className="text-[11px] font-semibold text-white mb-2 block">Color Theme</label>
              <div className="flex gap-1">
                {Object.entries(THEMES).map(([key, t]) => {
                  const isActive = colorTheme === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setColorTheme(key)}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-lg transition-all border ${isActive
                        ? 'bg-[#00FF48]/8 border-[#00FF48]/40'
                        : 'bg-transparent border-[#333] hover:border-[#444]'
                        }`}
                    >
                      <div className="flex gap-[2px]">
                        {t.preview.map((c, i) => (
                          <div
                            key={i}
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: c, boxShadow: isActive ? `0 0 4px ${c}60` : 'none' }}
                          />
                        ))}
                      </div>
                      <span className={`text-[11px] font-medium ${isActive ? 'text-white' : 'text-[#666]'
                        }`}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CLASSIC MODE CONTROLS */}
            {activeTab === 'neonPattern' && (
              <>
                <div className="bg-[#1e1e1e] rounded-xl px-3 py-3">
                  <DirectionPad
                    label="Dot Direction"
                    direction={direction}
                    onChange={setDirection}
                  />
                </div>

                <div className="bg-[#1e1e1e] rounded-xl px-3 py-3">
                  <Slider
                    label="Thickness"
                    min={0.5} max={5} step={0.1}
                    value={dotSize}
                    onChange={setDotSize}
                    formatValue={(v) => v.toFixed(1) + 'px'}
                  />
                  <div className="h-1.5"></div>
                  <Slider
                    label="Density"
                    min={10} max={60} step={2}
                    value={dotSpacing}
                    onChange={setDotSpacing}
                    formatValue={(v) => v + 'px'}
                  />
                </div>

                <div className="bg-[#1e1e1e] rounded-xl px-3 py-3">
                  <DirectionPad
                    label="Gradient Pos"
                    direction={gradientPos}
                    onChange={setGradientPos}
                    disabledDirs={['left', 'right']}
                  />
                </div>
              </>
            )}

            {/* ANIMATION TOGGLE */}
            <div className="bg-[#1e1e1e] rounded-xl px-3 py-1">
              <Switch
                label="Animate Effect"
                checked={isAnimated}
                onChange={setIsAnimated}
              />
            </div>

            {/* UPLOAD IMAGE */}
            <div className="bg-[#1e1e1e] rounded-xl px-3 py-3">
              <label className="text-[11px] font-semibold text-white mb-2 block">Upload Logo</label>
              <input
                type="file"
                accept="image/*,.svg"
                onChange={handleImageUpload}
                className="w-full text-[11px] text-[#666] file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-medium file:bg-[#282828] file:text-[#999] hover:file:bg-[#2e2e2e] cursor-pointer"
              />

              {uploadedImageObj && (
                <>
                  <div className="my-2 h-px bg-[#333]" />
                  <Slider
                    label="Image Scale"
                    min={0.1} max={3} step={0.1}
                    value={imageScale}
                    onChange={setImageScale}
                    formatValue={(v) => (v * 100).toFixed(0) + '%'}
                  />
                </>
              )}
            </div>

          </div>

          {/* EXPORT ACTIONS */}
          <div className="flex flex-col gap-1.5 px-3 pb-3">
            <button
              onClick={handleExportSVG}
              disabled={isRecording}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-[#1e1e1e] hover:bg-[#282828] text-[#999] rounded-xl transition-colors font-medium text-[12px] disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export SVG
            </button>
            <button
              onClick={handleExportVideo}
              disabled={isRecording}
              className={`flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl transition-all font-bold text-[12px] disabled:cursor-not-allowed ${isRecording
                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                : 'bg-[#00FF48] text-[#181818] hover:bg-[#00FF48]/90'
                }`}
            >
              {isRecording ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Recording...
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5" />
                  Export Video (MP4)
                </>
              )}
            </button>
          </div>
          </div>
        </div>

        {/* CANVAS RENDERING AREA */}
        {/* CANVAS PREVIEW */}
        <div
          className="flex-1 relative flex flex-col p-8 items-center justify-center bg-[#131413] overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div ref={containerRef} className="relative shadow-2xl rounded-sm overflow-hidden" style={{ aspectRatio: `${FORMATS[format].width} / ${FORMATS[format].height}`, maxHeight: '100%', maxWidth: '100%' }}>
            <canvas
              ref={canvasRef}
              className="block transition-all"
            />
          </div>
        </div>

      </div>
    </>
  );
}
