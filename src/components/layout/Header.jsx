function Header({ floors, currentFloor, onFloorChange }) {
  return (
    <header className="app-header">
      <div>
        <span className="eyebrow">Automated floor-plan navigation</span>
        <h1>IndoorMap</h1>
      </div>

      <label className="floor-picker">
        <span>Floor</span>
        <select
          value={currentFloor ?? ""}
          onChange={(event) => onFloorChange(Number(event.target.value))}
          disabled={!floors.length}
        >
          {floors.map((floor) => (
            <option key={floor.floor} value={floor.floor}>
              {floor.name}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}

export default Header;
