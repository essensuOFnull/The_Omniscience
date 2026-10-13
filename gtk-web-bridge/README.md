# gtk-web-bridge

Streams GTK4 render trees into an Electron + React + MUI window.

## Quick start

    npm install
    npm run dev

A window opens showing a live, animated mock "GTK app" rendered entirely
with MUI components. This proves the protocol + renderer pipeline.

## Real GTK capture

    USE_REAL_GTK=1 npm run dev

Currently throws (see `src/main/gtk-bridge/gtk-capture.js` for the roadmap).
Requires `node-gtk` and GTK 4.22+.

## Protocol (v0)

Each frame is a JSON message:

    {
      "type": "render_frame",
      "frame": 123,
      "width": 1024,
      "height": 720,
      "nodes": [
        { "id": "bg",  "type": "rect",  "bounds": {"x":0,"y":0,"w":1024,"h":720}, "color": "#1e1e2e", "radius": 0 },
        { "id": "t1",  "type": "text",  "bounds": {"x":20,"y":20,"w":200,"h":24}, "text": "Hi", "color": "#fff", "size": 14, "align": "left" },
        { "id": "ic1", "type": "image", "bounds": {"x":20,"y":60,"w":24,"h":24}, "src": "icon:Folder", "color": "#89b4fa" }
      ]
    }

- `rect`  → MUI `<Box>` with background-color + border-radius
- `text`  → MUI `<Box>` styled as text (position absolute)
- `image` → MUI icon (if `icon:Name`) or `<img>` (data URI / URL)

## Architecture

    GTK app ──► GskRenderNode tree ──► gtk-capture.js ──► ws-server ──► useGtkStream ──► Renderer ──► MUI

## Next steps

1. Implement `gtk-capture.js` (walk the GskRenderNode tree).
2. Add `border`, `shadow`, `gradient` node types to the protocol.
3. Map GTK widget names → semantic MUI components (Button, Card, etc).
4. Wire theme tokens from your DE's theme engine into `src/renderer/theme.js`.