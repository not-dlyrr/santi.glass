# SegmentedControl

Two to five mutually exclusive views with a sliding `seg-selected` thumb on a `fill-tertiary` pill.

**Consumer provides:** `options` (short strings, one word each where possible), and `value` + `onChange` or `defaultValue`.

- Switches the view in place. It is not navigation and not a form field.
- Labels in `footnote` size, title case, no icons mixed with text.
- Segments share width equally; keep labels similar in length.
