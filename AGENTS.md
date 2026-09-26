# AGENTS.md

Working notes for coding agents in this repo. Humans start at [README.md](README.md).

santi.glass is a design system: tokens, a hand-written React component bundle, and a liquid glass engine (an SVG lens plus WebGPU / WebGL2 shaders). There's no package manager, no bundler and no test suite. What's in the repo is what ships.

## Before you change anything

- UI or styling: read [GUIDELINES.md](GUIDELINES.md) first. It's the design contract (one accent, pills, contrast floors, no emoji, the 11px type floor, glass rules). Components must follow it.
- Desktop or window-glass behavior: read [docs/tauri.md](docs/tauri.md) and [docs/desktop.md](docs/desktop.md).

## Files and who owns them

| Path | Rule |
| --- | --- |
| `tokens.json` | Source of truth for every token and for `type.fonts`. Every family except `type` is `{"tokens":[{"name","value","usage"}]}`, a list, never a DTCG map. Every token has a `usage`. |
| `tokens.css` | Generated. Run `node scripts/build-tokens.mjs` after any `tokens.json` change and commit both. Never edit by hand. |
| `components/bundle.js` | Hand-written ES5 in one IIFE that assigns `window.SantiGlass`. See the bundle rules below. |
| `components/bundle.css` | Component styles. Values come from tokens (`var(--…)`), never raw hex. |
| `components/index.d.ts` | Types as documentation. Update it with every public API change. |
| `components/<Comp>/README.md` | Usage guidelines; the first sentence is the summary. |
| `components/<Comp>/preview.html` | Line 1 is the `<!-- @dsCard … -->` marker. The design-system viewer preloads tokens, CSS, React and the bundle, so previews don't load them. |
| `fonts/` | Latin-subset woff2 files, listed in `tokens.json` `type.fonts`. |

## Bundle rules

- ES5 style like the rest of the file: `var`, `function`, `React.createElement` as `h`. No JSX, `import`, `eval`, `new Function`, or network calls.
- Never write a literal `</script` or `<!--` in it; consumers inline the bundle.
- React and ReactDOM come from `window`. No other runtime dependency.
- A new component goes in three places: the `@ds-bundle` header on line 1, the export object at the bottom, and `index.d.ts`.
- Keep the old names working when you rename an export (see `syncTauriWindowGlass`).

## The glass engine

- The optics live three times: in JS (`slopeAt`, `bend`, `buildMaps`), in WGSL and in GLSL. They must stay identical, so a change to one means changing all three.
- Lens parameters come from the `lens-*` tokens through `readLensTokens`. Don't hard-code them.
- Each refracting element gets a child `.sg-lens-layer` that carries the filter. Never put a `box-shadow` on that layer.
- Desktop shells keep windows open for hours. Keep work off the per-frame path, keep caches bounded, and don't draw anything nobody can see. [docs/desktop.md](docs/desktop.md) lists what the engine already does.
- Window glass goes through `syncWindowGlass`. It resolves `opts.set`, then Tauri `invoke`, then `window.santiGlassHost.setWindowGlass`. New shells plug into that contract instead of getting their own function.

## Fonts

Sources: `Downloads/San-Francisco-Pro-Fonts-master` (variable `SF-Pro.ttf` / `SF-Pro-Italic.ttf`) and `Downloads/San-Francisco-family-master/.../SF Rounded`, `SF Mono`. To regenerate one file:

```bash
python -m fontTools.subset SOURCE.otf --output-file=fonts/NAME.woff2 --flavor=woff2 --layout-features='*' \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-2199,U+2212,U+2215,U+FEFF,U+FFFD"
```

Keep `type.fonts` at 40 entries or fewer; the design-system viewer drops the rest. That limit is why SF Pro ships as the variable font.

## The published copy

The design system is also published as a claude.ai Design System artifact, which mirrors this repo under `project/`:

- `project/README.md` is `GUIDELINES.md` without its `# Design guidelines` heading
- `project/tokens.json`, `project/fonts/**` and `project/components/**` are the same files

After changing any of those here, update the artifact too, or say that it's now behind.

## Checks before committing

```bash
node --check components/bundle.js
node scripts/build-tokens.mjs
```

Then look at the change in a Chromium engine (the lens path, `data-lens="refract"`). Look at WebKit or Firefox too if the change touches the blur fallback. There are no automated tests, so describe what you checked in the commit message.
