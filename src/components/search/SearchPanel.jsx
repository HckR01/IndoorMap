import { useMemo, useState } from "react";
import { useRouteFinder } from "../../hooks/useRouteFinder";

function displayLocation(location) {
  if (!location) return "";
  if (location.room && !location.name.toLowerCase().startsWith("room ")) {
    return `${location.name} · Room ${location.room}`;
  }
  return location.name;
}

function RoomInput({
  label,
  locations,
  text,
  selectedId,
  onTextChange,
  onSelect,
  placeholder,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const suggestions = useMemo(() => {
    const query = text.trim().toLowerCase();
    if (!query || selectedId) return [];

    return locations
      .filter((location) => {
        const searchable = [
          location.id,
          location.name,
          location.room,
          ...(location.aliases || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .slice(0, 8);
  }, [locations, selectedId, text]);

  const selectLocation = (location) => {
    onSelect(location);
    setIsOpen(false);
  };

  const handleChange = (event) => {
    onTextChange(event.target.value);
    setIsOpen(true);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Enter" && isOpen && suggestions.length > 0) {
      event.preventDefault();
      selectLocation(suggestions[0]);
    }
  };

  return (
    <div
      className="route-field"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <label>{label}</label>

      <input
        type="text"
        value={text}
        onChange={handleChange}
        onFocus={() => {
          if (!selectedId && text.trim()) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-autocomplete="list"
      />

      {isOpen && suggestions.length > 0 && (
        <div className="suggestions" role="listbox">
          {suggestions.map((location) => (
            <button
              key={location.id}
              type="button"
              role="option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectLocation(location)}
            >
              <span>{displayLocation(location)}</span>
              <small>
                {location.type.replace("_", " ")}
                {location.room ? ` · detected room ${location.room}` : ""}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchPanel({ floorData, onRouteFound, onClearRoute }) {
  const [startText, setStartText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [startId, setStartId] = useState(null);
  const [destinationId, setDestinationId] = useState(null);
  const [message, setMessage] = useState("");
  const { getRoute } = useRouteFinder(floorData);
  const locations = floorData?.locations || [];

  const selectStart = (location) => {
    setStartId(location.id);
    setStartText(displayLocation(location));
    setMessage("");
  };

  const selectDestination = (location) => {
    setDestinationId(location.id);
    setDestinationText(displayLocation(location));
    setMessage("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!startId || !destinationId) {
      setMessage("Choose both locations from the suggestions.");
      return;
    }

    const result = getRoute(startId, destinationId);
    if (!result.success) {
      setMessage(result.message);
      return;
    }

    setMessage(
      `${result.startLocation.name} → ${result.destinationLocation.name}`,
    );
    onRouteFound(result);
  };

  const handleSwap = () => {
    setStartText(destinationText);
    setDestinationText(startText);
    setStartId(destinationId);
    setDestinationId(startId);
    setMessage("");
    onClearRoute();
  };

  const handleClear = () => {
    setStartText("");
    setDestinationText("");
    setStartId(null);
    setDestinationId(null);
    setMessage("");
    onClearRoute();
  };

  return (
    <form className="search-panel" onSubmit={handleSubmit}>
      <div className="search-panel-title">
        <div>
          <span className="eyebrow">{floorData?.name || "Floor"}</span>
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
            locations={locations}
            text={startText}
            selectedId={startId}
            onTextChange={(value) => {
              setStartText(value);
              setStartId(null);
              onClearRoute();
            }}
            onSelect={selectStart}
            placeholder="Company, room, lift, stairs..."
          />

          <RoomInput
            label="Destination"
            locations={locations}
            text={destinationText}
            selectedId={destinationId}
            onTextChange={(value) => {
              setDestinationText(value);
              setDestinationId(null);
              onClearRoute();
            }}
            onSelect={selectDestination}
            placeholder="Company, room, lift, stairs..."
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
