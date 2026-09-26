# Button

A pill-shaped action button in five variants: `filled`, `tinted`, `glass`, `plain`, `destructive`.

**Consumer provides:** a short label as children (one to three words, title case for app chrome), optional `icon`, `size`, and `onClick`.

- One `filled` button per view. It is the action the screen exists for.
- `tinted` for secondary actions on solid surfaces; `glass` for secondary actions floating over imagery or color.
- `plain` for tertiary actions and toolbar text buttons.
- `destructive` only for irreversible actions, and confirm first.
- Height never drops below `space-11` (44px) except `size="small"` inside dense toolbars.
- Presses scale to 0.96 on a spring; do not add hover color shifts on touch layouts.
