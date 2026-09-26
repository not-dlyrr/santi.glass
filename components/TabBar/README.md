# TabBar

A floating glass pill holding two to five top-level destinations; the active one gets a `glass-selection` pill and `accent-text`.

**Consumer provides:** `items` (`{id, label, icon}`), `value` + `onChange` or `defaultValue`.

- Floats `space-4` above the bottom safe area, centered; content scrolls underneath it.
- Labels are one word in `caption-2`. Icons are 24px line glyphs.
- Navigation only; never put actions (compose, share) in the tab bar. Use a glass Button beside it.
