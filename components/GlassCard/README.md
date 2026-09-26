# GlassCard

A floating Liquid Glass panel. With the setting on, its rim refracts what is behind it (a curved-bezel lens with dispersion and a specular highlight); with it off, it is an opaque `surface-elevated` card.

**Consumer provides:** children and a background with something behind it worth bending (imagery, `wall-*` color, scrolling content). Over flat `surface-grouped` the lens has nothing to show: use `surface` there instead.

- Use `strength="strong"` when the card carries text smaller than 17px. Strong glass frosts its center with `lens-frost-strong` and tints with `glass-tint-strong`, so text stays legible.
- Corners are `radius-lg`; nested content inside uses `radius-md` so corners stay concentric. The lens follows the element's own border radius.
- Never stack glass on glass. A card inside a glass panel is a `surface` card or plain content.
- Pad with `space-4`.
- Custom glass elements: add `sg-glass` and call `SantiGlass.useLens(ref, { strong })` to get the same refraction.
