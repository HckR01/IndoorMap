import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";

function IndoorMap({ routeData }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

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
              "background-color": "#f3f4f6",
            },
          },
        ],
      },

      center: [0.0017, 0.0003],
      zoom: 18.5,
      pitch: 45,
      bearing: -20,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }),
      "top-right",
    );

    map.on("load", async () => {
      try {
        const response = await fetch("/src/data/floor1.geojson");
        const floorData = await response.json();

        map.addSource("floor-data", {
          type: "geojson",
          data: floorData,
        });

        // Corridor layer
        map.addLayer({
          id: "corridor-layer",
          type: "fill",
          source: "floor-data",
          filter: ["==", ["get", "category"], "corridor"],
          paint: {
            "fill-color": "#d1d5db",
            "fill-opacity": 1,
          },
        });

        // 2.5D room layer
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
              "#bfdbfe",
              "office",
              "#e5e7eb",
              "#dbeafe",
            ],

            "fill-extrusion-height": 8,
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.95,
          },
        });

        // Room outlines
        map.addLayer({
          id: "room-outline",
          type: "line",
          source: "floor-data",
          filter: ["!=", ["get", "category"], "corridor"],
          paint: {
            "line-color": "#475569",
            "line-width": 1.5,
          },
        });

        // Room labels
        map.addLayer({
          id: "room-labels",
          type: "symbol",
          source: "floor-data",
          filter: ["!=", ["get", "category"], "corridor"],

          layout: {
            "text-field": ["get", "id"],
            "text-size": 14,
            "text-anchor": "center",
          },

          paint: {
            "text-color": "#111827",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1,
          },
        });

        // Click room
        map.on("click", "room-layer", (event) => {
          const feature = event.features?.[0];

          if (!feature) return;

          const { id, name } = feature.properties;

          new maplibregl.Popup()
            .setLngLat(event.lngLat)
            .setHTML(
              `
              <strong>${id}</strong>
              <br/>
              ${name}
            `,
            )
            .addTo(map);
        });

        // Pointer cursor
        map.on("mouseenter", "room-layer", () => {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "room-layer", () => {
          map.getCanvas().style.cursor = "";
        });
      } catch (error) {
        console.error("Failed to load floor map:", error);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !routeData?.coordinates?.length) {
      return;
    }

    const routeGeoJSON = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: routeData.coordinates,
      },
    };

    if (map.getSource("route")) {
      map.getSource("route").setData(routeGeoJSON);
    } else {
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
          "line-opacity": 0.95,
        },
      });
    }

    const bounds = new maplibregl.LngLatBounds();

    routeData.coordinates.forEach((coordinate) => {
      bounds.extend(coordinate);
    });

    map.fitBounds(bounds, {
      padding: 80,
      duration: 1200,
      maxZoom: 19,
    });
  }, [routeData]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: "100%",
        height: "75vh",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid #d1d5db",
      }}
    />
  );
}

export default IndoorMap;
