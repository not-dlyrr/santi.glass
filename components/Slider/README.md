# Slider

A continuous value: `accent` filled track, `fill-secondary` remainder, white 28px thumb with `shadow-knob`.

**Consumer provides:** `min`, `max`, `step`, `value` + `onChange` (or `defaultValue`), an `aria-label`, and optional `minIcon` / `maxIcon` glyphs that explain the ends (sun small and large, speaker quiet and loud).

- Use for values where the exact number does not matter (volume, brightness). Show a number next to it if it does.
- Keep the track at least 220px wide.
