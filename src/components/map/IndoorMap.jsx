import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

function createMarkerElement(kind) {
  const element = document.createElement("div");
  element.className = `map-marker ${kind === "start" ? "start-marker" : "destination-marker"}`;
  element.setAttribute("aria-hidden", "true");
  return element;
}

function createPoiFeature(location) {
  return {
    type: "Feature",
    properties: {
      id: location.id,
      name: location.name,
      type: location.type,
      room: location.room || "",
    },
    geometry: {
      type: "Point",
      coordinates: location.labelCoordinate,
    },
  };
}

function IndoorMap({ floorData, routeData }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const startMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);

  useEffect(() => {
    if (!floorData || !mapContainer.current) return undefined;

    const { west, east, south, north } = floorData.mapBounds;
    const center = [(west + east) / 2, (south + north) / 2];

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#e8edf3" },
          },
        ],
      },
      center,
      zoom: 15,
      pitch: 0,
      bearing: 0,
      minZoom: 12,
      maxZoom: 22,
      maxPitch: 65,
      attributionControl: false,
    });

    mapRef.current = map;
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.dragRotate.enable();
    map.touchZoomRotate.enable();
    map.touchPitch?.enable?.();

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        showZoom: true,
        visualizePitch: true,
      }),
      "top-right",
    );

    map.on("load", () => {
      map.addSource("floor-image", {
        type: "image",
        url: floorData.image,
        coordinates: [
          [west, north],
          [east, north],
          [east, south],
          [west, south],
        ],
      });

      map.addLayer({
        id: "floor-image-layer",
        type: "raster",
        source: "floor-image",
        paint: {
          "raster-opacity": 1,
          "raster-fade-duration": 0,
          "raster-resampling": "nearest",
        },
      });

      const labelFeatures = floorData.locations
        .filter((location) => location.labelCoordinate)
        .map((location) => ({
          type: "Feature",
          properties: {
            id: location.id,
            label: location.room
              ? `${location.name}\nRoom ${location.room}`
              : location.name,
            type: location.type,
          },
          geometry: {
            type: "Point",
            coordinates: location.labelCoordinate,
          },
        }));

      map.addSource("floor-labels", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: labelFeatures,
        },
      });

      map.addLayer({
        id: "floor-location-labels",
        type: "symbol",
        source: "floor-labels",
        minzoom: 14.2,
        layout: {
          "text-field": ["get", "label"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14.2,
            10,
            17,
            12,
            20,
            15
          ],
          "text-anchor": "center",
          "text-line-height": 1.05,
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          "text-padding": 3,
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "rgba(255,255,255,0.96)",
          "text-halo-width": 2,
          "text-halo-blur": 0.5,
        },
      });

      const importantPoiTypes = new Set(["lift", "stairs", "emergency"]);
      const poiFeatures = floorData.locations
        .filter(
          (location) =>
            importantPoiTypes.has(location.type) && location.labelCoordinate,
        )
        .map(createPoiFeature);

      map.addSource("floor-pois", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: poiFeatures,
        },
      });

      map.addLayer({
        id: "floor-poi-points",
        type: "circle",
        source: "floor-pois",
        paint: {
          "circle-radius": 6,
          "circle-color": [
            "match",
            ["get", "type"],
            "lift",
            "#2563eb",
            "stairs",
            "#7c3aed",
            "emergency",
            "#16a34a",
            "#475569",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      map.on("click", "floor-poi-points", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;

        const { name, type } = feature.properties;
        new maplibregl.Popup({ offset: 10 })
          .setLngLat(event.lngLat)
          .setHTML(`<strong>${name}</strong><br/><small>${type}</small>`)
          .addTo(map);
      });

      map.on("mouseenter", "floor-poi-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "floor-poi-points", () => {
        map.getCanvas().style.cursor = "";
      });

      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        {
          padding: 24,
          duration: 0,
          pitch: 0,
          bearing: 0,
        },
      );
    });

    return () => {
      startMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      startMarkerRef.current = null;
      destinationMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [floorData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !floorData) return undefined;

    const clearRoute = () => {
      if (map.getLayer("route-line")) map.removeLayer("route-line");
      if (map.getSource("route")) map.removeSource("route");
      startMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      startMarkerRef.current = null;
      destinationMarkerRef.current = null;
    };

    if (!routeData?.coordinates?.length) {
      if (map.loaded()) clearRoute();
      else map.once("load", clearRoute);
      return undefined;
    }

    const drawRoute = () => {
      clearRoute();

      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: routeData.coordinates,
          },
        },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#2563eb",
          "line-width": 7,
          "line-opacity": 0.98,
        },
      });

      const startCoordinate = routeData.coordinates[0];
      const destinationCoordinate = routeData.coordinates.at(-1);

      startMarkerRef.current = new maplibregl.Marker({
        element: createMarkerElement("start"),
        anchor: "center",
      })
        .setLngLat(startCoordinate)
        .addTo(map);

      destinationMarkerRef.current = new maplibregl.Marker({
        element: createMarkerElement("destination"),
        anchor: "bottom",
      })
        .setLngLat(destinationCoordinate)
        .addTo(map);

      const bounds = new maplibregl.LngLatBounds();
      routeData.coordinates.forEach((coordinate) => bounds.extend(coordinate));

      if (routeData.coordinates.length === 1) {
        map.easeTo({
          center: startCoordinate,
          zoom: Math.min(20, map.getMaxZoom()),
          duration: 700,
        });
      } else {
        map.fitBounds(bounds, {
          padding: { top: 90, right: 90, bottom: 100, left: 90 },
          duration: 900,
          maxZoom: 20,
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        });
      }
    };

    if (map.loaded()) drawRoute();
    else map.once("load", drawRoute);

    return undefined;
  }, [floorData, routeData]);

  const rotateMap = (degrees) => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ bearing: map.getBearing() + degrees, duration: 350 });
  };

  const resetNorth = () => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ bearing: 0, duration: 450 });
  };

  const togglePitch = () => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ pitch: map.getPitch() > 20 ? 0 : 48, duration: 450 });
  };

  const fitFloor = () => {
    const map = mapRef.current;
    if (!map || !floorData) return;

    const { west, east, south, north } = floorData.mapBounds;
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 24, duration: 650, pitch: map.getPitch() },
    );
  };

  return (
    <div className="map-shell">
      <div ref={mapContainer} className="map-canvas" />

      <div className="direction-controls" aria-label="Map direction controls">
        <button
          type="button"
          className="north-button"
          onClick={resetNorth}
          title="Face north"
          aria-label="Face north"
        >
          <span className="north-arrow">↑</span>
          <span>N</span>
        </button>

        <div className="direction-row">
          <button
            type="button"
            onClick={() => rotateMap(-45)}
            aria-label="Rotate left"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={() => rotateMap(45)}
            aria-label="Rotate right"
          >
            ↷
          </button>
        </div>

        <button type="button" className="pitch-button" onClick={togglePitch}>
          2D / 3D
        </button>

        <button type="button" className="pitch-button" onClick={fitFloor}>
          Fit floor
        </button>
      </div>

      <div className="map-tip">
        <strong>Real imported floor plan</strong>
        <span>Search a room or POI, then follow the blue corridor route.</span>
      </div>
    </div>
  );
}

export default IndoorMap;
