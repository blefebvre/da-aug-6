---
name: importer-bundles
description: >-
  Build and run this project's Helix content-import scripts. Each
  tools/importer/import-<template>.js source must be bundled into TWO artifacts
  — an IIFE .bundle.js for the EMA/run-bulk-import runner AND an ESM
  .ui.bundle.js for the local helix-importer-ui. Use whenever you edit a parser
  or transformer, add an import template, or the local importer produces "no
  blocks" / flattened-markdown output.
---

# Importer bundles (two formats, one source)

Each import template has ONE source file, `tools/importer/import-<template>.js`,
that must be compiled into **two** bundle artifacts. They differ only in module
format; the `transform` logic is byte-identical. Both must be rebuilt after ANY
edit to a parser or transformer the source imports, or the import runs stale.

| Artifact | Format | Consumed by | Loader expects |
|---|---|---|---|
| `import-<t>.bundle.js` | IIFE (`--global-name=CustomImportScript`) | EMA runner `run-bulk-import.js` | injects as `<script>`, reads `window.CustomImportScript.default` |
| `import-<t>.ui.bundle.js` | ESM (`--format=esm`) | local **helix-importer-ui** | `import()`s the file, reads `default.transform` |

## Build — always via npm, never a hand-run esbuild

One esbuild command emits ONE artifact, so a hand-run command ships a stale
partner bundle. The npm scripts emit BOTH formats for a template in one go:

```bash
npm run build:import            # rebuild all templates × both formats
npm run build:import:<template> # one template, both formats (e.g. :homepage)
```

Adding a template? Add a matching `build:import:<template>` script to
`package.json` (mirror an existing one) and chain it into `build:import`. Each
script runs esbuild twice — IIFE then ESM:

```
npx -y esbuild@0.28.1 tools/importer/import-<t>.js --bundle \
  --format=iife --global-name=CustomImportScript \
  --outfile=tools/importer/import-<t>.bundle.js \
&& npx -y esbuild@0.28.1 tools/importer/import-<t>.js --bundle \
  --format=esm --outfile=tools/importer/import-<t>.ui.bundle.js
```

Generated `*.bundle.js` are esbuild output — keep them in `.eslintignore`.

## Run the EMA bulk import (headless)

Point `--import-script` at the **`.bundle.js`** (IIFE), never the raw source:

```bash
node <excat>/skills/excat-content-import/scripts/run-bulk-import.js \
  --import-script tools/importer/import-<t>.bundle.js \
  --urls tools/importer/urls-<t>.txt
```

The runner injects the file as a plain `<script>` and expects
`window.CustomImportScript`. The raw ES-module source uses `import` and fails
with "CustomImportScript.default not found". A failed run does NOT overwrite the
existing `content/*.plain.html` (safe to retry).

## Run the local helix-importer-ui

1. Serve the repo over http (the UI loads the bundle via `import()`).
2. Transformation file URL to paste — the **`.ui.bundle.js`**, e.g.
   `http://localhost:3001/tools/importer/import-<t>.ui.bundle.js`.
3. Import Options: Project Type = Document Authoring; page load timeout ≥ 8000ms;
   Save HTML for Document Authoring ON; Save as docx OFF; Enable JavaScript ON;
   Scroll to bottom ON.

## The "no blocks / flattened markdown" trap

If the local UI produces Markdown with flattened prose and NO blocks, you almost
certainly pointed it at the **IIFE** `.bundle.js`. An IIFE bundle has no ES
exports, so `import()`ing it yields `default = {default, "module.exports"}` with
no `.transform` — the UI silently falls back to a passthrough `transformDOM`.
Use the **ESM `.ui.bundle.js`**, which exposes `default.transform`. (`WebImporter`
stays a free global the UI provides on `window`.)

## Verify the two stay in sync

Same source → identical `transform`. If output differs between the two loaders,
one bundle is stale — rerun `npm run build:import` (never a single esbuild).
