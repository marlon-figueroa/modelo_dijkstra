export function neighbors(graph, nodeId) {
  var list = [];
    graph.edges.forEach(function (edge) {
      if (edge.from === nodeId) {
        list.push({ node: edge.to, weight: edge.weight, edgeId: edge.id });
      } else if (!graph.directed && edge.to === nodeId) {
        list.push({ node: edge.from, weight: edge.weight, edgeId: edge.id });
      }
    });
    return list;
  }

  function cloneMap(map) {
    var copy = {};
    Object.keys(map).forEach(function (key) {
      copy[key] = map[key];
    });
    return copy;
  }

  function formatValue(value) {
    return value === Infinity ? "∞" : String(value);
  }

  function reconstructPath(prev, startId, endId) {
    var path = [];
    var current = endId;
    while (current) {
      path.unshift(current);
      if (current === startId) {
        break;
      }
      current = prev[current];
    }
    if (path[0] !== startId) {
      return [];
    }
    return path;
  }

  function runDijkstra(graph, startId, endId) {
    var dist = {};
    var prev = {};
    var visited = {};
    var steps = [];

    graph.nodes.forEach(function (node) {
      dist[node.id] = Infinity;
      prev[node.id] = null;
      visited[node.id] = false;
    });

    dist[startId] = 0;
    steps.push({
      type: "init",
      message: "Se inicializan las distancias: origen = 0, el resto = ∞.",
      dist: cloneMap(dist),
      prev: cloneMap(prev),
      visited: cloneMap(visited),
      current: startId
    });

    while (true) {
      var current = null;
      var best = Infinity;

      graph.nodes.forEach(function (node) {
        if (!visited[node.id] && dist[node.id] < best) {
          best = dist[node.id];
          current = node.id;
        }
      });

      if (current === null || dist[current] === Infinity) {
        steps.push({
          type: "unreachable",
          message: "No queda ningún nodo alcanzable. No hay ruta hasta el destino.",
          dist: cloneMap(dist),
          prev: cloneMap(prev),
          visited: cloneMap(visited)
        });
        break;
      }

      steps.push({
        type: "select",
        message: "Se elige el nodo " + current + " porque tiene la menor distancia tentativa (" + dist[current] + ").",
        dist: cloneMap(dist),
        prev: cloneMap(prev),
        visited: cloneMap(visited),
        current: current
      });

      if (current === endId) {
        break;
      }

      neighbors(graph, current).forEach(function (item) {
        if (visited[item.node]) {
          return;
        }

        var candidate = dist[current] + item.weight;
        var improved = candidate < dist[item.node];

        steps.push({
          type: "relax",
          message: improved
            ? "Se relaja " + current + " → " + item.node + ": " + formatValue(dist[item.node]) + " pasa a " + candidate + "."
            : "No mejora " + current + " → " + item.node + " (" + candidate + " ≮ " + formatValue(dist[item.node]) + ").",
          dist: cloneMap(dist),
          prev: cloneMap(prev),
          visited: cloneMap(visited),
          current: current,
          from: current,
          to: item.node,
          edgeId: item.edgeId,
          improved: improved
        });

        if (improved) {
          dist[item.node] = candidate;
          prev[item.node] = current;
          steps[steps.length - 1].dist = cloneMap(dist);
          steps[steps.length - 1].prev = cloneMap(prev);
        }
      });

      visited[current] = true;
      steps.push({
        type: "visit",
        message: "El nodo " + current + " queda visitado. Su distancia mínima ya es definitiva.",
        dist: cloneMap(dist),
        prev: cloneMap(prev),
        visited: cloneMap(visited),
        current: current
      });
    }

    var path = reconstructPath(prev, startId, endId);
    var cost = dist[endId];
    steps.push({
      type: "done",
      message: path.length
        ? "Ruta más corta: " + path.join(" → ") + " con costo " + cost + "."
        : "No existe una ruta desde " + startId + " hasta " + endId + ".",
      dist: cloneMap(dist),
      prev: cloneMap(prev),
      visited: cloneMap(visited),
      path: path,
      cost: cost
    });

    return {
      steps: steps,
      path: path,
      cost: cost,
      dist: dist,
      prev: prev
    };
  }

export { runDijkstra as run };
