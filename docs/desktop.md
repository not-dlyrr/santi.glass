# Using santi.glass in desktop apps

This covers Electron and any other shell that wraps a webview (WebView2 hosts, CEF, Wails, Neutralino). Tauri has its own guide in [tauri.md](tauri.md); the page side and the performance notes below apply to it too.

Desktop apps get two layers of glass:

1. **The window itself.** The OS material (vibrancy on macOS, Mica on Windows 11) shows through a transparent page.
2. **Glass inside the page.** The SVG lens, or a `GlassScene` shader, refracts your UI. This part needs nothing from the shell.

Both follow the Liquid Glass toggle.

## The contract

`SantiGlass.syncWindowGlass()` calls the native side now and every time the toggle changes. It finds the native side in this order:

1. `opts.set(on)`, if you pass it.
2. Tauri's `invoke`, calling the `set_liquid_glass` command.
3. `window.santiGlassHost.setWindowGlass(on)`, which a preload script or host object exposes.

When the call resolves, `<html data-window-glass>` is set and `sg-window` turns transparent. When it throws or rejects, the attribute comes off and the window stays solid. So an unsupported platform just throws.

## Electron

`preload.js`:

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('santiGlassHost', {
  setWindowGlass: (on) => ipcRenderer.invoke('santi-glass:window', !!on)
});
```

`main.js`:

```js
const { app, BrowserWindow, ipcMain } = require('electron');
const os = require('node:os');
const path = require('node:path');

// Mica needs Windows 11 22H2 (build 22621) or later
const hasMica = process.platform === 'win32' && Number(os.release().split('.')[2]) >= 22621;

function setWindowGlass(win, on) {
  if (process.platform === 'darwin') return win.setVibrancy(on ? 'under-window' : null);
  if (hasMica) return win.setBackgroundMaterial(on ? 'mica' : 'none');
  throw new Error('window glass is not supported on this platform');
}

ipcMain.handle('santi-glass:window', (event, on) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) setWindowGlass(win, on);
});

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    backgroundColor: '#00000000', // let the material show through the page
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
  });
  win.loadFile('index.html');
});
```

Page side, same as Tauri:

```html
<body>
  <div id="app" class="sg-window"></div>
</body>
```

```js
SantiGlass.syncWindowGlass();
```

Chromium draws the SVG lens, so Electron gets full refraction on every platform, plus WebGPU in `GlassScene`. `<html data-electron>` is set, and `SantiGlass.isElectron` is true.

## Other shells

Expose `window.santiGlassHost.setWindowGlass(on)` from the host, or hand the function over directly:

```js
// Wails
SantiGlass.syncWindowGlass({ set: (on) => window.go.main.App.SetWindowGlass(on) });

// WebView2 host object
SantiGlass.syncWindowGlass({ set: (on) => chrome.webview.hostObjects.glass.SetWindowGlass(on) });
```

Return a promise when the host call is async, so failures reach the page. A value that isn't a promise counts as success.

## Performance in long-running windows

The engine is tuned for windows that stay open for hours and get resized a lot:

- **Live resizing is cheap.** Building the lens for an element is per-pixel work plus two PNG encodes. While a window is being dragged, the lens stretches its current maps to the new size, then rebuilds them once the size holds still for about 160 ms. A toolbar that spans the window no longer rebuilds on every frame of a drag.
- **The lens cache is bounded.** It keeps the 24 most recent sizes, so resizing all day doesn't grow memory.
- **Hidden scenes stop working.** A `GlassScene` skips every layout read and draw while it's scrolled out of view or the window is hidden. That matters in Electron with `backgroundThrottling: false`, and in shells that keep a minimized window rendering.
- **GPU loss recovers.** Sleep and resume, a driver update, or a laptop switching GPUs can drop the WebGPU device or the WebGL2 context. The scene restarts on its own instead of going blank.
- **The OS transparency switch is live.** Turning off Windows "Transparency effects" or macOS "Reduce transparency" turns Liquid Glass off right away (and back on), unless the person already picked a side in `GlassToggle`.

What's left to you:

- Keep glass elements to what floats: bars, sheets, cards. Every refracting element is a live filter over what's behind it.
- Don't put more than 16 glass elements in one `GlassScene`; extras keep their tint without the lens.
- Leave hardware acceleration on. The lens filters and the shaders run on the GPU, and in software rendering they get slow.
