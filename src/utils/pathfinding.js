export function findShortestPath(nodes, edges, startNodeId, endNodeId) {
  const ids = new Set(nodes.map((node) => node.id));

  if (!ids.has(startNodeId) || !ids.has(endNodeId)) {
    return { path: [], distance: Infinity };
  }

  const distances = Object.fromEntries(nodes.map((node) => [node.id, Infinity]));
  const previous = Object.fromEntries(nodes.map((node) => [node.id, null]));
  const unvisited = new Set(ids);

  distances[startNodeId] = 0;

  while (unvisited.size) {
    let current = null;
    let smallest = Infinity;

    for (const id of unvisited) {
      if (distances[id] < smallest) {
        smallest = distances[id];
        current = id;
      }
    }

    if (current === null || smallest === Infinity) break;
    if (current === endNodeId) break;

    unvisited.delete(current);

    for (const edge of edges) {
      if (edge.from !== current && edge.to !== current) continue;

      const neighbor = edge.from === current ? edge.to : edge.from;
      if (!unvisited.has(neighbor)) continue;

      const candidate = distances[current] + Number(edge.weight || 1);

      if (candidate < distances[neighbor]) {
        distances[neighbor] = candidate;
        previous[neighbor] = current;
      }
    }
  }

  if (distances[endNodeId] === Infinity) {
    return { path: [], distance: Infinity };
  }

  const path = [];
  let cursor = endNodeId;

  while (cursor) {
    path.unshift(cursor);
    cursor = previous[cursor];
  }

  return { path, distance: distances[endNodeId] };
}
