function RouteInfo({ routeData }) {
  if (!routeData?.success) return null;

  return (
    <aside className="route-info">
      <div className="route-info-main">
        <span className="route-badge">Route ready</span>
        <strong>
          {routeData.startRoom.id} → {routeData.destinationRoom.id}
        </strong>
        <span>
          {routeData.startRoom.name} to {routeData.destinationRoom.name}
        </span>
      </div>

      <div className="route-stats">
        <div>
          <strong>{routeData.distance || 0} m</strong>
          <span>approx. distance</span>
        </div>
        <div>
          <strong>{routeData.estimatedMinutes || 1} min</strong>
          <span>walking time</span>
        </div>
      </div>
    </aside>
  );
}

export default RouteInfo;
