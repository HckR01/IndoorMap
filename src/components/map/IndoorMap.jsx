import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";

function IndoorMap() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (mapRef.current) return;

    try {
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
                "background-color": "#dbeafe",
              },
            },
          ],
        },

        center: [0, 0],
        zoom: 2,
        pitch: 30,
        bearing: 0,

        attributionControl: false,
      });

      mapRef.current = map;

      map.on("load", () => {
        console.log("MapLibre loaded successfully");
        setLoaded(true);
      });

      map.on("error", (event) => {
        console.error("MapLibre error:", event.error);
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error("Map initialization failed:", err);

      setError(err.message);
    }
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "650px",
        background: "#cbd5e1",
        border: "3px solid #2563eb",
        borderRadius: "16px",
        overflow: "hidden",
      }}
    >
      <div
        ref={mapContainer}
        style={{
          width: "100%",
          height: "100%",
        }}
      />

      {!loaded && !error && (
        <div
          style={{
            position: "absolute",
            left: "20px",
            bottom: "20px",
            background: "white",
            padding: "10px 16px",
            borderRadius: "8px",
            zIndex: 10,
          }}
        >
          Loading MapLibre...
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            left: "20px",
            bottom: "20px",
            right: "20px",
            background: "#fee2e2",
            padding: "15px",
            borderRadius: "8px",
            color: "#991b1b",
            zIndex: 10,
          }}
        >
          Map Error: {error}
        </div>
      )}
    </div>
  );
}

export default IndoorMap;
