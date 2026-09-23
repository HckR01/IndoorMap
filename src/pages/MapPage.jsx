import { useEffect, useState } from "react";
import Header from "../components/layout/Header";
import FloorLegend from "../components/map/FloorLegend";
import IndoorMap from "../components/map/IndoorMap";
import RouteInfo from "../components/navigation/RouteInfo";
import SearchPanel from "../components/search/SearchPanel";

function MapPage() {
  const [floors, setFloors] = useState([]);
  const [currentFloor, setCurrentFloor] = useState(null);
  const [floorData, setFloorData] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadManifest() {
      try {
        const response = await fetch("/floors/manifest.json");
        if (!response.ok) throw new Error("Floor manifest could not be loaded.");

        const manifest = await response.json();
        const availableFloors = manifest.floors || [];
        if (cancelled) return;

        setFloors(availableFloors);
        setCurrentFloor(availableFloors[0]?.floor ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          setLoading(false);
        }
      }
    }

    loadManifest();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (currentFloor === null) return;

    let cancelled = false;
    const floor = floors.find((item) => item.floor === currentFloor);
    if (!floor) return;

    setLoading(true);
    setError("");
    setRouteData(null);

    async function loadFloor() {
      try {
        const response = await fetch(floor.data);
        if (!response.ok) {
          throw new Error(`Floor ${currentFloor} could not be loaded.`);
        }

        const data = await response.json();
        if (!cancelled) setFloorData(data);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFloor();

    return () => {
      cancelled = true;
    };
  }, [currentFloor, floors]);

  return (
    <main className="app-shell">
      <Header
        floors={floors}
        currentFloor={currentFloor}
        onFloorChange={setCurrentFloor}
      />

      <section className="navigation-layout">
        <div className="navigation-panel">
          {floorData && !loading && (
            <>
              <SearchPanel
                floorData={floorData}
                onRouteFound={setRouteData}
                onClearRoute={() => setRouteData(null)}
              />
              <RouteInfo routeData={routeData} />
              <FloorLegend />
            </>
          )}

          {loading && (
            <div className="status-card">Analyzed floor data loading…</div>
          )}

          {error && <div className="status-card status-error">{error}</div>}
        </div>

        <div className="map-panel">
          {floorData && !loading ? (
            <IndoorMap floorData={floorData} routeData={routeData} />
          ) : (
            <div className="map-shell map-placeholder">
              Loading floor plan…
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default MapPage;
