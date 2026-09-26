# GlassToggle

The system-wide Liquid Glass switch. Every app built on santi.glass ships it, and it is on by default.

**Consumer provides:** nothing required. Optional `label` (defaults to "Liquid Glass"; pass `null` when it sits in a ListRow whose title already says it) and `onChange` to mirror the setting into your own settings store.

- Place it in Settings under an "Appearance" section, as a ListRow with the `drop` icon on `wall-blue` and the footer "Turn off to use solid surfaces everywhere."
- It flips `<html data-glass>` between `on` and `off`. Off turns every glass surface into opaque `surface-elevated` with a `separator` rim and `shadow-solid`, and tears down the lens filters.
- The choice persists in localStorage (`santi.glass.liquid`) when storage is available. Apps with their own settings store call `SantiGlass.setLiquidGlass(value)` at startup instead.
- The default is on, except when the OS asks for reduced transparency: then it starts off, and the reduced-transparency CSS keeps surfaces opaque regardless.
- Read the state in React with `SantiGlass.useLiquidGlass()`, which returns `[on, set]`.
