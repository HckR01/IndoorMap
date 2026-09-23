const NEIGHBORS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

function key([col, row]) {
  return `${col},${row}`;
}

function isWalkable(grid, col, row) {
  if (row < 0 || col < 0 || row >= grid.rows || col >= grid.cols) {
    return false;
  }

  return grid.walkable[row]?.[col] === "1";
}

function heuristic([col, row], [targetCol, targetRow]) {
  const dx = Math.abs(targetCol - col);
  const dy = Math.abs(targetRow - row);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

export function findGridPath(grid, start, destination) {
  if (!grid || !start || !destination) return [];
  if (!isWalkable(grid, start[0], start[1])) return [];
  if (!isWalkable(grid, destination[0], destination[1])) return [];

  const startKey = key(start);
  const destinationKey = key(destination);
  const open = [{ cell: start, g: 0, f: heuristic(start, destination) }];
  const bestCost = new Map([[startKey, 0]]);
  const previous = new Map();

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    const currentKey = key(current.cell);

    if (current.g !== bestCost.get(currentKey)) continue;

    if (currentKey === destinationKey) {
      const path = [destination];
      let cursor = destinationKey;

      while (cursor !== startKey) {
        const previousCell = previous.get(cursor);
        if (!previousCell) return [];
        path.unshift(previousCell);
        cursor = key(previousCell);
      }

      return path;
    }

    const [col, row] = current.cell;

    for (const [dc, dr, moveCost] of NEIGHBORS) {
      const nextCol = col + dc;
      const nextRow = row + dr;

      if (!isWalkable(grid, nextCol, nextRow)) continue;

      if (
        dc !== 0 &&
        dr !== 0 &&
        (!isWalkable(grid, col + dc, row) || !isWalkable(grid, col, row + dr))
      ) {
        continue;
      }

      const next = [nextCol, nextRow];
      const nextKey = key(next);
      const nextCost = current.g + moveCost;

      if (nextCost >= (bestCost.get(nextKey) ?? Infinity)) continue;

      bestCost.set(nextKey, nextCost);
      previous.set(nextKey, current.cell);
      open.push({
        cell: next,
        g: nextCost,
        f: nextCost + heuristic(next, destination),
      });
    }
  }

  return [];
}

export function simplifyGridPath(path) {
  if (path.length <= 2) return path;

  const simplified = [path[0]];
  let previousDirection = null;

  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const current = path[index];
    const direction = [
      Math.sign(current[0] - previous[0]),
      Math.sign(current[1] - previous[1]),
    ];

    if (
      previousDirection &&
      (direction[0] !== previousDirection[0] ||
        direction[1] !== previousDirection[1])
    ) {
      simplified.push(previous);
    }

    previousDirection = direction;
  }

  simplified.push(path.at(-1));
  return simplified;
}

export function gridCellToCoordinate(floorData, [col, row]) {
  const { cellSize } = floorData.grid;
  const { width, height } = floorData.imageSize;
  const { west, east, south, north } = floorData.mapBounds;
  const pixelX = Math.min(width, (col + 0.5) * cellSize);
  const pixelY = Math.min(height, (row + 0.5) * cellSize);

  const longitude = west + (pixelX / width) * (east - west);
  const latitude = north - (pixelY / height) * (north - south);

  return [longitude, latitude];
}
