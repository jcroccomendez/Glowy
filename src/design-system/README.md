# Glowy Design System

Single source of truth for Glowy's visual language. Tokens here drive the runtime UI in `src/App.jsx`.

## Structure

```
design-system/
├── README.md       — this file
├── tokens.js       — JS export of tokens (for runtime use)
├── tokens.css      — CSS custom properties (for stylesheets / Tailwind arbitrary values)
└── components.md   — catalog of UI primitives (Button, Toggle, Slider, etc.)
```

## Themes

Two themes: `light` and `dark`. Plus `system` which follows `prefers-color-scheme`. The app switches by writing CSS vars onto the `.app-themed` root.

## Tokens

| Group | Tokens |
| --- | --- |
| **Surfaces** | `appBg`, `panelBg`, `sectionBg`, `modalBg` |
| **Tabs** | `tabInactive`, `tabHover`, `tabActive`, `tabActiveText` |
| **Text** | `textPrimary`, `textMuted`, `textSubtle` |
| **Lines** | `border`, `sliderTrack` |
| **Accents** | `accent`, `accentInverse` |
| **Radius** | `sm 8`, `md 12`, `lg 16`, `xl 20`, `full` |
| **Spacing** | `xs 4`, `sm 8`, `md 12`, `lg 16`, `xl 24` |
| **Motion** | `duration.fast 150`, `base 200`, `slow 320`, `easing` |

## Usage

### From JS

```js
import { getTokens, radius, motion } from './design-system/tokens';

const t = getTokens(isLight ? 'light' : 'dark');
<div style={{ backgroundColor: t.panelBg, borderRadius: radius.lg }} />
```

### From CSS / Tailwind

```css
.btn {
  background: var(--tab-inactive);
  border-radius: var(--radius-full);
  transition: background-color var(--duration-base) var(--easing);
}
```

```jsx
<div className="bg-[var(--panel-bg)] text-[var(--text-primary)] rounded-[16px]" />
```

## Adding a new token

1. Add it to both `light` and `dark` in `tokens.js`.
2. Mirror it in `tokens.css` under both `[data-theme='dark']` and `[data-theme='light']`.
3. Wire it through the `ui.*` object inside `App.jsx` so the runtime gets the value.
4. Document it under **Tokens** above.

Never hardcode a color in component code — always pull from tokens.

## Components

See [components.md](./components.md) for the catalog and prop API. Extracted primitives live under [`components/`](./components/) and are documented via Storybook (`npm run storybook`).

## Storybook

The system has Storybook stories per primitive and a Foundations/Tokens page that previews colors, radius, spacing, motion, and typography. A theme switcher in the Storybook toolbar toggles light/dark.

```bash
# one-time install (not bundled with the app)
npm i -D storybook @storybook/react-vite @storybook/addon-essentials @storybook/addon-themes @storybook/addon-a11y

npm run storybook        # dev at http://localhost:6006
npm run storybook:build  # static export to storybook-static/
```
