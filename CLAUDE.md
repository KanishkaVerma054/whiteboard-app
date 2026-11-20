# CLAUDE.md

Context for working on this project. Read `/home/linux/claude-logic/logic.md` for the detailed, timestamped history of every change and bug fix from past sessions — this file is an orientation guide, not a changelog; don't duplicate logic.md's content here.

## Project

A whiteboard/Excalidraw-clone, pnpm monorepo (turborepo), built by the user (Kanishka Verma, kanishkav774@gmail.com) as a learning project.

- `apps/frontend` — Next.js app. Canvas drawing logic lives in `app/draw/Game.ts` (class `Game`, instantiated once per room in `components/Canvas.tsx`), `app/draw/SelectionLogic.ts` (pure geometry helpers, static class), `types/types.ts` (shared constants/types), `components/Canvas.tsx` (React UI — `Canvas` + `Topbar` components), `components/IconButtton.tsx`.
- `apps/ws-server` — WebSocket server, port 4000. Message types: `"chat"` (create — persists + broadcasts to all including sender), `"shape_update"` (needs `shapeId`, `message`, `roomId`), `"shape_delete"` (needs `shapeId`, `roomId`).
- `apps/http-server` — port 3001.
- `packages/db` — Prisma/Postgres. `.env` has `DATABASE_URL`.

Typecheck: `cd apps/frontend && npx tsc --noEmit -p .`

## How to work with this user

- **New feature requested** → give a detailed, step-by-step guide so they implement it themselves. Don't write the code unless they explicitly say to ("complete step N for me", "implement this", etc.).
- **Bug reported** → investigate and apply the fix directly, don't just explain it.
- When told "complete step N for me," read the CURRENT actual file state first before editing — the user has usually already done prior steps themselves, often with variable-name variations or typos from the guide, so never assume the guide's suggested names match what's actually in the file.
- The user writes most of the code themselves, from guides. Expect: typos and variable-name mixups (e.g. `slectedId` instead of `selectedId`, capitalization slips like `StrokeEdge` instead of `strokeEdge` as an object key), and occasionally stray mid-keystroke fragments left in a file from what looks like the editor autosaving mid-type (happened more than once, always right after an opening `{` — e.g. `private syncPanel(){ dra`, later `private syncPanel(){file`). If an inexplicable compile/runtime error shows up, read the exact current line before assuming it matches a prior guide step.
- Append every change made or error resolved to `/home/linux/claude-logic/logic.md`'s "Change / error log" section, newest at the bottom, with an IST timestamp obtained live via `TZ=Asia/Kolkata date '+%Y-%m-%d %H:%M IST'` — never guess the timestamp. Format: `### [timestamp] Change|Error: title` then `- What happened:` / `- Cause:` (errors only) / `- Solution:` / `- Logic / why:`.

## Reference projects

- `~/excalidraw` — the real Excalidraw source. Use for precise, authoritative algorithmic reference: exact corner-radius formulas (`getCornerRadius`, proportional vs adaptive radius, the 0.25 ratio / 32px cap / 128px cutoff constants), `isPathALoop`/`LINE_CONFIRM_THRESHOLD` for closed-pencil-path fill detection. Good for "what's the actual correct math/mechanism," not always easy to port directly — it's production-grade and handles far more cases than this project needs.
- `~/CollabyDraw` — the closer structural analog: a plain `CanvasEngine` class driving a `<canvas>`, not React-driven rendering, same shape as this project's `Game` class. Good for patterns that map directly onto this codebase's architecture: `roundRect`/`arcTo`-based corner rounding (though their diamond-rounding start-point math turned out to only be correct for 90° corners — see logic.md), stroke width/style dash-array formulas. Known gaps: no triangle shape at all, no roughjs/sloppiness adopted (so "Fill Style" hachure/cross-hatch and "Sloppiness" roundness both need roughjs as a new dependency — researched, deliberately deferred, see below).

## Established code conventions

- Every "set X" method (`setFontFamily`, `setStrokeColour`, `setStrokeWidth`, `setStrokeStyle`, `setBgFill`, `setStrokeEdge`, ...) follows the same shape: update the `current*` field; if `enableTextArea` is open, update the `editing*` counterpart + call `updateEditorFont?.()` + `syncPanel()`; else if a shape is selected and the property applies to its type, mutate the shape + send a `shape_update` socket message that **must include `roomId`** (the single most common bug class in this project, along with field-name/casing typos in copy-pasted lines — ws-server does `Number(roomId)` for DB matching and `rooms.includes(roomId)` for broadcast, both fail silently on `undefined`).
- `PanelState` (`types/types.ts`) uses optional slices (`strokeColor`, `strokeWidth?`, `strokeStyle?`, `bgFill?`, `strokeEdge?`, `text?`) rather than an exclusive `kind` field — this has scaled cleanly to every new property added so far with zero restructuring.
- Every new React panel row / handler needs wiring in **two** places: the `<Topbar .../>` call site prop AND `Topbar`'s destructured-props type annotation. Missing one half is a recurring mistake worth checking first.
- Canvas context state (`ctx.strokeStyle`, `ctx.fillStyle`, `ctx.textAlign`, `ctx.setLineDash`, `ctx.lineWidth`) must always be set explicitly per-shape inside `drawShape`, never left to inherit from whatever the previous shape's draw call left behind — this exact bug class has recurred many times.
- Shape geometry with a sign (rect/triangle width-height derived from a drag) must be normalized via `Math.abs()`/`Math.min()` at the point each value is actually *used* (rendering, hit-testing), not assumed positive at creation — multiple bugs have come from a drag direction (right-to-left, bottom-to-top) producing a negative value that wasn't accounted for downstream.
- When iterating `existingShapes` for hit-testing or multi-item removal, iterate **backward** (`length - 1` down to `0`) — matches `SelectionLogic.hitTest`'s existing convention (topmost shape first) and keeps indices valid while splicing.
- When something needs to survive a shape array mutation (selection state, "was this the shape I just deleted"), compare by the shape's `.id`, never by a captured array index — indices shift the moment anything is spliced.
- `drawShape()`'s per-shape render is wrapped in `ctx.save()` / `try { ... } finally { ctx.restore() }`, and the whole per-shape loop in `clearCanvas()` is additionally wrapped in a `try/catch` that logs and skips a shape that throws, so one malformed shape can't take down the rendering of every shape after it in the array.

## Deferred / paused work

- **Sloppiness** (architect/artist/cartoonist roundness levels) — full guide researched and given, not implemented. Needs `roughjs` as a new dependency.
- **Fill Style** (hachure/cross-hatch/solid) — needs the same `roughjs` dependency as Sloppiness; the two could share one foundation if revisited together. Paused at the decision point: adopt roughjs (matches CollabyDraw, far less code) vs. hand-roll a custom hatching renderer (no new dependency, real geometry work, doesn't unlock Sloppiness for free).

## Shape type model

`Shape = {id, rotation, strokeColour} & (rect | circle | pencil | line | triangle | diamond | arrow | text)`. `strokeWidth`/`strokeStyle` are per-variant fields (not on the shared intersection) on every type except `text`. `bgFill` is per-variant on `rect`/`circle`/`triangle`/`diamond`/`pencil` only. `strokeEdge` is per-variant on `rect`/`triangle`/`diamond` only (`circle` picked up a stray, unused `strokeEdge` field at some point — harmless, nothing reads it, worth cleaning up if noticed).
