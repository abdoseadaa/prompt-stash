# Developing Prompt Stash

## Build and install

```bash
npm install
npm run package          # -> build-extension/prompt-stash-<version>.vsix
npm run install:vscode   # or: npm run install:cursor
```

Then reload the editor.

| Script | Does |
|---|---|
| `npm run build` | Clean, compile the host, typecheck the webview, bundle it |
| `npm run watch` | `tsc --watch` on the extension host |
| `npm run watch:webview` | esbuild watch on the webview bundle |
| `npm run package` | Build, then produce the `.vsix` |
| `npm run icons` | Regenerate the PNG icon set |

`build` runs `clean` first on purpose. `tsc` does not remove output for a source file you
deleted, so without it a stale module keeps shipping inside the `.vsix` long after its
source is gone.

## Layout

Mirrors the `jisr` extension in this workspace — same host/webview split and message-router
pattern.

```
src/
  extension.ts                 provider + the three commands
  message-router.ts            SCREAMING_SNAKE message type -> handler map
  providers/                   WebviewViewProvider; CSP and localResourceRoots
  handlers/*.handler.ts        one file per message type
  storage/*.storage.ts         stashes.json, media files, settings
  utils/                       copy-text formatting, path resolution
webview/
  main.ts                      state + render loop, bundled by esbuild
  clipboard.bridge.ts          media ingest (paste/drop) and native image egress
  views/*.view.ts              header, list, card, attachment strip, preview, banners
```

## Things that will bite you

**Attachments live outside the extension folder.** `localResourceRoots` must include the
media directory and the CSP must allow `img-src` and `connect-src` from
`webview.cspSource`. A broken thumbnail almost always means one of those two was dropped.

**The webview is not authoritative about attachments.** `SAVE_STASH` and `COPY_STASH`
carry only `{ stashId, text }`. An earlier version sent whole stash snapshots, and a
debounced save that was composed before a paste landed would overwrite the attachment
record when its timer fired — leaving orphaned files on disk. Keep attachment mutations in
their own messages.

**Never gate state on an animation finishing.** An unfocused or hidden webview stops
Chromium advancing animation timelines, so `onfinish` may never arrive. `animateBody()`
settles on a timer for exactly this reason.

**`setPointerCapture` throws** when the pointer is not active. Apply visual state before
calling it, and wrap it.

**Chromium only accepts `image/png`** for an image `ClipboardItem` write — JPEG and WebP
are transcoded through a canvas first. The write also needs a focused document and can
still be refused, so the path-copy fallback is mandatory, not decorative.

**Everything must run on Windows, macOS and Linux.** Never derive a file name by
splitting a path on `/`, never turn a `file://` URI into a path by trimming the scheme
(`file:///C:/x` leaves a leading slash Windows cannot open) — hand it to
`resolveSource()`, which uses `Uri.parse`. `safeFileName()` enforces the Windows
character rules and reserved device names everywhere, so a store written on one OS still
opens on another, and it preserves non-ASCII names rather than flattening them. npm
scripts must be Node, not shell: `rm -rf` and `bash` do not exist on Windows.

**Icons are generated from code** (`npm run icons`) because this machine has no SVG
rasterizer. Edit `scripts/make-icons.js`, not the PNGs.

## Versioning

Per the workspace's `vscode-ext-versioning` rule: bump `version` in `package.json`, add a
matching `## [x.y.z] — YYYY-MM-DD` block to the README changelog, and repackage. Both must
agree exactly.
