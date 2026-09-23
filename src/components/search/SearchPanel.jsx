import { useMemo, useState } from "react";
import rooms from "../../data/rooms.json";
import { useRouteFinder } from "../../hooks/useRouteFinder";

function RoomInput({ label, value, onChange, placeholder }) {
  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];

    return rooms
      .filter((room) =>
        `${room.id} ${room.name}`.toLowerCase().includes(query),
      )
      .slice(0, 6);
  }, [value]);

  return (
    <div className="route-field">
      <label>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />

      {suggestions.length > 0 && value.trim() !== "" && (
        <div className="suggestions" role="listbox">
          {suggestions.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => onChange(room.id)}
            >
              <span>{room.id}</span>
              <small>{room.name}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchPanel({ onRouteFound, onClearRoute }) {
  const [start, setStart] = useState("D101");
  const [destination, setDestination] = useState("D116");
  const [message, setMessage] = useState("");
  const { getRoute } = useRouteFinder();

  const handleSubmit = (event) => {
    event.preventDefault();

    const result = getRoute(start, destination);

    if (!result.success) {
      setMessage(result.message);
      return;
    }

    setMessage(
      result.distance > 0
        ? `${result.startRoom.id} → ${result.destinationRoom.id} · about ${result.distance} m`
        : result.message,
    );

    onRouteFound(result);
  };

  const handleSwap = () => {
    setStart(destination);
    setDestination(start);
    setMessage("");
  };

  const handleClear = () => {
    setStart("");
    setDestination("");
    setMessage("");
    onClearRoute();
  };

  return (
    <form className="search-panel" onSubmit={handleSubmit}>
      <div className="search-panel-title">
        <div>
          <span className="eyebrow">Floor 1</span>
          <h2>Indoor directions</h2>
        </div>
        <button className="clear-button" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      <div className="route-inputs">
        <div className="route-dots" aria-hidden="true">
          <span className="start-dot" />
          <span className="route-stem" />
          <span className="destination-dot" />
        </div>

        <div className="route-fields">
          <RoomInput
            label="Start"
            value={start}
            onChange={setStart}
            placeholder="Room number or name"
          />
          <RoomInput
            label="Destination"
            value={destination}
            onChange={setDestination}
            placeholder="Room number or name"
          />
        </div>

        <button
          className="swap-button"
          type="button"
          onClick={handleSwap}
          aria-label="Swap start and destination"
          title="Swap start and destination"
        >
          ⇅
        </button>
      </div>

      <button className="route-button" type="submit">
        Show route
      </button>

      {message && <p className="route-message">{message}</p>}
    </form>
  );
}

export default SearchPanel;
