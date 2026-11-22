# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Toolshed is a browser-only developer toolbox with a clean UI. Nothing the user pastes leaves the browser. Live at https://saptarshi1996.github.io/toolshed/. JSON Compare, Stringify and Parse exist so far. More JSON tools and other groups are planned (see `README.md`).

## Commands

```sh
npm run dev                      # dev server
npm run build                    # tsc -b && vite build (postbuild copies index.html to 404.html)
npm run lint                     # eslint .
npm test                         # vitest run (once)
npm run test:watch               # vitest watch
npx vitest run src/lib/jsonDiff.test.ts            # a single file
npx vitest run -t "marks the original lines"       # a single test by name
```

Node version is pinned in `.nvmrc`. Husky runs `lint` + `build` on pre-commit and `test` on pre-push, so a failing type-check blocks commits. CI (`.github/workflows/deploy.yml`) runs lint, test, build on every push to `main`, then deploys to GitHub Pages.

## Architecture

**Tool registry drives everything.** `src/tools/registry.tsx` holds `groups` (each with `tools`). The sidebar, the routes in `App.tsx`, the document title, and the sidebar search are all derived from it, so adding a tool means adding a registry entry (lazy-loaded `component`, unique `path`, an `icon` key from `components/Icon.tsx`) and nothing else. See "Adding a tool" in `README.md`.

**Shared page layout** (header, switches, side-by-side panes, narrow-window stacking) lives in `src/components/ToolPage.css` (`tool-page`, `tool-head`, `panes`, `pane`...). New tools import it instead of redefining it. `Editor` takes `readOnly` and `wrap` for output panes.

**Logic lives in `src/lib/`, UI in `src/tools/` and `src/components/`.** For JSON Compare, `src/lib/jsonDiff.ts` is pure and unit-tested; `src/tools/json/Compare.tsx` only wires state to it.

**JSON Compare pipeline** (`compareJson` in `jsonDiff.ts`):
1. `parseJson` is a hand-written parser (not `JSON.parse`) so it can record the line span of every value by path and report syntax errors with a line number. It returns a result object rather than throwing. Any other exception escapes into React, so keep number/string handling strict enough that `JSON.parse` on a matched token can never fail.
2. `diffJson` compares by path, so key order and formatting are never differences. Arrays compare by index.
3. Spans from step 1 are used to produce per-line marks (`add`/`del`/`chg`/`err`) for each editor.

**Ignore array order** sorts arrays with `sortArrays` before diffing, which changes indexes. To keep line marks correct, `sortArrays` records a sorted-index to original-index map (`Origins`) and changes carry `fromPath`/`toPath` (original-text paths) that are used for span lookup. The `path` shown in the changes list is still the sorted one. Preserve this split when touching either function.

**Paths**: `keyPath` produces `a.b` for identifier keys and `a["odd key"]` otherwise, so keys containing dots or brackets don't collide. Objects from `parseJson` use `Object.create(null)`.

**Editor** (`components/Editor.tsx`) wraps CodeMirror 6 imperatively. The `EditorView` is created once; `value` and `marks` flow in through effects, and diff line/gutter tinting is a `StateField` fed by a `setMarks` effect. Styling uses CSS variables from `src/index.css` (design tokens, system light/dark).

## Testing

Vitest + jsdom + Testing Library. `src/test/setup.ts` stubs the layout APIs CodeMirror needs in jsdom. Use `src/test/editor.ts` (`setEditorText`, `getEditorText`, `getEditor`) to drive editors in tests, since they aren't plain inputs; `src/test/matchMedia.ts` mocks the responsive breakpoint (sidebar collapses at 900px).

## Deployment gotchas

GitHub Pages serves under `/toolshed/` with no server routing. The deploy sets `BASE_PATH=/toolshed/`, read by `vite.config.ts` (and the router), and the build copies `index.html` to `404.html` so deep links work. Locally `BASE_PATH` is unset and the base is `/`.
