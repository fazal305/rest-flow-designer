let workspace = null;
let currentFlow = null;
let selectedNodeId = null;
let selectedConnectionId = null;
let pendingConnection = null;
let zoomLevel = 1;
let dragState = null;
let saveModal = null;

const templates = [
    { id: "", name: "Starter templates" },
    { id: "fetch-post", name: "Fetch and Post" },
    { id: "transform-pipeline", name: "Transform Pipeline" },
    { id: "condition-demo", name: "Conditional Branch Demo" }
];

const paletteNodes = [
    { type: "request", title: "Request", copy: "Call a real URL with fetch()." },
    { type: "transform", title: "Transform", copy: "Run JavaScript against input." },
    { type: "condition", title: "Condition", copy: "Route true or false branches." },
    { type: "delay", title: "Delay", copy: "Wait with setTimeout." },
    { type: "output", title: "Output/Log", copy: "Capture a final result." }
];

function freshFlow() {
    return {
        id: RestFlow.generateId("flow"),
        name: "Untitled Flow",
        description: "",
        tags: [],
        nodes: [],
        connections: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

function createDesignerNode(type, x, y) {
    const labels = {
        request: "New Request",
        transform: "New Transform",
        condition: "New Condition",
        delay: "New Delay",
        output: "New Output"
    };
    const configs = {
        request: { method: "GET", url: "https://jsonplaceholder.typicode.com/users/1", headers: [], bodyTemplate: "", useInputAsBody: false },
        transform: { expression: "return input;" },
        condition: { expression: "Boolean(input)", trueLabel: "Continue", falseLabel: "Stop" },
        delay: { ms: workspace.settings.transitionSpeedMs },
        output: { outputLabel: "Captured output" }
    };
    return { id: RestFlow.generateId("node"), type, label: labels[type], position: { x, y }, config: configs[type] };
}

function persistDraft() {
    currentFlow.updatedAt = new Date().toISOString();
    workspace.currentFlowDraft = currentFlow;
    RestFlow.saveWorkspace(workspace);
}

function nodeSummary(node) {
    if (node.type === "request") return `${node.config.method || "GET"} ${node.config.url || "No URL"}`;
    if (node.type === "transform") return (node.config.expression || "").slice(0, 90);
    if (node.type === "condition") return `if (${node.config.expression || "Boolean(input)"})`;
    if (node.type === "delay") return `${node.config.ms || 0}ms wait`;
    return node.config.outputLabel || "Captured output";
}

function renderPalette() {
    $("#paletteList").html(paletteNodes.map((item) => `
    <button class="palette-node ${item.type}" draggable="true" data-node-type="${item.type}">
      <span class="palette-node-title">${RestFlow.escapeHtml(item.title)}</span>
      <span class="palette-node-text">${RestFlow.escapeHtml(item.copy)}</span>
    </button>
  `).join(""));
}

function renderTemplates() {
    $("#templateSelect").html(templates.map((item) => `<option value="${item.id}">${RestFlow.escapeHtml(item.name)}</option>`).join(""));
}

function renderCanvas() {
    $("#nodeCount").text(`${currentFlow.nodes.length} nodes`);
    $("#connectionCount").text(`${currentFlow.connections.length} connections`);
    $("#zoomLabel").text(`${Math.round(zoomLevel * 100)}%`);
    $("#flowCanvas").css("transform", `scale(${zoomLevel})`);

    renderConnections();

    $("#nodeLayer").html(currentFlow.nodes.map((node) => `
    <article class="flow-node ${node.type} ${node.id === selectedNodeId ? "selected" : ""}"
      data-node-id="${node.id}"
      style="left:${node.position.x}px;top:${node.position.y}px">
      <div class="node-port input" data-port-role="input" data-node-id="${node.id}" data-port="input"></div>
      <div class="node-title-row">
        <h3 class="node-title">${RestFlow.escapeHtml(node.label)}</h3>
        <span class="node-chip ${node.type}">${RestFlow.escapeHtml(RestFlow.nodeTypeConfig[node.type].label)}</span>
      </div>
      <p class="node-summary">${RestFlow.escapeHtml(nodeSummary(node))}</p>
      ${node.type === "condition" ? `
        <span class="port-label true">${RestFlow.escapeHtml(node.config.trueLabel || "true")}</span>
        <span class="node-port output true" data-port-role="output" data-node-id="${node.id}" data-port="true"></span>
        <span class="port-label false">${RestFlow.escapeHtml(node.config.falseLabel || "false")}</span>
        <span class="node-port output false" data-port-role="output" data-node-id="${node.id}" data-port="false"></span>
      ` : `<span class="node-port output" data-port-role="output" data-node-id="${node.id}" data-port="default"></span>`}
    </article>
  `).join(""));

    renderConfigPanel();
}

function renderConnections() {
    const nodesById = new Map(currentFlow.nodes.map((node) => [node.id, node]));
    const paths = currentFlow.connections.map((connection) => {
        const from = nodesById.get(connection.fromNodeId);
        const to = nodesById.get(connection.toNodeId);
        if (!from || !to) return "";
        const startX = from.position.x + 208;
        const startY = from.position.y + (connection.fromPort === "true" ? 36 : connection.fromPort === "false" ? 92 : 52);
        const endX = to.position.x;
        const endY = to.position.y + 52;
        const midX = (startX + endX) / 2;
        const branchClass = connection.fromPort === "true" ? "condition-true" : connection.fromPort === "false" ? "condition-false" : "";
        return `<path class="connection-path ${branchClass} ${connection.id === selectedConnectionId ? "selected" : ""}" data-connection-id="${connection.id}" d="M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}"></path>`;
    }).join("");

    $("#connectionLayer").html(`
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="var(--primary)"></path>
      </marker>
    </defs>
    ${paths.replaceAll('class="connection-path', 'marker-end="url(#arrow)" class="connection-path')}
  `);
}

function addNode(type, position) {
    const fallback = { x: 120 + currentFlow.nodes.length * 34, y: 100 + currentFlow.nodes.length * 28 };
    const node = createDesignerNode(type, position?.x ?? fallback.x, position?.y ?? fallback.y);
    currentFlow.nodes.push(node);
    selectedNodeId = node.id;
    selectedConnectionId = null;
    persistDraft();
    renderCanvas();
}

function moveNode(id, position) {
    const node = currentFlow.nodes.find((item) => item.id === id);
    if (!node) return;
    node.position = position;
    persistDraft();
    renderCanvas();
}

function selectNode(id) {
    selectedNodeId = id;
    selectedConnectionId = null;
    renderCanvas();
}

function updateNodeConfig(id, field, value) {
    const node = currentFlow.nodes.find((item) => item.id === id);
    if (!node) return;

    if (field === "label") node.label = value;
    else node.config[field] = value;

    persistDraft();
    renderCanvas();
}

function deleteNode(id) {
    currentFlow.nodes = currentFlow.nodes.filter((node) => node.id !== id);
    currentFlow.connections = currentFlow.connections.filter((connection) => connection.fromNodeId !== id && connection.toNodeId !== id);
    if (selectedNodeId === id) selectedNodeId = null;
    persistDraft();
    renderCanvas();
}

function startConnection(fromNodeId, fromPort) {
    pendingConnection = { fromNodeId, fromPort };
    RestFlow.showStatus("Select another node input to complete the connection.", "success");
}

function completeConnection(toNodeId, toPort) {
    if (!pendingConnection || pendingConnection.fromNodeId === toNodeId) return;
    currentFlow.connections.push({
        id: RestFlow.generateId("conn"),
        fromNodeId: pendingConnection.fromNodeId,
        fromPort: pendingConnection.fromPort,
        toNodeId,
        toPort
    });
    pendingConnection = null;
    persistDraft();
    renderCanvas();
}

function deleteConnection(id) {
    currentFlow.connections = currentFlow.connections.filter((connection) => connection.id !== id);
    selectedConnectionId = null;
    persistDraft();
    renderCanvas();
}

function setZoom(level) {
    zoomLevel = Math.max(0.4, Math.min(1.8, Number(level)));
    renderCanvas();
}

function fitToScreen() {
    if (!currentFlow.nodes.length) return setZoom(workspace.settings.defaultZoom);
    setZoom(0.85);
}

function buildTemplate(templateId) {
    const flow = freshFlow();
    const add = (type, label, x, y, config) => {
        const node = createDesignerNode(type, x, y);
        node.label = label;
        node.config = { ...node.config, ...(config || {}) };
        flow.nodes.push(node);
        return node;
    };
    const connect = (from, port, to) => flow.connections.push({ id: RestFlow.generateId("conn"), fromNodeId: from.id, fromPort: port, toNodeId: to.id, toPort: "input" });

    if (templateId === "fetch-post") {
        flow.name = "Fetch and Post Demo";
        const a = add("request", "Get User", 120, 100, { method: "GET", url: "https://jsonplaceholder.typicode.com/users/1" });
        const b = add("transform", "Shape Payload", 390, 100, { expression: "return { name: input.name, email: input.email, company: input.company?.name };" });
        const c = add("request", "Post Summary", 660, 100, { method: "POST", url: "https://jsonplaceholder.typicode.com/posts", headers: [{ name: "Content-Type", value: "application/json" }], useInputAsBody: true });
        const d = add("output", "Capture Response", 930, 100);
        connect(a, "default", b); connect(b, "default", c); connect(c, "default", d);
    }

    if (templateId === "transform-pipeline") {
        flow.name = "Transform Pipeline";
        const a = add("request", "Get Todo", 120, 120, { url: "https://jsonplaceholder.typicode.com/todos/1" });
        const b = add("transform", "Normalize", 390, 120, { expression: "return { id: input.id, title: input.title, completed: input.completed };" });
        const c = add("transform", "Add Metadata", 660, 120, { expression: "return { ...input, exportedAt: new Date().toISOString() };" });
        const d = add("output", "Final Todo", 930, 120);
        connect(a, "default", b); connect(b, "default", c); connect(c, "default", d);
    }

    if (templateId === "condition-demo") {
        flow.name = "Conditional Branch Demo";
        const a = add("request", "Get Post", 120, 160, { url: "https://jsonplaceholder.typicode.com/posts/1" });
        const b = add("condition", "Has Title", 400, 160, { expression: "Boolean(input.title)", trueLabel: "Has title", falseLabel: "Missing title" });
        const c = add("output", "Success Output", 710, 80);
        const d = add("output", "Fallback Output", 710, 250);
        connect(a, "default", b); connect(b, "true", c); connect(b, "false", d);
    }

    return flow;
}

function applyFlowTemplate(templateId) {
    if (!templateId) return;
    currentFlow = buildTemplate(templateId);
    selectedNodeId = null;
    selectedConnectionId = null;
    persistDraft();
    renderCanvas();
    RestFlow.showStatus("Template applied to the canvas.", "success");
}

function saveFlow() {
    $("#flowName").val(currentFlow.name || "");
    $("#flowDescription").val(currentFlow.description || "");
    $("#flowTags").val((currentFlow.tags || []).join(", "));
    saveModal.show();
}

function resetCanvas() {
    if (!window.confirm("Reset the current canvas?")) return;
    currentFlow = freshFlow();
    selectedNodeId = null;
    selectedConnectionId = null;
    persistDraft();
    renderCanvas();
}

function renderConfigPanel() {
    const node = currentFlow.nodes.find((item) => item.id === selectedNodeId);

    if (selectedConnectionId) {
        $("#configPanel").html(`
      <p class="panel-text">Connection selected.</p>
      <button class="btn btn-danger" id="deleteConnectionBtn">Delete Connection</button>
    `);
        return;
    }

    if (!node) {
        $("#configPanel").html(RestFlow.renderEmptyState("Select a node to edit its configuration."));
        return;
    }

    const common = `
    <div>
      <label class="form-label">Label</label>
      <input class="form-control" data-config-field="label" value="${RestFlow.escapeHtml(node.label)}">
    </div>
  `;

    let specific = "";

    if (node.type === "request") {
        specific = `
      <div>
        <label class="form-label">Method</label>
        <select class="form-select" data-config-field="method">
          ${["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => `<option ${node.config.method === method ? "selected" : ""}>${method}</option>`).join("")}
        </select>
      </div>
      <div>
        <label class="form-label">URL</label>
        <input class="form-control" data-config-field="url" value="${RestFlow.escapeHtml(node.config.url || "")}">
      </div>
      <div class="form-check">
        <input class="form-check-input" type="checkbox" id="useInputAsBody" data-config-field="useInputAsBody" ${node.config.useInputAsBody ? "checked" : ""}>
        <label class="form-check-label" for="useInputAsBody">Use incoming data as request body</label>
      </div>
      <div>
        <label class="form-label">Body Template</label>
        <textarea class="form-control code-panel" rows="5" data-config-field="bodyTemplate">${RestFlow.escapeHtml(node.config.bodyTemplate || "")}</textarea>
      </div>
      <div>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <label class="form-label mb-0">Headers</label>
          <button class="btn btn-sm btn-outline-primary" id="addHeaderBtn" type="button">Add Header</button>
        </div>
        <div id="headersList">${(node.config.headers || []).map((header, index) => `
          <div class="key-value-row mb-2" data-header-index="${index}">
            <input class="form-control" data-header-key value="${RestFlow.escapeHtml(header.name || "")}" placeholder="Name">
            <input class="form-control" data-header-value value="${RestFlow.escapeHtml(header.value || "")}" placeholder="Value">
            <button class="btn btn-sm btn-danger" data-remove-header="${index}" type="button">×</button>
          </div>
        `).join("")}</div>
      </div>
    `;
    }

    if (node.type === "transform") {
        specific = `<label class="form-label">Expression</label><textarea class="form-control code-panel" data-config-field="expression">${RestFlow.escapeHtml(node.config.expression || "")}</textarea>`;
    }

    if (node.type === "condition") {
        specific = `
      <label class="form-label">Boolean Expression</label>
      <textarea class="form-control code-panel" data-config-field="expression">${RestFlow.escapeHtml(node.config.expression || "")}</textarea>
      <label class="form-label">True Port Label</label>
      <input class="form-control" data-config-field="trueLabel" value="${RestFlow.escapeHtml(node.config.trueLabel || "")}">
      <label class="form-label">False Port Label</label>
      <input class="form-control" data-config-field="falseLabel" value="${RestFlow.escapeHtml(node.config.falseLabel || "")}">
    `;
    }

    if (node.type === "delay") {
        specific = `<label class="form-label">Duration in milliseconds</label><input class="form-control" type="number" min="0" data-config-field="ms" value="${Number(node.config.ms || 0)}">`;
    }

    if (node.type === "output") {
        specific = `<label class="form-label">Output Label</label><input class="form-control" data-config-field="outputLabel" value="${RestFlow.escapeHtml(node.config.outputLabel || "")}">`;
    }

    $("#configPanel").html(`<div class="config-section">${common}${specific}<button class="btn btn-danger" id="deleteNodeBtn">Delete Node</button></div>`);
}

function bindDesignerEvents() {
    $(document).on("click", ".palette-node", function () {
        addNode($(this).data("node-type"));
    });

    $(document).on("dragstart", ".palette-node", function (event) {
        event.originalEvent.dataTransfer.setData("node-type", $(this).data("node-type"));
    });

    $("#canvasWrap").on("dragover", (event) => event.preventDefault());
    $("#canvasWrap").on("drop", function (event) {
        event.preventDefault();
        const type = event.originalEvent.dataTransfer.getData("node-type");
        const rect = this.getBoundingClientRect();
        addNode(type, { x: (event.originalEvent.clientX - rect.left) / zoomLevel, y: (event.originalEvent.clientY - rect.top) / zoomLevel });
    });

    $(document).on("mousedown", ".flow-node", function (event) {
        if ($(event.target).hasClass("node-port")) return;
        const id = $(this).data("node-id");
        selectNode(id);
        const node = currentFlow.nodes.find((item) => item.id === id);
        dragState = { id, offsetX: event.clientX / zoomLevel - node.position.x, offsetY: event.clientY / zoomLevel - node.position.y };
    });

    $(document).on("mousemove", function (event) {
        if (!dragState) return;
        moveNode(dragState.id, { x: event.clientX / zoomLevel - dragState.offsetX, y: event.clientY / zoomLevel - dragState.offsetY });
    });

    $(document).on("mouseup", () => { dragState = null; });

    $(document).on("click", ".node-port", function (event) {
        event.stopPropagation();
        const role = $(this).data("port-role");
        if (role === "output") startConnection($(this).data("node-id"), $(this).data("port"));
        if (role === "input") completeConnection($(this).data("node-id"), $(this).data("port"));
    });

    $(document).on("click", ".connection-path", function () {
        selectedConnectionId = $(this).data("connection-id");
        selectedNodeId = null;
        renderCanvas();
    });

    $(document).on("change input", "[data-config-field]", function () {
        const field = $(this).data("config-field");
        const value = this.type === "checkbox" ? this.checked : this.type === "number" ? Number(this.value) : this.value;
        updateNodeConfig(selectedNodeId, field, value);
    });

    $(document).on("click", "#deleteNodeBtn", () => deleteNode(selectedNodeId));
    $(document).on("click", "#deleteConnectionBtn", () => deleteConnection(selectedConnectionId));

    $(document).on("click", "#addHeaderBtn", function () {
        const node = currentFlow.nodes.find((item) => item.id === selectedNodeId);
        node.config.headers.push({ name: "", value: "" });
        persistDraft();
        renderCanvas();
    });

    $(document).on("input", "[data-header-key], [data-header-value]", function () {
        const row = $(this).closest("[data-header-index]");
        const node = currentFlow.nodes.find((item) => item.id === selectedNodeId);
        const index = Number(row.data("header-index"));
        node.config.headers[index] = {
            name: row.find("[data-header-key]").val(),
            value: row.find("[data-header-value]").val()
        };
        persistDraft();
    });

    $(document).on("click", "[data-remove-header]", function () {
        const node = currentFlow.nodes.find((item) => item.id === selectedNodeId);
        node.config.headers.splice(Number($(this).data("remove-header")), 1);
        persistDraft();
        renderCanvas();
    });

    $("#zoomInBtn").on("click", () => setZoom(zoomLevel + 0.1));
    $("#zoomOutBtn").on("click", () => setZoom(zoomLevel - 0.1));
    $("#fitBtn").on("click", fitToScreen);
    $("#resetBtn, #newFlowBtn").on("click", resetCanvas);
    $("#saveFlowBtn").on("click", saveFlow);
    $("#templateSelect").on("change", function () { applyFlowTemplate(this.value); this.value = ""; });

    $("#saveFlowForm").on("submit", function (event) {
        event.preventDefault();
        currentFlow.name = $("#flowName").val().trim() || "Untitled Flow";
        currentFlow.description = $("#flowDescription").val().trim();
        currentFlow.tags = $("#flowTags").val().split(",").map((tag) => tag.trim()).filter(Boolean);
        currentFlow.updatedAt = new Date().toISOString();

        const existingIndex = workspace.savedFlows.findIndex((flow) => flow.id === currentFlow.id);
        if (existingIndex >= 0) workspace.savedFlows[existingIndex] = JSON.parse(JSON.stringify(currentFlow));
        else workspace.savedFlows.unshift(JSON.parse(JSON.stringify(currentFlow)));

        workspace.currentFlowDraft = currentFlow;
        RestFlow.saveWorkspace(workspace);
        RestFlow.addActivityLog("Flow Designer", "Saved flow", `Saved flow '${currentFlow.name}'`);
        saveModal.hide();
        RestFlow.showStatus("Flow saved.", "success");
    });
}

$(function () {
    RestFlow.renderSidebar("designer");
    RestFlow.applyThemeSettings();
    workspace = RestFlow.loadWorkspace();
    currentFlow = workspace.currentFlowDraft || freshFlow();
    zoomLevel = Number(workspace.settings.defaultZoom || 1);
    saveModal = new bootstrap.Modal(document.getElementById("saveFlowModal"));
    renderPalette();
    renderTemplates();
    renderCanvas();
    bindDesignerEvents();
});