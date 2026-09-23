# IndoorMap

A responsive indoor navigation prototype built with React, Vite, and MapLibre GL JS.

## Current prototype

- Interactive 2.5D office floor
- Pan, zoom, rotate, and pitch controls
- Room number/name search
- Start and destination selection
- Dijkstra shortest-path routing
- Blue route line with start/destination markers
- Clickable rooms
- Responsive mobile and desktop layout
- JSON/GeoJSON-based map data
- Prototype contains 16 searchable rooms plus lift, stairs, and fire exit

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Test route

Use:

- Start: `D101`
- Destination: `D116`

The route should travel along the main corridor and turn north toward the washroom.

## Map data

- `src/data/floor1.geojson` — room and corridor geometry
- `src/data/rooms.json` — searchable rooms and doorway locations
- `src/data/nodes.json` — navigation nodes
- `src/data/edges.json` — walking graph connections

This floor is sample data for the prototype. It can later be replaced with a traced real office JPG/blueprint.
