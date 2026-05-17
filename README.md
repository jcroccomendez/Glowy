# Glowy

Animated neon backdrops in your browser. Pick a tab, pick a theme, export as editable SVG or MP4 — all client-side.

## Features

- **Four tabs** — Pattern (dot grid + gradient orb), Spectrum (columns), Waves (radial fan), Pulse (concentric rings)
- **Three aspect-ratio presets** — Full Portrait 9:16 (1080×1920), Square 1:1 (1080×1080), Landscape 16:9 (1920×1080)
- **Three curated themes** — Neon, Prism, Acid
- **Random** — 20 brand-inspired palettes (Apple, Spotify, Instagram, Sunset, Aurora, Cyber, etc.) with a 4-color gradient and per-click HSL jitter
- **Light / Dark / System UI** — segmented switcher in the header, follows `prefers-color-scheme` and refreshes the loader, modals, and chrome on toggle
- **Per-tab controls** — shape count slider, dashed-lines toggle, noise toggle, animation toggle, dot direction/size/density, gradient position
- **Cursor-reactive** gradient + subtle 3D tilt on the canvas card
- **Export** — fully editable vector SVG (clip paths, feGaussianBlur, dashed paths), or 15 s MP4 at 30 fps via [WebCodecs](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API) + [`mp4-muxer`](https://github.com/Vanilagy/mp4-muxer) — no server
- **Share modal** — appears after every export with one-click Share to X / Facebook / LinkedIn (theme-aware, blurred backdrop, fade in/out)
- **UI sounds** via Kenney UI Audio + [`use-sound`](https://github.com/joshwcomeau/use-sound)
- **Performance** — RAF loops pause on `document.hidden`, idle tilt loops bail on convergence, noise canvas cached per format

## Stack

React 19 · Vite · Tailwind · Canvas 2D · WebCodecs · Phosphor Icons

## Install

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (`node -v`)
- npm 9+
- Git

### Steps

```bash
git clone https://github.com/your-username/glowy.git
cd glowy
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Build

```bash
npm run build      # outputs to dist/
npm run preview    # serves the build locally
```

### Scripts

| Command | |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Build to `dist/` |
| `npm run preview` | Serve the build |
| `npm run lint` | Run ESLint |

## Browser support

MP4 export needs WebCodecs `VideoEncoder`: Chrome/Edge 94+, Safari 16.4+. SVG export and preview work in every modern browser.
