<div align="center">

# santi.glass

A small, Apple-flavored design system for my apps.<br>
Liquid glass that actually refracts, soft pill-shaped controls, SF Pro, and one blue.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/preview-dark.png">
  <img alt="santi.glass components floating over colored circles: a weather card, a search field, a Liquid Glass switch, a tab bar and a button" src="docs/preview-light.png" width="100%">
</picture>

</div>

## Why

I wanted my apps (santi.pass, santi.notes, and whatever comes next) to feel like they belong on a Mac or an iPhone, without copying Apple's UI piece by piece. So this repo holds the shared stuff: colors, type, spacing, a handful of React components, and a glass effect that goes past a plain `backdrop-filter: blur()`.

## What's in the box

- **Tokens** for color (light and dark), type, spacing, radii, shadows and the glass lens, all in one [`tokens.json`](tokens.json).
- **11 React components**: `Button`, `GlassCard`, `GlassToggle`, `Switch`, `SegmentedControl`, `Slider`, `SearchField`, `List`, `ListRow`, `TabBar` and `Icon`.
- **A liquid glass engine.** The edge of every glass surface bends whatever is behind it, splits it slightly into color, and catches a highlight. It's calculated per element instead of faked with a gradient.
- **A system-wide toggle** so people can turn the glass off. It's on by default.

## Quick start

There's no npm package yet, so you copy the files in. You need React 18.

```html
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components/bundle.css">

<script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="components/bundle.js"></script>
```

Everything lives on `window.SantiGlass`:

```js
const { TabBar, GlassCard, Button } = window.SantiGlass;
const h = React.createElement;

ReactDOM.createRoot(document.getElementById('app')).render(
  h(TabBar, {
    defaultValue: 'home',
    items: [
      { id: 'home', label: 'Home', icon: 'house' },
      { id: 'search', label: 'Search', icon: 'search' },
      { id: 'profile', label: 'Profile', icon: 'person' },
    ],
  })
);
```

Types are in [`components/index.d.ts`](components/index.d.ts) if you want autocomplete.

### Themes

Dark mode follows the OS. To force one, set `data-theme` on `<html>`:

```html
<html data-theme="dark">
```

### Changing tokens

Edit `tokens.json`, then rebuild the CSS:

```sh
node scripts/build-tokens.mjs
```

## Liquid glass

Glass is a setting, not a style you opt into per screen. It starts on, and every app that uses this system should ship the switch for it (put `GlassToggle` in your Appearance settings).

```js
const { useLiquidGlass, setLiquidGlass } = window.SantiGlass;

// in a component
const [glassOn, setGlass] = useLiquidGlass();

// anywhere else, e.g. when loading saved settings
setLiquidGlass(false);
```

When it's off, every glass surface turns into a solid panel with a thin border. Nothing moves around, so layouts work either way. It also starts off if the OS has "Reduce transparency" turned on.

**How the lensing works:** for each glass element, the engine builds a displacement map from a rounded bezel profile and Snell's law, then runs it through an SVG filter as a `backdrop-filter`. The red and blue channels get displaced a little more and a little less than green, which gives the color fringe at the edge. A second map adds the rim highlight. You can tune all of it with the `lens-*` tokens (bezel width, depth, index of refraction, aberration, frost, highlight, saturation).

To put glass on your own element, give it the `sg-glass` class and call the hook:

```js
const ref = React.useRef(null);
SantiGlass.useLens(ref, { strong: true }); // strong = more frost, for small text
```

### Browser support

| Engine | What you get |
| --- | --- |
| Chromium (Chrome, Edge, Electron, Tauri on Windows) | Full refraction, color fringe and highlight |
| Safari, WKWebView (Tauri on macOS), Firefox | Blurred frosted glass, since they don't support SVG filters in `backdrop-filter` |
| Glass turned off | Solid surfaces everywhere |

You can check which one you got with `SantiGlass.lensSupported`, or the `data-lens` attribute on `<html>` (`refract` or `blur`).

## Fonts

The type stacks ask for the system font first, which is SF Pro on macOS and iOS. On Windows and Linux they'll pick up SF Pro if you've installed it from [Apple's fonts page](https://developer.apple.com/fonts/), and fall back to Segoe UI otherwise.

The font files aren't in this repo because Apple's license doesn't allow redistributing them.

## Icons

On Apple platforms, use SF Symbols. Everywhere else, `Icon` covers the basics with simple line glyphs drawn on a 24px grid. They're generic stand-ins, not SF Symbols.

## Project layout

```
tokens.json               source of truth for every token
tokens.css                generated, don't edit by hand
scripts/build-tokens.mjs  tokens.json -> tokens.css
components/
  bundle.js               all components + the glass engine
  bundle.css              component styles
  index.d.ts              types
  <Component>/README.md   when and how to use each component
  <Component>/preview.html  live preview
GUIDELINES.md             the full design rules (color, type, glass, motion...)
```

If you're building a screen, read [GUIDELINES.md](GUIDELINES.md) first. It covers the stuff the components don't enforce: when to use glass, which colors go where, copy tone, spacing and motion.
