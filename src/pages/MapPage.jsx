import { useState } from "react";
import IndoorMap from "../components/map/IndoorMap";
import SearchPanel from "../components/search/SearchPanel";

function MapPage() {
  const [routeData, setRouteData] = useState(null);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "16px 20px",
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <h1
          style={{
            fontSize: "22px",
            fontWeight: "700",
          }}
        >
          Indoor Navigation
        </h1>

        <p
          style={{
            marginTop: "4px",
            color: "#6b7280",
            fontSize: "14px",
          }}
        >
          Select a start point and destination
        </p>
      </header>

      <section
        style={{
          flex: 1,
          padding: "16px",
        }}
      >
        <SearchPanel onRouteFound={setRouteData} />

        <IndoorMap routeData={routeData} />
      </section>
    </main>
  );
}

export default MapPage;
