import $ from "jquery";
import { run as runDijkstra } from "./dijkstra.js";

$(function () {
  "use strict";

  var NODE_RADIUS = 24;
  var state = {
    nodes: [],
    edges: [],
    directed: false,
    mode: "node",
    origin: null,
    dest: null,
    selected: null,
    drag: null,
    nextNode: 0,
    nextEdge: 0,
    algo: null,
    stepIndex: -1,
    timer: null,
    pendingEdge: null
  };

  var $svg = $("#graph");
  var svg = $svg[0];

  function nodeLabel(index) {
    return String.fromCharCode(65 + (index % 26)) + (index >= 26 ? String(Math.floor(index / 26)) : "");
  }

  function svgPoint(evt) {
    var pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function findNode(id) {
    return state.nodes.filter(function (node) { return node.id === id; })[0];
  }

  function findEdge(id) {
    return state.edges.filter(function (edge) { return edge.id === id; })[0];
  }

  function edgeExists(a, b) {
    return state.edges.some(function (edge) {
      if (edge.from === a && edge.to === b) {
        return true;
      }
      return !state.directed && edge.from === b && edge.to === a;
    });
  }

  function shortestPathSet(path) {
    var set = {};
    if (!path) {
      return set;
    }
    path.forEach(function (id) {
      set[id] = true;
    });
    return set;
  }

  function pathEdgeSet(path) {
    var set = {};
    if (!path) {
      return set;
    }
    for (var i = 0; i < path.length - 1; i += 1) {
      set[path[i] + ">" + path[i + 1]] = true;
      set[path[i + 1] + ">" + path[i]] = true;
    }
    return set;
  }

  function currentStep() {
    if (!state.algo || state.stepIndex < 0) {
      return null;
    }
    return state.algo.steps[state.stepIndex];
  }

  function formatDist(value) {
    return value === Infinity ? "∞" : String(value);
  }

  function hintForMode() {
    if (state.mode === "node") {
      return "Haz clic en el lienzo para crear un nodo. Arrastra un nodo para reposicionarlo.";
    }
    if (state.mode === "edge") {
      return "Pulsa un nodo y luego otro para crear una arista con el peso indicado.";
    }
    return "Arrastra los nodos para reorganizar el grafo.";
  }

  function updateSelects() {
    var origin = $("#select-origin").val();
    var dest = $("#select-dest").val();
    var originHtml = '<option value="">—</option>';
    var destHtml = '<option value="">—</option>';

    state.nodes.forEach(function (node) {
      originHtml += '<option value="' + node.id + '">' + node.id + "</option>";
      destHtml += '<option value="' + node.id + '">' + node.id + "</option>";
    });

    $("#select-origin").html(originHtml);
    $("#select-dest").html(destHtml);

    if (state.nodes.some(function (node) { return node.id === origin; })) {
      $("#select-origin").val(origin);
      state.origin = origin;
    } else if (state.origin && state.nodes.some(function (node) { return node.id === state.origin; })) {
      $("#select-origin").val(state.origin);
    } else {
      state.origin = null;
    }

    if (state.nodes.some(function (node) { return node.id === dest; })) {
      $("#select-dest").val(dest);
      state.dest = dest;
    } else if (state.dest && state.nodes.some(function (node) { return node.id === state.dest; })) {
      $("#select-dest").val(state.dest);
    } else {
      state.dest = null;
    }
  }

  function renderTable(step) {
    var html = "";
    state.nodes.forEach(function (node) {
      var dist = step ? step.dist[node.id] : "";
      var prev = step && step.prev[node.id] ? step.prev[node.id] : "—";
      var cls = "";
      if (step && step.current === node.id) {
        cls = "is-current";
      }
      if (step && step.path && step.path.indexOf(node.id) !== -1) {
        cls = "is-path";
      }
      html += "<tr class='" + cls + "'><td>" + node.id + "</td><td>" +
        (dist === "" ? "—" : formatDist(dist)) + "</td><td>" + prev + "</td></tr>";
    });
    $("#dist-table tbody").html(html);
  }

  function renderLog() {
    if (!state.algo || state.stepIndex < 0) {
      $("#log").empty();
      return;
    }
    var html = "";
    state.algo.steps.slice(0, state.stepIndex + 1).forEach(function (step, index) {
      html += "<li class='" + (index === state.stepIndex ? "active" : "") + "'>" + step.message + "</li>";
    });
    $("#log").html(html);
    var active = $("#log li.active")[0];
    if (active) {
      active.scrollIntoView({ block: "nearest" });
    }
  }

  function renderResult(step) {
    if (!step || step.type !== "done") {
      if (!state.algo) {
        $("#result").attr("class", "result empty").text("Elige origen y destino, luego calcula la ruta más corta.");
      }
      return;
    }
    if (step.path.length) {
      $("#result").attr("class", "result ok").html(
        "Ruta más corta: <strong>" + step.path.join(" → ") + "</strong><br>Costo total: <strong>" + step.cost + "</strong>"
      );
    } else {
      $("#result").attr("class", "result fail").text(step.message);
    }
  }

  function nodeKind(node, step, pathNodes) {
    if (pathNodes[node.id]) {
      return "is-path";
    }
    if (state.origin === node.id) {
      return "is-origin";
    }
    if (state.dest === node.id) {
      return "is-dest";
    }
    if (step && step.current === node.id) {
      return "is-current";
    }
    if (step && step.visited && step.visited[node.id]) {
      return "is-visited";
    }
    return "is-idle";
  }

  function render() {
    var step = currentStep();
    var path = step && step.path ? step.path : [];
    var pathNodes = shortestPathSet(path);
    var pathEdges = pathEdgeSet(path);
    var $edges = $("#edges").empty();
    var $nodes = $("#nodes").empty();

    state.edges.forEach(function (edge) {
      var from = findNode(edge.from);
      var to = findNode(edge.to);
      if (!from || !to) {
        return;
      }

      var dx = to.x - from.x;
      var dy = to.y - from.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / len;
      var uy = dy / len;
      var x1 = from.x + ux * NODE_RADIUS;
      var y1 = from.y + uy * NODE_RADIUS;
      var x2 = to.x - ux * NODE_RADIUS;
      var y2 = to.y - uy * NODE_RADIUS;
      var mx = (from.x + to.x) / 2;
      var my = (from.y + to.y) / 2;
      var isPath = pathEdges[edge.from + ">" + edge.to];
      var isRelax = step && step.edgeId === edge.id;
      var cls = "edge-line" + (isPath ? " is-path" : "") + (isRelax ? " is-relax" : "");
      var marker = state.directed ? (isPath ? "url(#arrow-path)" : isRelax ? "url(#arrow-active)" : "url(#arrow)") : "";

      $edges.append($(document.createElementNS("http://www.w3.org/2000/svg", "line")).attr({
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        "class": cls,
        "marker-end": marker,
        "data-id": edge.id
      }));

      $edges.append($(document.createElementNS("http://www.w3.org/2000/svg", "circle")).attr({
        cx: mx,
        cy: my,
        r: 14,
        "class": "weight-hit" + (isPath ? " is-path" : ""),
        "data-id": edge.id
      }));

      $edges.append($(document.createElementNS("http://www.w3.org/2000/svg", "text")).attr({
        x: mx,
        y: my + 4,
        "text-anchor": "middle",
        "font-size": 11,
        "class": "weight-label" + (isPath ? " is-path" : "")
      }).text(edge.weight));
    });

    state.nodes.forEach(function (node) {
      var kind = nodeKind(node, step, pathNodes);
      var group = $(document.createElementNS("http://www.w3.org/2000/svg", "g")).attr({
        "class": "node-group " + kind + (state.selected === node.id ? " is-selected" : ""),
        "data-id": node.id,
        transform: "translate(" + node.x + "," + node.y + ")"
      });

      group.append($(document.createElementNS("http://www.w3.org/2000/svg", "circle")).attr({
        r: NODE_RADIUS,
        "class": "node-circle"
      }));

      group.append($(document.createElementNS("http://www.w3.org/2000/svg", "text")).attr({
        y: 5,
        "text-anchor": "middle",
        "font-size": 15,
        "font-weight": 700,
        "class": "node-label"
      }).text(node.id));

      if (step && step.dist) {
        group.append($(document.createElementNS("http://www.w3.org/2000/svg", "text")).attr({
          y: NODE_RADIUS + 16,
          "text-anchor": "middle",
          "font-size": 11,
          "class": "dist-label"
        }).text(formatDist(step.dist[node.id])));
      }

      $nodes.append(group);
    });

    $("#hint").text(hintForMode());
    renderTable(step);
    renderLog();
    renderResult(step);
  }

  function stopTimer() {
    if (state.timer) {
      window.clearInterval(state.timer);
      state.timer = null;
    }
  }

  function clearAlgorithm() {
    stopTimer();
    state.algo = null;
    state.stepIndex = -1;
  }

  function addNode(x, y, id) {
    var label = id || nodeLabel(state.nextNode);
    state.nextNode += 1;
    state.nodes.push({
      id: label,
      x: Math.max(40, Math.min(880, x)),
      y: Math.max(40, Math.min(520, y))
    });
    if (!state.origin) {
      state.origin = label;
    } else if (!state.dest && label !== state.origin) {
      state.dest = label;
    }
    clearAlgorithm();
    updateSelects();
    render();
  }

  function addEdge(from, to, weight) {
    if (from === to || edgeExists(from, to)) {
      return;
    }
    state.edges.push({
      id: "e" + state.nextEdge,
      from: from,
      to: to,
      weight: Number(weight) || 1
    });
    state.nextEdge += 1;
    clearAlgorithm();
    render();
  }

  function loadExample() {
    state.nodes = [];
    state.edges = [];
    state.nextNode = 7;
    state.nextEdge = 0;
    state.selected = null;
    clearAlgorithm();

    [
      { id: "A", x: 120, y: 140 },
      { id: "B", x: 340, y: 90 },
      { id: "C", x: 560, y: 120 },
      { id: "D", x: 780, y: 180 },
      { id: "E", x: 250, y: 320 },
      { id: "F", x: 470, y: 360 },
      { id: "G", x: 700, y: 390 }
    ].forEach(function (node) {
      state.nodes.push(node);
    });

    [
      ["A", "B", 4],
      ["A", "E", 2],
      ["B", "C", 3],
      ["B", "E", 5],
      ["B", "F", 1],
      ["C", "D", 2],
      ["C", "F", 6],
      ["E", "F", 8],
      ["F", "G", 3],
      ["D", "G", 4]
    ].forEach(function (item) {
      addEdge(item[0], item[1], item[2]);
    });

    state.origin = "A";
    state.dest = "G";
    updateSelects();
    $("#select-origin").val("A");
    $("#select-dest").val("G");
    $("#result").attr("class", "result empty").text("Grafo de ejemplo listo. Calcula la ruta más corta de A a G.");
    render();
  }

  function prepareAlgorithm() {
    state.origin = $("#select-origin").val();
    state.dest = $("#select-dest").val();
    if (!state.origin || !state.dest) {
      $("#result").attr("class", "result fail").text("Selecciona un origen y un destino.");
      return false;
    }
    if (state.origin === state.dest) {
      $("#result").attr("class", "result fail").text("El origen y el destino deben ser distintos.");
      return false;
    }
    state.directed = $("#directed").is(":checked");
    state.algo = runDijkstra({
      nodes: state.nodes,
      edges: state.edges,
      directed: state.directed
    }, state.origin, state.dest);
    state.stepIndex = 0;
    return true;
  }

  function showStep() {
    render();
    if (state.algo && state.stepIndex >= state.algo.steps.length - 1) {
      stopTimer();
    }
  }

  function runAll() {
    stopTimer();
    if (!prepareAlgorithm()) {
      return;
    }
    var delay = 1600 - Number($("#speed").val());
    state.timer = window.setInterval(function () {
      if (state.stepIndex < state.algo.steps.length - 1) {
        state.stepIndex += 1;
        showStep();
      } else {
        stopTimer();
      }
    }, delay);
    showStep();
  }

  function runStep() {
    stopTimer();
    if (!state.algo) {
      if (!prepareAlgorithm()) {
        return;
      }
      showStep();
      return;
    }
    if (state.stepIndex < state.algo.steps.length - 1) {
      state.stepIndex += 1;
      showStep();
    }
  }

  function hitNode(evt) {
    var point = svgPoint(evt);
    var found = null;
    state.nodes.forEach(function (node) {
      var dx = point.x - node.x;
      var dy = point.y - node.y;
      if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
        found = node;
      }
    });
    return found;
  }

  function hitEdge(evt) {
    var target = evt.target;
    var id = target.getAttribute && target.getAttribute("data-id");
    if (id && findEdge(id)) {
      return findEdge(id);
    }
    return null;
  }

  function openWeightModal(edge, from, to) {
    state.pendingEdge = { edge: edge, from: from, to: to };
    $("#weight-copy").text(edge
      ? "Edita el costo de " + edge.from + " — " + edge.to + "."
      : "Define el costo entre " + from + " y " + to + ".");
    $("#modal-weight").val(edge ? edge.weight : $("#edge-weight").val() || 1);
    $("#weight-modal").removeClass("hidden");
    $("#modal-weight").trigger("focus").trigger("select");
  }

  $svg.on("mousedown", function (evt) {
    if (evt.button !== 0) {
      return;
    }
    var node = hitNode(evt);
    if (node) {
      state.drag = {
        id: node.id,
        moved: false,
        startX: node.x,
        startY: node.y,
        point: svgPoint(evt)
      };
    }
  });

  $svg.on("mousemove", function (evt) {
    if (!state.drag) {
      return;
    }
    var point = svgPoint(evt);
    var node = findNode(state.drag.id);
    var dx = point.x - state.drag.point.x;
    var dy = point.y - state.drag.point.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) {
      state.drag.moved = true;
    }
    if (state.mode === "move" || state.drag.moved) {
      node.x = Math.max(40, Math.min(880, state.drag.startX + dx));
      node.y = Math.max(40, Math.min(520, state.drag.startY + dy));
      render();
    }
  });

  $svg.on("mouseup mouseleave", function (evt) {
    if (!state.drag) {
      return;
    }
    var drag = state.drag;
    state.drag = null;
    if (drag.moved) {
      return;
    }

    var node = findNode(drag.id);
    if (state.mode === "edge") {
      if (!state.selected) {
        state.selected = node.id;
        render();
        return;
      }
      if (state.selected !== node.id) {
        openWeightModal(null, state.selected, node.id);
      }
      state.selected = null;
      render();
      return;
    }

    if (evt.type === "mouseup" && node) {
      if (!state.origin) {
        state.origin = node.id;
      } else if (!state.dest && node.id !== state.origin) {
        state.dest = node.id;
      }
      updateSelects();
      $("#select-origin").val(state.origin);
      $("#select-dest").val(state.dest);
      render();
    }
  });

  $svg.on("click", function (evt) {
    var edge = hitEdge(evt);
    if (edge && $(evt.target).is(".weight-hit, .weight-label")) {
      openWeightModal(edge);
      return;
    }
    if (state.mode !== "node" || hitNode(evt) || state.drag) {
      return;
    }
    var point = svgPoint(evt);
    addNode(point.x, point.y);
  });

  $svg.on("dblclick", function (evt) {
    var node = hitNode(evt);
    if (!node) {
      return;
    }
    if (state.origin === node.id) {
      state.origin = state.dest;
      state.dest = node.id;
    } else {
      state.dest = node.id;
    }
    updateSelects();
    $("#select-origin").val(state.origin);
    $("#select-dest").val(state.dest);
    render();
  });

  $(".mode").on("click", function () {
    state.mode = $(this).data("mode");
    state.selected = null;
    $(".mode").removeClass("active");
    $(this).addClass("active");
    $svg.css("cursor", state.mode === "move" ? "grab" : "crosshair");
    render();
  });

  $("#select-origin").on("change", function () {
    state.origin = $(this).val() || null;
    clearAlgorithm();
    render();
  });

  $("#select-dest").on("change", function () {
    state.dest = $(this).val() || null;
    clearAlgorithm();
    render();
  });

  $("#directed").on("change", function () {
    state.directed = $(this).is(":checked");
    clearAlgorithm();
    render();
  });

  $("#btn-run").on("click", runAll);
  $("#btn-step").on("click", runStep);
  $("#btn-reset").on("click", function () {
    clearAlgorithm();
    render();
  });
  $("#btn-example").on("click", loadExample);
  $("#btn-clear").on("click", function () {
    stopTimer();
    state.nodes = [];
    state.edges = [];
    state.origin = null;
    state.dest = null;
    state.selected = null;
    state.nextNode = 0;
    state.nextEdge = 0;
    clearAlgorithm();
    updateSelects();
    render();
  });

  $("#modal-cancel").on("click", function () {
    state.pendingEdge = null;
    $("#weight-modal").addClass("hidden");
  });

  $("#modal-ok").on("click", function () {
    var weight = Number($("#modal-weight").val());
    if (!(weight >= 0)) {
      return;
    }
    var pending = state.pendingEdge;
    if (pending && pending.edge) {
      pending.edge.weight = weight;
    } else if (pending) {
      addEdge(pending.from, pending.to, weight);
    }
    $("#edge-weight").val(weight);
    state.pendingEdge = null;
    $("#weight-modal").addClass("hidden");
    clearAlgorithm();
    render();
  });

  $(document).on("keydown", function (evt) {
    if (evt.key === "Escape") {
      $("#weight-modal").addClass("hidden");
      state.selected = null;
      render();
    }
    if ((evt.key === "Backspace" || evt.key === "Delete") && state.selected) {
      state.nodes = state.nodes.filter(function (node) { return node.id !== state.selected; });
      state.edges = state.edges.filter(function (edge) {
        return edge.from !== state.selected && edge.to !== state.selected;
      });
      if (state.origin === state.selected) {
        state.origin = null;
      }
      if (state.dest === state.selected) {
        state.dest = null;
      }
      state.selected = null;
      updateSelects();
      clearAlgorithm();
      render();
    }
  });

  loadExample();
});
