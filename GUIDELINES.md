# Design guidelines

An Apple-inspired system for santi's apps: liquid glass floating over color, soft continuous corners, one blue, and motion that feels physical. It is inspired by iOS conventions, not a copy of Apple's UI. It is set in SF Pro, bundled as web fonts, and ships no Apple icons or artwork.

## Principles

- **Content first, chrome floats.** Navigation, tab bars, toolbars and controls are Liquid Glass layered over content (opaque when the person turns Liquid Glass off). Content itself sits on solid `surface` and `surface-grouped`.
- **One accent.** `accent` is the only brand hue in the interface. The `wall-*` colors exist for wallpapers, artwork and icon squares, never for text or controls.
- **Soft, concentric geometry.** Everything interactive is a pill (`radius-pill`). Containers use `radius-lg` or `radius-xl`, and anything nested inside a rounded container uses the next radius down so corners stay concentric.
- **Calm.** No pulsing or glowing "live" dots, no gradients on UI, no decorative emoji. State changes are shown by position, weight and a word.

## Content fundamentals

- Title case for navigation titles, buttons, tabs, list headers and segment labels ("Add Device", "Privacy & Security"). Sentence case for footers, descriptions and alerts ("Known networks join automatically.").
- Address the person as "you" only when necessary; prefer naming the thing ("Wi-Fi is off") over narrating ("You have turned off Wi-Fi").
- Short. Buttons are one to three words, verbs first. Footers are one or two sentences.
- No emoji in UI copy. No exclamation marks outside of a genuine celebration.
- Placeholders name what is searched: "Search Settings", never "Search...".

## Color

- Page ground is `surface-grouped`; sections and cards on it are `surface`; things that float in dark mode are `surface-elevated`.
- Text is `label`; secondary text (subtitles, row values, list headers and footers, placeholders) is `label-secondary`. Both hold 4.5:1 or better on every surface and on `glass-fill-strong` in both themes.
- Blue as a fill is `accent` with `on-accent` text. Blue as text (links, plain and tinted buttons, the active tab) is `accent-text`. Tinted buttons put `accent-text` on `accent-tint`.
- Destructive: `danger` fill with `on-accent`, or `danger-text` for text-only actions. Warnings use `warning-text`; success uses `success-text`. Every status also carries a word or glyph, never color alone.
- `switch-on` is below 3:1 on white by design; the switch knob position carries the state.
- Focus is a 2px solid `focus-ring` outline, offset 2px (inset 2px inside rows and tabs). It holds 3:1 or better on every surface in both themes.

## Liquid Glass

Liquid Glass is a system-wide setting, **on by default**, and every app built on santi.glass must expose it.

- Ship `GlassToggle` in Settings under "Appearance" (see its guidelines). It flips `<html data-glass="on|off">` and persists the choice. Read it with `useLiquidGlass()`, and set it with `setLiquidGlass(bool)`.
- It starts off only when the OS asks for reduced transparency.
- **On, where refraction is supported** (Chromium: Chrome, Edge, Electron, WebView2 / Tauri on Windows; `<html data-lens="refract">`): each glass surface gets a live lens. A displacement map is computed per element from a squircle bezel profile and Snell's law (`lens-bezel`, `lens-depth`, `lens-ior`), so content under the rim bends and compresses. The red and blue channels are displaced apart for dispersion (`lens-aberration`), and a specular rim is lit from the top left with a softer bounce bottom right (`lens-specular`). The center stays nearly clear under `lens-frost`, or `lens-frost-strong` on text-bearing glass. The tint on top is `glass-tint`, or `glass-tint-strong`. Hovering adds a pointer-following `glass-sheen`.
- **On, where refraction is unsupported** (Safari / WKWebView, Firefox; `data-lens="blur"`): the same surfaces fall back to `glass-fill` or `glass-fill-strong` with `blur-glass` and `saturate(180%)`, a 0.5px `glass-stroke` rim and `shadow-glass` plus `shadow-glass-edge`.
- **On, inside a `GlassScene`:** glass refracts the scene's own backdrop (image, video or canvas) with a GPU shader: WebGPU (WGSL) first, WebGL2 (GLSL) second. It's the same optics and the same `lens-*` tokens, computed per pixel with true RGB dispersion and a pointer-following highlight. Use it only where the backdrop is known (album art, photo headers, wallpapers). Never float scene glass over other HTML inside the scene.
- **Desktop windows (Tauri, Electron, other webview shells):** the native window material follows the same switch. It's Liquid Glass on macOS 26 (Tauri), vibrancy on older macOS and in Electron, and Mica (or Acrylic in Tauri on Windows 10) on Windows. Wrap the app in `sg-window` and call `syncWindowGlass()` once. The setup is in `docs/tauri.md` and `docs/desktop.md`.
- **Off:** every glass surface becomes opaque `surface-elevated` with a 0.5px `separator` rim and `shadow-solid`. Layouts must work identically in both states. Never rely on the glass to separate layers; spacing and the shadow do that.
- Glass only floats over something: imagery, `wall-*` color, or scrolling content. Over flat `surface-grouped`, use `surface` instead.
- Never put glass on glass. Inside a glass panel, use plain content or a `surface` card.
- Text smaller than 17px only goes on strong glass (`strength="strong"`, tab bars, search fields, glass lists). Regular glass carries only large type and glyphs.
- Custom glass elements add the `sg-glass` class and call `useLens(ref, { strong })`. Never put a box-shadow on the refracting layer itself. The engine refracts through a child layer so the element can keep its shadow.
- Honor `prefers-reduced-transparency`: glass falls back to the opaque look (bundle.css does this).

