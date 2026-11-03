# Data Migration Mapping Explorer

- **Repository:** [github.com/mwesolowski-axon/tpd-mapping-viewer](https://github.com/mwesolowski-axon/tpd-mapping-viewer)
- **GitHub Pages:** [mwesolowski-axon.github.io/tpd-mapping-viewer](https://mwesolowski-axon.github.io/tpd-mapping-viewer/)

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

This project is linked to
[tpd-mapping-viewer](https://github.com/mwesolowski-axon/tpd-mapping-viewer)
(`origin` → `https://github.com/mwesolowski-axon/tpd-mapping-viewer.git`).

The repo includes `.github/workflows/deploy-pages.yml`. From this directory:

```bash
git push origin main
```

On GitHub: **Settings → Pages → Build and deployment → Source** → choose
**GitHub Actions** (not “Deploy from a branch”). Save if prompted.

The workflow runs on every push to `main`. When **deploy** succeeds, the site is
at [https://mwesolowski-axon.github.io/tpd-mapping-viewer/](https://mwesolowski-axon.github.io/tpd-mapping-viewer/).

### Deploy job fails with 404 / “Ensure GitHub Pages has been enabled”

The **build** job can succeed while **deploy** fails if Pages is not set up for
Actions yet. Fix:

1. Open **Settings → Pages** for the repo.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. If you do not see that option, an org admin may need to allow GitHub Pages
   for the organization ( **Org Settings → Pages** ).
4. Re-run the workflow: **Actions → Deploy to GitHub Pages → Run workflow**.

Until **deploy** succeeds (green), the site URL may load blank or show a
placeholder. Check the **deploy** job, not only **build**.

To deploy only static files without Actions, build locally and push the
contents of `dist/` to a `gh-pages` branch instead (optional).

## Adding a new table later

1. Export the table's mapping CSV with the same columns as the existing ones:
   `Snowflake Column, Snowflake Example Data, V1 Schema/View, V1 Column,
   V2 Schema/View, V2 Column, Notes`.
2. Drop the CSV into `public/data/` (e.g. `public/data/AXON_INCIDENTS.csv`).
3. Add one entry to `public/data/manifest.json` (order in the file does not matter;
   the sidebar sorts tables A → Z by name):

   ```json
   {
     "id": "AXON_INCIDENTS",
     "name": "AXON_INCIDENTS",
     "file": "data/AXON_INCIDENTS.csv"
   }
   ```

4. Keep a copy of the CSV in the workspace root (parent of `mapping-viewer/`) if
   you maintain mappings there as well as under `public/data/`.
5. If the table includes **IncidentNumber**, **IncidentId**, **OffenseIncidentNumber**, or
   **IncidentExternalId**, run from `mapping-viewer/`:

   ```bash
   npm run update-incident-columns
   ```

   That applies the standard `EntDocument → RelIncidentDocument → EntIncident`
   derive notes and V2 targets for every table in `manifest.json` (except
   `AXON_INCIDENTS`, `AXON_CASES`, and `AXON_MOSTRECENTGENERALOFFENSE`, which
   use their own incident paths). The info sidebar and tooltip overrides pick
   up those rows automatically — you do not need to edit `incidentFromReport.js`
   for each new table.

6. Refresh the app — the new table appears in the sidebar automatically.

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
