# Demo Studio

Recreates the Cursorful-style product demo as a local, scriptable renderer:
a typed-out terminal session inside a rounded window, on a blurred
brand-coloured backdrop, with zooms that ease in on the interesting moments
and back out afterwards. The canvas is captured with `MediaRecorder`, so
nothing is uploaded and no editor is involved.

The session is data, so one renderer covers every project.

## Use

1. Run the real command and copy its actual output.
2. Put it in a `script.<project>.json` (see `script.polysh.json`).
3. Serve this folder over HTTP — `npx vite` from the repo root works, the page
   is at `/tools/demo-studio/`.
4. Open it, run `__start()` in the console, wait for the status line to read
   `done`, then save `window.__dataUrl` as a `.webm`.

## Script format

| field | meaning |
|---|---|
| `title`, `tagline`, `subtitle` | the opening card |
| `accent`, `accent2` | prompt and translation-line colours |
| `backdrop` | 4 colours for the blurred wash; first is the base |
| `cwd` | shown in the title bar |
| `steps[].prompt` | prompt for this step (`PS>`, `›`, ...) |
| `steps[].cmd` | typed one character at a time |
| `steps[].hint` | translation line(s) under the command; string or array |
| `steps[].out` | output lines, revealed in sequence |
| `steps[].err` | render this step's output as an error |
| `steps[].pause` | beat after this step, seconds |
| `steps[].zoom` | push in while this step runs |

## Notes

- Keep the window inset (`WIN`) generous. A narrow inset leaves no room to
  zoom and the first character of every line gets cropped.
- The mono stack has no U+21B3, which polysh prints; use U+2192.
- WebM, not MP4 — `MediaRecorder` has no MP4 encoder. LinkedIn and X both
  accept WebM. For MP4: `ffmpeg -i polysh-demo.webm -c:v libx264 -crf 18
  -pix_fmt yuv420p polysh-demo.mp4`.

## Keeping it at 60fps

Output frame rate is whatever the render loop achieves, so anything expensive
per frame shows up directly as judder. Three things mattered, measured:

| change | painted fps | file fps |
|---|---|---|
| `captureStream(30)`, blur filter, shadow per frame | — | 9.4 |
| `captureStream(0)` + explicit `requestFrame()` | 13.6 | — |
| wash drawn at 64x36 and upscaled instead of `blur(70px)` | 48 | 38 |
| window chrome and its shadow cached to an offscreen canvas | 60.1 | 60.3 |

`captureStream(fps)` lets the compositor decide when to sample and
under-delivers badly off a real display; `captureStream(0)` with a
`requestFrame()` after each draw pins one encoded frame per painted frame.
After that the only limit is how fast a frame paints, so keep per-frame work
down: no `ctx.filter`, no `shadowBlur` on anything static.
