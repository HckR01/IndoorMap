# Floor Plan Importer

This importer turns a JPG/PNG floor plan into data the React app can use without manually editing room coordinates, nodes, edges, or GeoJSON.

It automatically:

- crops the architectural drawing from page margins/captions
- reads room/company labels with Tesseract OCR
- detects the dominant corridor/core area
- creates a walkable navigation grid
- snaps detected destinations to the nearest corridor
- creates searchable room/POI records
- detects green emergency/exit signs as draft emergency POIs
- writes the optimized floor image and JSON data into `public/floors/`
- updates `public/floors/manifest.json`, so the React app discovers the new floor automatically

## One-time setup

Python 3.10+ is recommended.

```bash
pip install -r floor-importer/requirements.txt
```

Tesseract OCR must also be installed. If `tesseract` is not in PATH, pass its executable path with `--tesseract-cmd`.

## Import a new floor

From the repository root:

```bash
python floor-importer/import_floor.py --image "C:\maps\floor25.png" --floor 25 --name "Level 25"
```

Or:

```bash
npm run import:floor -- --image "C:\maps\floor25.png" --floor 25 --name "Level 25"
```

Then run/restart:

```bash
npm run dev
```

The new floor appears in the floor selector automatically.

## Included Level 24 demo

The supplied commercial-office image is included as the Level 24 demo. Its temporary lift/stair hint option is:

```bash
python floor-importer/import_floor.py --image "your-level24-image.png" --floor 24 --name "Level 24 - Commercial Offices" --demo-vertical-transport
```

## Verification

Computer vision produces a draft. Before a real building map is published, verify room entrances, lifts, stairs, accessible paths, and emergency exits.
