# Components

Inventory of reusable UI primitives currently inlined in `src/App.jsx`. Each will be extracted to `src/design-system/components/` as the system matures.

## Button

Primary action. Two visual variants today:

- **Secondary** — `bg: tabInactive`, `color: textMuted`, hover `bg: tabHover`. Used for `Download SVG`.
- **Primary** — light: `#161616` / white text · dark: `white` / black text. Used for `Download Video`.

Always pill-shaped: `radius.full`. Padding `px-4 py-2`. Font `text-[12px]`.

## IconButton

Circular, 36×36, no label. Used in segmented theme switcher (System/Light/Dark) and the modal close (×). Hover bg = `tabHover`.

## Tooltip

Floating label on hover. Bg `tab-hover`, text `text-primary`. Pill shape. Auto-shows on `group-hover`.

## Toggle

Pill switch, 36×18. `bg-[var(--accent)]` when checked, `bg-[var(--slider-track)] opacity-60` when off. Knob is `bg-[var(--accent-inverse)]` when checked.

## Slider

Native range with custom track. Active: `var(--accent)`. Track: `var(--slider-track)`. Thumb: 14×14 circle, `var(--accent)`.

## DirectionPad

Compound control: 4 pills around a crosshair inside a `bg-[var(--tab-active)]` rounded box. Active pill `var(--accent)`. Inactive `var(--accent)` at 25% opacity.

## Segmented Control

Pill container holding 2+ tabs. Active = `tabActive`, inactive transparent + hover `tabHover`. Used for theme switcher and format presets.

## Modal

Backdrop: `rgba(0,0,0,0.45)` + `backdropFilter: blur(12px)`. Container: `bg = modalBg`, `radius.xl`, `p-8`. Open: opacity 0→1 + scale 0.96→1 in 200ms. Close: inverse, then unmount at 220ms.

## Panel (TabPanel)

Side-docked panel, 280px wide, vertically auto-centered. Opens with `tab-fade-in-left` (200ms, `motion.easing`). Slides 16px left on close. Re-mounts on `activeTab` change (animation re-fires).

## Sections

`bg-[var(--sec-bg)]` blocks inside the panel. Radius 16px, padding 12px, border `var(--border)`.

## Tabs (Icon Rail)

Vertical rail at left of canvas. Each tab is a 48×48 circular button. Active: light `#161616`+white icon / dark `#FFFFFF`+black icon.

---

## Status

Extracted to `components/`:

- ✅ Tooltip
- ✅ Slider
- ✅ Switch
- ✅ DirectionPad
- ✅ Button (primary / secondary)
- ✅ Modal (fade + scale, backdrop blur)
- ✅ Section
- ✅ SegmentedControl

All have JSDoc types and Storybook stories with the light/dark theme toolbar.

## Open work

- Migrate component props to TypeScript.
- Adopt new primitives inside `App.jsx` incrementally (Button + Modal + Section are drop-in candidates).
- Visual regression (Chromatic / Playwright + screenshot diff).
- ESLint rule rejecting raw hex colors inside `components/` to enforce token usage.
