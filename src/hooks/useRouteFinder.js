import { useCallback } from "react";
import rooms from "../data/rooms.json";
import nodes from "../data/nodes.json";
import edges from "../data/edges.json";
import { findShortestPath } from "../utils/pathfinding";

export function useRouteFinder() {
  const getRoute = useCallback((startRoomId, destinationRoomId) => {
    const startId = startRoomId.trim().toLowerCase();
    const destinationId = destinationRoomId.trim().toLowerCase();

    const startRoom = rooms.find((room) => room.id.toLowerCase() === startId);
    const destinationRoom = rooms.find((room) => room.id.toLowerCase() === destinationId);

    if (!startRoom || !destinationRoom) {
      return {
        success: false,
        message: "Choose a valid start and destination.",
        path: [],
        coordinates: [],
      };
    }

    if (startRoom.id === destinationRoom.id) {
      return {
        success: true,
        message: "You are already at the destination.",
        path: [startRoom.nodeId],
        coordinates: [startRoom.entrance],
        distance: 0,
        startRoom,
        destinationRoom,
      };
    }

    const result = findShortestPath(
      nodes,
      edges,
      startRoom.nodeId,
      destinationRoom.nodeId,
    );

    if (!result.path.length) {
      return {
        success: false,
        message: "No route is available between these rooms.",
        path: [],
        coordinates: [],
      };
    }

    const routeNodes = result.path
      .map((nodeId) => nodes.find((node) => node.id === nodeId))
      .filter(Boolean);

    const coordinates = [
      startRoom.entrance,
      ...routeNodes.map((node) => [node.x, node.y]),
      destinationRoom.entrance,
    ];

    return {
      success: true,
      message: "Route ready.",
      startRoom,
      destinationRoom,
      path: result.path,
      coordinates,
      distance: result.distance,
      estimatedMinutes: Math.max(1, Math.ceil(result.distance / 70)),
    };
  }, []);

  return { getRoute };
}
