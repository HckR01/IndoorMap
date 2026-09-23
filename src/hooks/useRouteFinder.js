import { useCallback } from "react";
import {
  findGridPath,
  gridCellToCoordinate,
  simplifyGridPath,
} from "../utils/gridPathfinding";

export function useRouteFinder(floorData) {
  const getRoute = useCallback(
    (startLocationId, destinationLocationId) => {
      if (!floorData) {
        return {
          success: false,
          message: "Floor data is still loading.",
          coordinates: [],
        };
      }

      const startLocation = floorData.locations.find(
        (location) => location.id === startLocationId,
      );
      const destinationLocation = floorData.locations.find(
        (location) => location.id === destinationLocationId,
      );

      if (!startLocation || !destinationLocation) {
        return {
          success: false,
          message: "Select both locations from the suggestions.",
          coordinates: [],
        };
      }

      if (startLocation.id === destinationLocation.id) {
        return {
          success: true,
          message: "You are already at the destination.",
          floor: floorData.floor,
          startLocation,
          destinationLocation,
          coordinates: [startLocation.entranceCoordinate],
          turns: 0,
          gridSteps: 0,
        };
      }

      const fullPath = findGridPath(
        floorData.grid,
        startLocation.grid,
        destinationLocation.grid,
      );

      if (!fullPath.length) {
        return {
          success: false,
          message: "No connected indoor path was found for these locations.",
          coordinates: [],
        };
      }

      const simplifiedPath = simplifyGridPath(fullPath);
      const coordinates = simplifiedPath.map((cell) =>
        gridCellToCoordinate(floorData, cell),
      );

      return {
        success: true,
        message: "Route ready.",
        floor: floorData.floor,
        startLocation,
        destinationLocation,
        coordinates,
        gridSteps: Math.max(0, fullPath.length - 1),
        turns: Math.max(0, simplifiedPath.length - 2),
      };
    },
    [floorData],
  );

  return { getRoute };
}
