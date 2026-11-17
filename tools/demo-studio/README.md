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
| `steps[].cmd` | typed one character at a time |
| `steps[].hint` | dim accent line under the command |
| `steps[].out` | output lines, revealed in sequence |
| `steps[].zoom` | push in while this step runs |

## Notes

- Keep the window inset (`pad`) generous. A narrow inset leaves no room to
  zoom and the first character of every line gets cropped.
- The mono stack has no `↳`; use `→`, which it does have.
- WebM, not MP4 — `MediaRecorder` has no MP4 encoder. Most places accept WebM;
  convert with ffmpeg if you need MP4.
