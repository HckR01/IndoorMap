function RouteInfo({ routeData }) {
  if (!routeData?.success) return null;

  return (
    <aside className="route-info">
      <div className="route-info-main">
        <span className="route-badge">Route ready</span>
        <strong>
          {routeData.startLocation.name} → {routeData.destinationLocation.name}
        </strong>
        <span>Floor {routeData.floor} · corridor-based indoor path</span>
      </div>

      <div className="route-stats">
        <div>
          <strong>{routeData.turns}</strong>
          <span>direction changes</span>
        </div>
        <div>
          <strong>{routeData.gridSteps}</strong>
          <span>navigation cells</span>
        </div>
      </div>
    </aside>
  );
}

export default RouteInfo;
