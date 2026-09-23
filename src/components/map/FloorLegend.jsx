const items = [
  ["Office", "legend-office"],
  ["Meeting", "legend-meeting"],
  ["Facility", "legend-facility"],
  ["Emergency", "legend-emergency"],
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
