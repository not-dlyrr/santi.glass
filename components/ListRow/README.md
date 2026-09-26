# ListRow

One row in a List: optional icon square, title, subtitle, trailing detail and an accessory.

**Consumer provides:** `title`; optional `subtitle`, `detail` (current value, in `label-secondary`), `icon` (an icon name or node), `iconColor` (a token such as `var(--wall-indigo)`), `accessory` (`chevron` by default, `none`, or a node like a Switch) and `onClick`.

- Rows that navigate get the chevron and `onClick`. Rows holding a Switch get `accessory` and no `onClick`.
- Icon squares use `accent`, `wall-blue`, `wall-indigo`, `wall-pink`, `danger` or `success-text`. Never `wall-yellow` or `wall-teal` (white glyph fails contrast).
- Minimum height `space-11`; titles never wrap past two lines.
