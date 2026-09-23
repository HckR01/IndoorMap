# IndoorMap

IndoorMap is a React + MapLibre indoor-navigation prototype that can generate a navigable floor from a floor-plan image instead of requiring hand-written GeoJSON and route nodes.

## Current result

The repository now includes the supplied **Level 24 commercial-office floor plan** as an imported demo.

Current features:

- real floor-plan image rendered inside MapLibre
- pan, zoom, rotate, north reset, 2D/3D tilt, and fit-floor controls
- OCR-generated searchable room/company destinations
- searchable lift, stairs, facilities, and emergency POIs
- start/destination autocomplete
- corridor-based A* routing
- blue route line constrained to the detected walkable corridor grid
- start and destination markers
- responsive desktop/mobile UI
- floor selector driven by `public/floors/manifest.json`
- automated image-to-navigation importer for future JPG/PNG floor plans
- GitHub Actions production-build verification

## Run the app

```bash
npm install
npm run dev
```

A useful demo route is:

- Start: `TechSolutions`
- Destination: `Lift A`

You can also search for `Stairs`, `Nexus Media`, `Boardroom`, `Toilets`, room numbers, and other OCR-detected locations.

## Import another floor automatically

One-time Python setup:

```bash
pip install -r floor-importer/requirements.txt
```

Then:

```bash
npm run import:floor -- --image "C:\maps\floor25.png" --floor 25 --name "Level 25"
```

The importer creates/updates:

```text
public/floors/
  manifest.json
  floor25.webp
  floor25.json
```

No React code needs to be edited. The app reads the manifest and loads the new floor automatically.

See `floor-importer/README.md` for details.

## How routing works

The importer uses OCR to detect destinations and computer vision to identify the main corridor/core region. The corridor becomes a compact walkable grid. Destinations are snapped to the nearest walkable corridor cell, and the browser runs A* between those cells.

This replaces the old hand-written room/node/edge prototype and prevents the intended route from simply drawing straight through room walls.

## Production note

Generated data is a draft. Verify doors, accessible routes, lifts/stairs, and emergency exits before using a map operationally.
