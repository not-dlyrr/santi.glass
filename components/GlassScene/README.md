# GlassScene

A backdrop rendered on the GPU, with a shader lens under every glass element inside it: per-pixel refraction through the rounded rim, true RGB dispersion, frost, and a highlight that follows the pointer. It uses WebGPU (WGSL) when available, WebGL2 (GLSL) otherwise, and falls back to the SVG lens or blur if neither exists.

**Consumer provides:** `backdrop` (an image URL, `<img>`, `<video>`, `<canvas>` or `ImageBitmap`), a size for the scene (`style` or `className`), and glass components as children, usually absolutely positioned. Optional: `live` (re-upload the backdrop every frame for video and animated canvas), `fit` (`cover` by default, or `fill`), `engine: 'webgl2'` to skip WebGPU, and `onEngine(kind)` to learn which engine is running (`webgpu`, `webgl2` or `none`).

- Use it where the backdrop is known: now-playing art, a photo header, a wallpaper, a map snapshot. For glass over ordinary scrolling UI, use the components on their own; they use the SVG lens.
- The shader refracts the backdrop only. Don't place glass over other HTML inside the scene; that content shows through unrefracted.
- Up to 16 glass elements are refracted per scene.
- Lens parameters come from the `lens-*` tokens, the same ones the SVG lens reads.
- Liquid Glass off, or reduced transparency: the scene still draws its backdrop, and the glass goes solid like everywhere else.
- Remote images need CORS. In Tauri, load local files through the asset protocol.
