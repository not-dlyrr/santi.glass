# Using santi.glass in a Tauri app

Tauri gives you two layers of glass to work with:

1. **The window itself.** The native OS material shows through a transparent webview: real Liquid Glass on macOS 26, vibrancy on older macOS, Mica or Acrylic on Windows.
2. **Glass inside the page.** The SVG lens, or a `GlassScene` running a WebGPU / WebGL2 shader, refracts what's inside your UI.

Both follow the same Liquid Glass toggle, so turning it off in your settings makes the window and the UI solid together.

## What each platform gets

| Platform | Webview | Window material | In-page lens |
| --- | --- | --- | --- |
| Windows 11 | WebView2 (Chromium) | Mica | SVG lens everywhere, WebGPU in `GlassScene` |
| Windows 10 | WebView2 (Chromium) | Acrylic | SVG lens everywhere, WebGPU in `GlassScene` |
| macOS 26+ | WKWebView | Liquid Glass (`NSGlassEffectView`) | Frosted blur, WebGPU in `GlassScene` if the webview exposes it, else WebGL2 |
| macOS 13 to 15 | WKWebView | Vibrancy | Frosted blur, WebGL2 in `GlassScene` |
| Linux | WebKitGTK | none (stays solid) | Frosted blur, WebGL2 in `GlassScene` |

Everything is feature-detected at runtime, so you don't branch on platform yourself. `GlassScene` reports the engine it picked through `onEngine` and the `data-engine` attribute.

## 1. Rust side

`src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri = { version = "2", features = ["macos-private-api"] }
window-vibrancy = "0.8"
```

`src-tauri/tauri.conf.json` (only the parts that matter here):

```json
{
  "app": {
    "macOSPrivateApi": true,
    "windows": [
      {
        "label": "main",
        "title": "My App",
        "width": 1000,
        "height": 700,
        "transparent": true
      }
    ]
  }
}
```

`src-tauri/src/lib.rs`:

```rust
use tauri::{Manager, WebviewWindow};

/// Applies or clears the native window material behind the webview.
/// macOS 26+: Liquid Glass. Older macOS: vibrancy.
/// Windows 11: Mica. Windows 10: Acrylic. Linux: unsupported (the page stays solid).
fn set_window_glass(window: &WebviewWindow, on: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use window_vibrancy::{
            apply_liquid_glass, apply_vibrancy, clear_liquid_glass, clear_vibrancy,
            LiquidGlassOptions, NSGlassEffectViewStyle, NSVisualEffectMaterial,
        };
        if on {
            let glass = apply_liquid_glass(window, LiquidGlassOptions::new(NSGlassEffectViewStyle::Regular));
            if glass.is_err() {
                apply_vibrancy(window, NSVisualEffectMaterial::UnderWindowBackground, None, None)
                    .map_err(|e| e.to_string())?;
            }
        } else {
            let _ = clear_liquid_glass(window);
            let _ = clear_vibrancy(window);
        }
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        use window_vibrancy::{apply_acrylic, apply_mica, clear_acrylic, clear_mica};
        if on {
            if apply_mica(window, None).is_err() {
                apply_acrylic(window, Some((18, 18, 18, 125))).map_err(|e| e.to_string())?;
            }
        } else {
            let _ = clear_mica(window);
            let _ = clear_acrylic(window);
        }
        return Ok(());
    }

    #[allow(unreachable_code)]
    {
        let _ = (window, on);
        Err("window glass is not supported on this platform".into())
    }
}

// Keep this command synchronous (no `async`). Tauri runs sync commands on the
// main thread, which AppKit requires for the macOS effects.
#[tauri::command]
fn set_liquid_glass(window: WebviewWindow, on: bool) -> Result<(), String> {
    set_window_glass(&window, on)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").expect("main window");
            // start with glass on; the page corrects it right away if the
            // person turned Liquid Glass off last time
            let _ = set_window_glass(&window, true);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![set_liquid_glass])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 2. Page side

Wrap your app in `sg-window` and hook the toggle up to the command once at startup:

```html
<body>
  <div id="app" class="sg-window"></div>
</body>
```

```js
// runs set_liquid_glass now and every time the toggle changes
SantiGlass.syncTauriWindowGlass();
```

`syncTauriWindowGlass` finds Tauri's `invoke` on its own. If you'd rather pass it in, or you renamed the command:

```js
import { invoke } from '@tauri-apps/api/core';
SantiGlass.syncTauriWindowGlass({ invoke, command: 'set_liquid_glass' });
```

When the Rust side succeeds, `<html data-window-glass>` is set and `sg-window` turns transparent, so the native material shows through. If it fails (Linux, or glass turned off), the attribute comes off and the window keeps its solid `surface-grouped` background.

## 3. Shader glass with GlassScene

The GPU lens can only refract something it can see, so a `GlassScene` owns its backdrop: an image URL, an `<img>`, a `<video>` or a `<canvas>`. Every glass component inside it switches to the shader automatically.

```js
const { GlassScene, GlassCard, TabBar } = SantiGlass;

h(GlassScene, { backdrop: albumArtUrl, style: { height: 420 } },
  h(GlassCard, { style: { position: 'absolute', left: 24, bottom: 24 } }, 'Now Playing'),
  h(TabBar, { items: tabs })
);
```

- Pass `live: true` for `<video>` or an animated `<canvas>`, so the texture is re-uploaded every frame.
- Force WebGL2 with `engine: 'webgl2'` if a driver misbehaves with WebGPU.
- Up to 16 glass elements per scene are refracted. Extras keep their tint without the lens.
- The shader refracts the backdrop, not DOM content inside the scene. Float glass over the backdrop itself, not over other HTML.

Remote images need CORS headers (or use Tauri's asset protocol via `convertFileSrc`), otherwise the GPU can't read them.
