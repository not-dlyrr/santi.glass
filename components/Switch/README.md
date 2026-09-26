# Switch

A 51 by 31 on/off toggle with a spring-loaded white knob.

**Consumer provides:** `label` (or `aria-label` when the label lives elsewhere, such as a ListRow title), and either `checked` + `onChange` or `defaultChecked`.

- Takes effect immediately. If the change needs a save step, use a checkbox pattern instead.
- `switch-on` green is below 3:1 on white: the knob position is the real signal. Never recolor it to mean anything else.
- Inside a list, pass it as the ListRow `accessory` with `aria-label` matching the row title.
