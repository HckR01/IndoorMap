import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import floorDataRaw from "../../data/floor1.geojson?raw";

const INITIAL_CENTER = [0.00073, 0.00086];

function createMarkerElement(kind) {
  const element = document.createElement("div");
  element.className = `map-marker ${kind === "start" ? "start-marker" : "destination-marker"}`;
  element.setAttribute("aria-hidden", "true");
  return element;
}

function IndoorMap({ routeData }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const startMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const floorData = JSON.parse(floorDataRaw);

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: {
              "background-color": "#eef2f7",
            },
          },
        ],
      },
      center: INITIAL_CENTER,
      zoom: 18.15,
      pitch: 48,
      bearing: -24,
      maxPitch: 65,
      minZoom: 16.5,
      maxZoom: 21,
      attributionControl: false,
      cooperativeGestures: false,
    });

    mapRef.current = map;

    map.dragPan.enable();
    map.scrollZoom.enable();
    map.dragRotate.enable();
    map.touchZoomRotate.enable();
    map.touchPitch?.enable?.();

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }),
      "top-right",
    );

    map.on("load", () => {
      map.addSource("floor-data", {
        type: "geojson",
        data: floorData,
      });

      map.addLayer({
        id: "corridor-layer",
        type: "fill",
        source: "floor-data",
        filter: ["==", ["get", "category"], "corridor"],
        paint: {
          "fill-color": "#ffffff",
          "fill-opacity": 1,
        },
      });

      map.addLayer({
        id: "room-layer",
        type: "fill-extrusion",
        source: "floor-data",
        filter: ["!=", ["get", "category"], "corridor"],
        paint: {
          "fill-extrusion-color": [
            "match",
            ["get", "category"],
            "meeting",
            "#c7d2fe",
            "facility",
            "#fde68a",
            "emergency",
            "#fecaca",
            "reception",
            "#bbf7d0",
            "#e2e8f0"
          ],
          "fill-extrusion-height": [
            "match",
            ["get", "category"],
            "emergency",
            6,
            9
          ],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.97,
        },
      });

      map.addLayer({
        id: "room-outline",
        type: "line",
        source: "floor-data",
        filter: ["!=", ["get", "category"], "corridor"],
        paint: {
          "line-color": "#64748b",
          "line-width": 1.3,
        },
      });

      map.addLayer({
        id: "room-labels",
        type: "symbol",
        source: "floor-data",
        filter: ["!=", ["get", "category"], "corridor"],
        layout: {
          "text-field": [
            "format",
            ["get", "id"],
            { "font-scale": 1.05 },
            "\n",
            {},
            ["get", "name"],
            { "font-scale": 0.72 }
          ],
          "text-size": 13,
          "text-anchor": "center",
          "text-allow-overlap": false,
          "text-padding": 2,
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.4,
        },
      });

      map.on("click", "room-layer", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;

        const { id, name, category } = feature.properties;

        new maplibregl.Popup({ closeButton: true, offset: 12 })
          .setLngLat(event.lngLat)
          .setHTML(
            `<div class="room-popup"><strong>${id}</strong><span>${name}</span><small>${category}</small></div>`,
          )
          .addTo(map);
      });

      map.on("mouseenter", "room-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "room-layer", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      startMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

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
      return;
    }

    const drawRoute = () => {
      clearRoute();

      const routeGeoJSON = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: routeData.coordinates,
        },
      };

      map.addSource("route", {
        type: "geojson",
        data: routeGeoJSON,
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
      const endCoordinate = routeData.coordinates.at(-1);

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
        .setLngLat(endCoordinate)
        .addTo(map);

      const bounds = new maplibregl.LngLatBounds();
      routeData.coordinates.forEach((coordinate) => bounds.extend(coordinate));

      if (routeData.coordinates.length === 1) {
        map.easeTo({
          center: startCoordinate,
          zoom: 20,
          pitch: 50,
          duration: 900,
        });
      } else {
        map.fitBounds(bounds, {
          padding: { top: 80, right: 70, bottom: 110, left: 70 },
          duration: 1200,
          maxZoom: 19.4,
          pitch: 50,
          bearing: map.getBearing(),
        });
      }
    };

    if (map.loaded()) drawRoute();
    else map.once("load", drawRoute);
  }, [routeData]);

  return (
    <div className="map-shell">
      <div ref={mapContainer} className="map-canvas" />

      <div className="map-tip">
        <strong>Move the map</strong>
        <span>Drag to pan · wheel/pinch to zoom · rotate with compass or gesture</span>
      </div>
    </div>
  );
}

export default IndoorMap;