## Typography

- The typeface is SF Pro. The stacks lead with `-apple-system` and `BlinkMacSystemFont`, which resolve to SF Pro with optical sizing on macOS and iOS. Next come the installed families "SF Pro Display", "SF Pro Text", "SF Pro Rounded", "SF Mono" and the variable "SF Pro", so any machine with Apple's SF fonts installed renders SF Pro too.
- Everywhere else, the bundled web fonts take over, declared with `@font-face` in tokens.css. SF Pro is the variable font (weights 1 to 1000, with italic), registered as "SF Pro Text", "SF Pro Display" and "SF Pro". Its optical-size axis picks the Text or Display cut from the font size. SF Pro Rounded ships 100 to 900 (Apple makes no italic), and SF Mono ships 300 to 800 with italics. Windows and Linux render all of it with no install.
- Use `display` family styles (`large-title`, `title-1`, `title-2`, `title-3`) at 20px and up, and `text` family styles (`headline` through `caption-2`) below that.
- One `large-title` per screen. Body copy and row titles are `body`; button labels and emphasized rows are `headline`.
- Tracking is part of the style: tighten slightly at text sizes and open slightly at display sizes, exactly as the tokens specify.
- Big glanceable numbers (weather, stats, timers) use `numeral` in the rounded family.
- `caption-2` (11px) is the floor. Nothing smaller.

## Spacing and layout

- Side margins are `space-4`; inset lists sit `space-4` from the screen edge (`space-5` on wide layouts).
- Every hit target is at least `space-11` (44px) tall.
- Section gap `space-6`; unrelated groups `space-8`.
- Row padding is 11px vertical and `space-4` horizontal; icon squares are 29px with `radius-xs`, `space-3` from the title.
- Hairlines are 0.5px `separator`, inset to the text column.

## Radii

`radius-xs` icon squares; `radius-sm` chips and small fields; `radius-md` thumbnails and nested cards; `radius-lg` list sections and glass cards; `radius-xl` sheets; `radius-pill` every button, field, segmented control, switch and tab bar.

## Motion

- Motion is springy, not linear. Use `cubic-bezier(0.3, 1.4, 0.5, 1)` for presses and knobs (about 0.35 to 0.4s), `cubic-bezier(0.3, 1.3, 0.5, 1)` for sliding selections (0.45s), and plain `ease` at 0.2 to 0.25s for color changes.
- Presses scale buttons to 0.96 and tabs to 0.94.
- Nothing loops, pulses or breathes.
- Honor `prefers-reduced-motion` by dropping transitions (bundle.css does this).

## Iconography

- On Apple platforms use SF Symbols (system-provided, not bundled here). Everywhere else use the bundle's `Icon`: 24px grid line glyphs, 1.8px stroke (2px at 18px and below), round caps and joins, drawn in `currentColor`. These are a generic substitute, not SF Symbols.
- Icons in tabs are 24px; in rows they sit white on a 29px color square (`accent`, `wall-blue`, `wall-indigo`, `wall-pink`, `danger`, `success-text` only).
- Icons never replace a label in tabs or buttons unless the meaning is universal (search, add, share) and an `aria-label` is set.

## States

- Pressed: scale down plus `fill-tertiary` behind rows.
- Disabled: 40% opacity, no press animation.
- Selected: `seg-selected` thumb in segmented controls, `glass-selection` pill plus `accent-text` in tab bars.
- Loading: a system spinner or skeleton in `fill-tertiary`; never a glowing dot.
