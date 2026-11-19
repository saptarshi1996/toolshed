# Toolshed

A modern, browser-based toolbox for everyday data work, in the spirit of CyberChef but with a cleaner, Apple-style interface. Every tool has its own URL, so you can bookmark it or share a link.

**Live site:** https://saptarshi1996.github.io/toolshed/

Everything runs in the browser. Nothing you paste is sent to a server.

## Tools

| Group | Tool | Path | Status |
| ----- | ---- | ---- | ------ |
| JSON  | Compare | `/compare` | Available |

More JSON tools (stringify, parse, format, minify, query, validate) and other groups are planned.

### JSON Compare

Paste JSON on each side and see exactly what was added, removed, or changed.

- Both sides are editable and the comparison updates as you type.
- Differences are matched by path (`scripts.test`, `tags[2]`), so reordered keys and formatting are not changes.
- Changed lines are tinted in both editors, and every difference is listed below with its old and new value.
- Invalid JSON is reported with the line and message, instead of failing silently.
- Format and Clear buttons on each side, an option to ignore array order, and a filter for the list of differences.

## Getting started

```sh
npm install
npm run dev
```

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the tests once |
| `npm run test:watch` | Run the tests in watch mode |

## Tech

React 19, TypeScript, Vite, React Router, and CodeMirror 6 for the editors. Styling is plain CSS with design tokens in `src/index.css` and follows the system light or dark setting. Tests use Vitest and Testing Library.

## Project structure

```
src/
  components/   Sidebar, TopBar, Editor (CodeMirror wrapper), Icon
  lib/          Pure logic, such as the JSON parser and diff
  test/         Shared test setup and helpers
  tools/        One folder per tool group, plus the tool registry
  App.tsx       Layout and routes
```

## Adding a tool

1. Create the page in `src/tools/<group>/`, exporting a component.
2. If it needs a new icon, add it to `src/components/Icon.tsx`.
3. Add an entry to `groups` in `src/tools/registry.tsx` with its `name`, `path`, `icon`, and a lazy-loaded `component`.

The sidebar, routes, page title, and search all read from that registry, so nothing else needs wiring. Keep paths unique across groups.

## Testing and checks

- Unit tests cover the JSON parsing and diffing logic in `src/lib/`.
- Integration tests render the app and the Compare page and drive them like a user: routing, the sidebar, search, editing, and the differences list.
- Git hooks (Husky) run lint and a build before each commit, and the tests before each push. They are installed automatically by `npm install`.

## Deployment

Pushes to `main` deploy to GitHub Pages through `.github/workflows/deploy.yml`. The workflow lints, tests, and builds first, and only publishes if all three pass.

Because Pages serves the site under `/toolshed/` and has no server-side routing:

- The deploy sets `BASE_PATH=/toolshed/`, which Vite and the router both use.
- The build copies `index.html` to `404.html`, so opening a direct link such as `/toolshed/compare` still loads the app.
