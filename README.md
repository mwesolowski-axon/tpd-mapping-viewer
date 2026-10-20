# Data Migration Mapping Explorer

An interactive, browser-based viewer for the Snowflake → V1 → V2 column mapping
CSVs used to track the TPD data store migration. Built with React + Vite as a
fully static site, so it can be hosted directly on GitHub Pages with no
backend.

## How it works

- Each Snowflake **table** is a separate CSV file in `public/data/`.
- `public/data/manifest.json` lists which tables show up in the sidebar.
- The app fetches the manifest and the selected table's CSV at runtime and
  parses it with [PapaParse](https://www.papaparse.com/) (which correctly
  handles quoted, multi-line `Notes` cells).
- UI is a three-pane layout:
  1. **Sidebar** — searchable list of tables.
  2. **Column list** — searchable list of Snowflake columns for the selected
     table, each tagged with a mapping status badge (`V1 + V2`, `V1 only`,
     `V2 only`, `Unmapped`). Clicking a column pans the canvas to it.
  3. **Mapping canvas** — an always-visible, infinite-canvas view of every
     column's lineage diagram stacked vertically, in the order chosen via the
     **Default / A → Z / Z → A** sort buttons in the toolbar. Each row draws
     `V1 Schema/Column` ← connector → `Snowflake Column (+ example data)` ←
     connector → `V2 Schema/Column`; a missing mapping renders as a dashed
     "No mapping" placeholder instead of a solid line. Hovering the Snowflake
     node shows the `Notes` cell as a tooltip (only rendered when notes
     exist, and always kept within the viewport).

  The canvas supports:
  - **Pan** — click and drag anywhere on the canvas background.
  - **Zoom** — scroll/pinch anywhere on the canvas, or use the slider at the
    bottom of the pane (zooms toward the cursor or the pane center).
  - **Copy field names** — every V1/Snowflake/V2 column name has a small
    copy icon that copies it to the clipboard and shows a brief,
    non-blocking toast confirmation.

## Local development

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

## Building for production / GitHub Pages

```bash
npm run build
```

This outputs a static site to `dist/`. `vite.config.js` sets `base: './'`, so
the build uses relative asset paths and works regardless of the repo name or
subpath it's served from.

## Publish to GitHub Pages

This repo includes `.github/workflows/deploy-pages.yml`. After you push to
GitHub:

1. Create a **new empty repository** on GitHub (do not add a README if you
   are pushing this folder as-is).
2. Connect and push from the `mapping-viewer` directory:

   ```bash
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Build and deployment → Source** → choose
   **GitHub Actions**.
4. The workflow runs on every push to `main`. When it finishes, the site is
   at `https://YOUR_USER.github.io/YOUR_REPO/`.

To deploy only static files without Actions, build locally and push the
contents of `dist/` to a `gh-pages` branch instead (optional).

## Adding a new table later

1. Export the table's mapping CSV with the same columns as the existing ones:
   `Snowflake Column, Snowflake Example Data, V1 Schema/View, V1 Column,
   V2 Schema/View, V2 Column, Notes`.
2. Drop the CSV into `public/data/` (e.g. `public/data/AXON_INCIDENTS.csv`).
3. Add one entry to `public/data/manifest.json`:

   ```json
   {
     "id": "AXON_INCIDENTS",
     "name": "AXON_INCIDENTS",
     "file": "data/AXON_INCIDENTS.csv"
   }
   ```

4. Refresh the app — the new table appears in the sidebar automatically. No
   rebuild logic or code changes are required.

## Possible future enhancements

- Cross-table global search (currently search is scoped per-table and
  per-table-list).
- Grouping/tagging tables (e.g. by domain) in the sidebar as the table count
  grows.
- "Fit to view" / reset-view button alongside the zoom slider.

## Project structure

```
mapping-viewer/
├─ public/
│  └─ data/
│     ├─ manifest.json        # table registry
│     └─ AXON_ARRESTS.csv     # one CSV per table
├─ src/
│  ├─ components/
│  │  ├─ Sidebar.jsx          # table nav + search
│  │  ├─ ColumnList.jsx       # column list + search + status badges + click-to-focus
│  │  ├─ MappingCanvas.jsx    # pan/zoom canvas, sort toolbar, zoom slider
│  │  ├─ MappingRow.jsx       # single column's V1 / Snowflake / V2 diagram row
│  │  ├─ NotesTooltip.jsx     # viewport-aware hover tooltip for the Notes cell
│  │  └─ CopyButton.jsx       # copy-to-clipboard icon button + toast trigger
│  ├─ context/
│  │  └─ ToastContext.jsx     # non-blocking toast notifications
│  ├─ hooks/
│  │  ├─ useManifest.js       # loads public/data/manifest.json
│  │  └─ useTableData.js      # loads + parses a table's CSV
│  ├─ utils/
│  │  └─ mapping.js           # row normalization, status, search matching, sorting
│  ├─ App.jsx                 # top-level state + layout
│  └─ index.css               # design tokens + all component styling
└─ vite.config.js
```
