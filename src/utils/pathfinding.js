export function findShortestPath(nodes, edges, startNodeId, endNodeId) {
  const distances = {};
  const previous = {};
  const unvisited = new Set();

  nodes.forEach((node) => {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  });

  distances[startNodeId] = 0;

  while (unvisited.size > 0) {
    let currentNodeId = null;
    let smallestDistance = Infinity;

    for (const nodeId of unvisited) {
      if (distances[nodeId] < smallestDistance) {
        smallestDistance = distances[nodeId];
        currentNodeId = nodeId;
      }
    }

    if (currentNodeId === null) {
      break;
    }

    if (currentNodeId === endNodeId) {
      break;
    }

    unvisited.delete(currentNodeId);

    const connectedEdges = edges.filter(
      (edge) => edge.from === currentNodeId || edge.to === currentNodeId,
    );

    for (const edge of connectedEdges) {
      const neighborId = edge.from === currentNodeId ? edge.to : edge.from;

      if (!unvisited.has(neighborId)) {
        continue;
      }

      const newDistance = distances[currentNodeId] + edge.weight;

      if (newDistance < distances[neighborId]) {
        distances[neighborId] = newDistance;
        previous[neighborId] = currentNodeId;
      }
    }
  }

  if (distances[endNodeId] === Infinity) {
    return [];
  }

  const path = [];
  let current = endNodeId;

  while (current) {
    path.unshift(current);
    current = previous[current];
  }

  return path;
}
