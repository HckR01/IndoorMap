import { useCallback } from "react";

import rooms from "../data/rooms.json";
import nodes from "../data/nodes.json";
import edges from "../data/edges.json";

import { findShortestPath } from "../utils/pathfinding";

export function useRouteFinder() {
  const getRoute = useCallback((startRoomId, destinationRoomId) => {
    const startRoom = rooms.find(
      (room) => room.id.toLowerCase() === startRoomId.toLowerCase(),
    );

    const destinationRoom = rooms.find(
      (room) => room.id.toLowerCase() === destinationRoomId.toLowerCase(),
    );

    if (!startRoom || !destinationRoom) {
      return {
        success: false,
        message: "Start room or destination room not found.",
        path: [],
        coordinates: [],
      };
    }

    const path = findShortestPath(
      nodes,
      edges,
      startRoom.nodeId,
      destinationRoom.nodeId,
    );

    if (path.length === 0) {
      return {
        success: false,
        message: "No route found between these rooms.",
        path: [],
        coordinates: [],
      };
    }

    const coordinates = path
      .map((nodeId) => {
        const node = nodes.find((item) => item.id === nodeId);

        if (!node) return null;

        return [node.x, node.y];
      })
      .filter(Boolean);

    return {
      success: true,
      message: "Route found.",
      startRoom,
      destinationRoom,
      path,
      coordinates,
    };
  }, []);

  return {
    getRoute,
  };
}
