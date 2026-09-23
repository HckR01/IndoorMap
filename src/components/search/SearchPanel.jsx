import { useState } from "react";
import rooms from "../../data/rooms.json";
import { useRouteFinder } from "../../hooks/useRouteFinder";

function SearchPanel({ onRouteFound }) {
  const [start, setStart] = useState("");
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("");

  const { getRoute } = useRouteFinder();

  const filteredStartRooms = rooms.filter((room) =>
    `${room.id} ${room.name}`.toLowerCase().includes(start.toLowerCase()),
  );

  const filteredDestinationRooms = rooms.filter((room) =>
    `${room.id} ${room.name}`.toLowerCase().includes(destination.toLowerCase()),
  );

  const handleShowRoute = () => {
    if (!start || !destination) {
      setMessage("Please enter both start and destination.");
      return;
    }

    const result = getRoute(start, destination);

    if (!result.success) {
      setMessage(result.message);
      return;
    }

    setMessage(`Route found: ${result.path.join(" → ")}`);

    if (onRouteFound) {
      onRouteFound(result);
    }
  };

  return (
    <div
      style={{
        background: "#ffffff",
        padding: "16px",
        borderRadius: "14px",
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
        marginBottom: "16px",
      }}
    >
      <h2
        style={{
          fontSize: "18px",
          marginBottom: "12px",
        }}
      >
        Find a route
      </h2>

      <div
        style={{
          display: "grid",
          gap: "12px",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              marginBottom: "6px",
              color: "#6b7280",
            }}
          >
            Start
          </label>

          <input
            type="text"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            placeholder="Example: D101"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              outline: "none",
            }}
          />

          {start && (
            <div
              style={{
                marginTop: "6px",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              {filteredStartRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setStart(room.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: "none",
                    borderBottom: "1px solid #f1f5f9",
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <strong>{room.id}</strong> — {room.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              marginBottom: "6px",
              color: "#6b7280",
            }}
          >
            Destination
          </label>

          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Example: D103"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              outline: "none",
            }}
          />

          {destination && (
            <div
              style={{
                marginTop: "6px",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              {filteredDestinationRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setDestination(room.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: "none",
                    borderBottom: "1px solid #f1f5f9",
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <strong>{room.id}</strong> — {room.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleShowRoute}
          style={{
            padding: "12px 16px",
            border: "none",
            borderRadius: "10px",
            background: "#2563eb",
            color: "#ffffff",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Show Route
        </button>

        {message && (
          <p
            style={{
              fontSize: "14px",
              color: "#475569",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default SearchPanel;
