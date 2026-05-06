# Neon Theme Creator

A browser-based generator for animated neon backgrounds. Compose a gradient backdrop, drop in a logo, and export as SVG or MP4 — all client-side.

## Features

- **Three modes** — Pattern (dot grid + gradient orb), Spectrum (9 columns), Waves (17-column radial fan)
- **Three formats** — Post (1080×1350), Story (1080×1920), Desktop (1920×1080)
- **Three themes** — Neon, Prism, Acid
- **Logo overlay** with scale control
- **Cursor-reactive** gradient
- **Export** — vector SVG, or 15 s MP4 at 30 fps via [WebCodecs](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API) + [`mp4-muxer`](https://github.com/Vanilagy/mp4-muxer) (no server)

## Stack

React 19 · Vite · Tailwind · Canvas 2D · WebCodecs

## Getting started

```bash
npm install
npm run dev
```

| Command | |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Build to `dist/` |
| `npm run preview` | Serve the build |
| `npm run lint` | Run ESLint |

## Browser support

MP4 export requires WebCodecs `VideoEncoder`: Chrome/Edge 94+, Safari 16.4+. SVG export and preview work everywhere modern.
