import { useState } from "react";
import Header from "../components/layout/Header";
import FloorLegend from "../components/map/FloorLegend";
import IndoorMap from "../components/map/IndoorMap";
import RouteInfo from "../components/navigation/RouteInfo";
import SearchPanel from "../components/search/SearchPanel";

function MapPage() {
  const [routeData, setRouteData] = useState(null);

  return (
    <main className="app-shell">
      <Header />

      <section className="navigation-layout">
        <div className="navigation-panel">
          <SearchPanel
            onRouteFound={setRouteData}
            onClearRoute={() => setRouteData(null)}
          />
          <RouteInfo routeData={routeData} />
          <FloorLegend />
        </div>

        <div className="map-panel">
          <IndoorMap routeData={routeData} />
        </div>
      </section>
    </main>
  );
}

export default MapPage;
