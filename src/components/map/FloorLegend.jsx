const items = [
  ["Start", "legend-start"],
  ["Destination", "legend-destination"],
  ["Route", "legend-route"],
  ["Emergency / POI", "legend-emergency"],
];

function FloorLegend() {
  return (
    <div className="floor-legend" aria-label="Map legend">
      {items.map(([label, className]) => (
        <span key={label}>
          <i className={className} />
          {label}
        </span>
      ))}
    </div>
  );
}

export default FloorLegend;
