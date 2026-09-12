const STORAGE_KEY = "restFlowDesigner.workspace";

const defaultWorkspace = {
    settings: {
        compactSidebar: false,
        transitionSpeedMs: 320,
        defaultZoom: 1
    },
    theme: {
        bg: "#040712",
        bgSoft: "#07111f",
        card: "rgba(10, 18, 36, 0.9)",
        text: "#f7fbff",
        muted: "#9aabc7",
        primary: "#22d3ee",
        secondary: "#a855f7",
        success: "#4ade80",
        warning: "#facc15",
        danger: "#fb7185",
        radius: 18,
        fontFamily: "Inter, sans-serif"
    },
    currentFlowDraft: null,
    savedFlows: [],
    executionLogs: [],
    activityLog: []
};

const nodeTypeConfig = {
    request: { label: "Request", className: "request" },
    transform: { label: "Transform", className: "transform" },
    condition: { label: "Condition", className: "condition" },
    delay: { label: "Delay", className: "delay" },
    output: { label: "Output/Log", className: "output" }
};

function escapeHtml(str) {
    return String(str ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function generateId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTimestamp(dateString) {
    if (!dateString) return "Not yet";
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date(dateString));
}

function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
}

function mergeWorkspace(workspace) {
    return {
        ...cloneData(defaultWorkspace),
        ...workspace,
        settings: { ...defaultWorkspace.settings, ...(workspace?.settings || {}) },
        theme: { ...defaultWorkspace.theme, ...(workspace?.theme || {}) },
        currentFlowDraft: workspace?.currentFlowDraft || null,
        savedFlows: Array.isArray(workspace?.savedFlows) ? workspace.savedFlows : [],
        executionLogs: Array.isArray(workspace?.executionLogs) ? workspace.executionLogs : [],
        activityLog: Array.isArray(workspace?.activityLog) ? workspace.activityLog : []
    };
}

function loadWorkspace() {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        return seedDemoData();
    }

    try {
        const workspace = mergeWorkspace(JSON.parse(raw));
        saveWorkspace(workspace);
        return workspace;
    } catch (error) {
        console.error("Workspace parse failed.", error);
        return seedDemoData();
    }
}

function saveWorkspace(workspace) {
    const merged = mergeWorkspace(workspace);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
}

function resetWorkspace() {
    localStorage.removeItem(STORAGE_KEY);
    return seedDemoData();
}

function createNode(type, label, position, config) {
    const defaults = {
        request: {
            method: "GET",
            url: "https://jsonplaceholder.typicode.com/users/1",
            headers: [],
            bodyTemplate: "",
            useInputAsBody: false
        },
        transform: {
            expression: "return input;"
        },
        condition: {
            expression: "input.status === 200 || Boolean(input)",
            trueLabel: "Continue",
            falseLabel: "Stop"
        },
        delay: {
            ms: 1000
        },
        output: {
            outputLabel: "Captured output"
        }
    };

    return {
        id: generateId("node"),
        type,
        label,
        position,
        config: { ...defaults[type], ...(config || {}) }
    };
}

function seedDemoData() {
    const now = new Date();
    const older = new Date(now.getTime() - 86400000).toISOString();
    const recent = new Date(now.getTime() - 3600000).toISOString();

    const getUser = createNode("request", "Get User", { x: 120, y: 90 }, {
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/users/1"
    });
    const shapeUser = createNode("transform", "Shape Payload", { x: 390, y: 90 }, {
        expression: "return { name: input.name, email: input.email, company: input.company?.name };"
    });
    const postSummary = createNode("request", "Post Summary", { x: 660, y: 90 }, {
        method: "POST",
        url: "https://jsonplaceholder.typicode.com/posts",
        headers: [{ name: "Content-Type", value: "application/json" }],
        useInputAsBody: true
    });
    const capturePost = createNode("output", "Capture Response", { x: 930, y: 90 }, {
        outputLabel: "Posted summary response"
    });

    const fetchAndPost = {
        id: generateId("flow"),
        name: "Fetch and Post Demo",
        description: "Fetches a sample user, reshapes the payload, posts it, and captures the response.",
        tags: ["demo", "users"],
        nodes: [getUser, shapeUser, postSummary, capturePost],
        connections: [
            { id: generateId("conn"), fromNodeId: getUser.id, fromPort: "default", toNodeId: shapeUser.id, toPort: "input" },
            { id: generateId("conn"), fromNodeId: shapeUser.id, fromPort: "default", toNodeId: postSummary.id, toPort: "input" },
            { id: generateId("conn"), fromNodeId: postSummary.id, fromPort: "default", toNodeId: capturePost.id, toPort: "input" }
        ],
        createdAt: older,
        updatedAt: recent
    };

    const getPost = createNode("request", "Get Post", { x: 120, y: 160 }, {
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/posts/1"
    });
    const statusCheck = createNode("condition", "Has Title", { x: 400, y: 160 }, {
        expression: "Boolean(input.title)",
        trueLabel: "Has title",
        falseLabel: "Missing title"
    });
    const successOut = createNode("output", "Success Output", { x: 710, y: 80 }, {
        outputLabel: "Post has a title"
    });
    const failOut = createNode("output", "Fallback Output", { x: 710, y: 250 }, {
        outputLabel: "Post missing a title"
    });

    const conditionalDemo = {
        id: generateId("flow"),
        name: "Conditional Branch Demo",
        description: "Runs a real request, evaluates a boolean condition, and follows the matching branch.",
        tags: ["demo", "condition"],
        nodes: [getPost, statusCheck, successOut, failOut],
        connections: [
            { id: generateId("conn"), fromNodeId: getPost.id, fromPort: "default", toNodeId: statusCheck.id, toPort: "input" },
            { id: generateId("conn"), fromNodeId: statusCheck.id, fromPort: "true", toNodeId: successOut.id, toPort: "input" },
            { id: generateId("conn"), fromNodeId: statusCheck.id, fromPort: "false", toNodeId: failOut.id, toPort: "input" }
        ],
        createdAt: older,
        updatedAt: older
    };

    const getTodo = createNode("request", "Get Todo", { x: 120, y: 120 }, {
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/todos/1"
    });
    const normalizeTodo = createNode("transform", "Normalize", { x: 390, y: 120 }, {
        expression: "return { id: input.id, title: input.title, completed: input.completed };"
    });
    const addMeta = createNode("transform", "Add Metadata", { x: 660, y: 120 }, {
        expression: "return { ...input, exportedAt: new Date().toISOString(), source: 'REST Flow Designer' };"
    });
    const todoOut = createNode("output", "Final Todo", { x: 930, y: 120 }, {
        outputLabel: "Normalized todo"
    });

    const transformPipeline = {
        id: generateId("flow"),
        name: "Transform Pipeline",
        description: "Fetches a todo and runs it through two real JavaScript transform nodes.",
        tags: ["demo", "transform"],
        nodes: [getTodo, normalizeTodo, addMeta, todoOut],
        connections: [
            { id: generateId("conn"), fromNodeId: getTodo.id, fromPort: "default", toNodeId: normalizeTodo.id, toPort: "input" },
            { id: generateId("conn"), fromNodeId: normalizeTodo.id, fromPort: "default", toNodeId: addMeta.id, toPort: "input" },
            { id: generateId("conn"), fromNodeId: addMeta.id, fromPort: "default", toNodeId: todoOut.id, toPort: "input" }
        ],
        createdAt: older,
        updatedAt: now.toISOString()
    };

    const workspace = cloneData(defaultWorkspace);
    workspace.savedFlows = [fetchAndPost, conditionalDemo, transformPipeline];
    workspace.currentFlowDraft = cloneData(transformPipeline);
    workspace.executionLogs = [
        {
            id: generateId("run"),
            flowId: fetchAndPost.id,
            status: "success",
            totalDurationMs: 842,
            steps: [
                {
                    nodeId: getUser.id,
                    nodeType: "request",
                    label: "Get User",
                    inputPreview: "null",
                    outputPreview: '{ "id": 1, "name": "Leanne Graham", "email": "Sincere@april.biz" }',
                    durationMs: 210,
                    status: "success"
                },
                {
                    nodeId: shapeUser.id,
                    nodeType: "transform",
                    label: "Shape Payload",
                    inputPreview: '{ "name": "Leanne Graham" }',
                    outputPreview: '{ "name": "Leanne Graham", "email": "Sincere@april.biz" }',
                    durationMs: 8,
                    status: "success"
                }
            ],
            createdAt: recent
        }
    ];
    workspace.activityLog = [
        { id: generateId("log"), module: "Flow Designer", action: "Created", detail: "Created demo starter flows", createdAt: older },
        { id: generateId("log"), module: "Flow Runner", action: "Run completed", detail: "Ran Fetch and Post Demo successfully", createdAt: recent },
        { id: generateId("log"), module: "Export Center", action: "Exported", detail: "Exported Transform Pipeline as runnable JavaScript", createdAt: recent },
        { id: generateId("log"), module: "Settings", action: "Theme ready", detail: "Loaded the editable default enterprise theme", createdAt: now.toISOString() }
    ];

    saveWorkspace(workspace);
    return workspace;
}

function addActivityLog(module, action, detail) {
    const workspace = loadWorkspace();
    workspace.activityLog.unshift({
        id: generateId("log"),
        module,
        action,
        detail,
        createdAt: new Date().toISOString()
    });
    workspace.activityLog = workspace.activityLog.slice(0, 80);
    saveWorkspace(workspace);
}

function applyThemeSettings() {
    const workspace = loadWorkspace();
    const theme = workspace.theme;
    const root = document.documentElement;

    Object.entries({
        "--bg": theme.bg,
        "--bg-soft": theme.bgSoft,
        "--card": theme.card,
        "--text": theme.text,
        "--muted": theme.muted,
        "--primary": theme.primary,
        "--secondary": theme.secondary,
        "--success": theme.success,
        "--warning": theme.warning,
        "--danger": theme.danger,
        "--radius": `${theme.radius}px`,
        "--font-family": theme.fontFamily,
        "--transition-speed": `${workspace.settings.transitionSpeedMs}ms`
    }).forEach(([token, value]) => root.style.setProperty(token, value));

    document.body.classList.toggle("compact-sidebar", Boolean(workspace.settings.compactSidebar));
}

function renderSidebar(activePage) {
    const navItems = [
        { page: "dashboard", label: "Dashboard", href: "index.html", icon: "⌂" },
        { page: "designer", label: "Flow Designer", href: "flow-designer.html", icon: "◇" },
        { page: "runner", label: "Flow Runner", href: "flow-runner.html", icon: "▶" },
        { page: "saved", label: "Saved Flows", href: "saved-flows.html", icon: "▣" },
        { page: "export", label: "Export Center", href: "export.html", icon: "⇩" },
        { page: "settings", label: "Settings", href: "settings.html", icon: "⚙" }
    ];

    const sidebar = document.querySelector("[data-sidebar]");
    if (!sidebar) return;

    sidebar.innerHTML = `
    <aside class="app-sidebar">
      <a class="sidebar-brand" href="index.html" aria-label="REST Flow Designer home">
        <span class="brand-mark">RF</span>
        <span class="brand-copy">
          <span class="brand-title">REST Flow Designer</span>
          <span class="brand-subtitle">Visual API automation</span>
        </span>
      </a>
      <nav class="sidebar-nav" aria-label="Primary navigation">
        ${navItems.map((item) => `
          <a class="sidebar-link ${item.page === activePage ? "active" : ""}" href="${item.href}" data-page="${item.page}">
            <span class="sidebar-icon">${item.icon}</span>
            <span class="sidebar-label">${item.label}</span>
          </a>
        `).join("")}
      </nav>
      <div class="sidebar-footer">
        Build, run, export, and theme real API workflows from local browser state.
      </div>
    </aside>
  `;

    setActiveNav();
}

function setActiveNav() {
    const path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".sidebar-link").forEach((link) => {
        const href = link.getAttribute("href");
        link.classList.toggle("active", href === path || (path === "" && href === "index.html"));
    });
}

function showStatus(message, type = "success") {
    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container position-fixed top-0 end-0 p-3";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `app-toast p-3 mb-2 status-${type}`;
    toast.setAttribute("role", "status");
    toast.innerHTML = escapeHtml(message);
    container.appendChild(toast);

    const workspace = loadWorkspace();
    window.setTimeout(() => toast.remove(), Math.max(workspace.settings.transitionSpeedMs * 9, 2600));
}

function renderEmptyState(message) {
    return `<div class="empty-state"><p class="mb-0">${escapeHtml(message)}</p></div>`;
}

function downloadJson(filename, data) {
    downloadTextFile(filename, JSON.stringify(data, null, 2), "application/json");
}

function downloadTextFile(filename, content, type = "text/plain") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

async function copyText(text, message = "Copied to clipboard.") {
    await navigator.clipboard.writeText(text);
    showStatus(message, "success");
}

function slugify(text) {
    return String(text || "flow")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "flow";
}

function buildNodeGraph(flow) {
    const nodesById = new Map((flow?.nodes || []).map((node) => [node.id, node]));
    const outgoing = new Map();
    const incoming = new Map();

    (flow?.nodes || []).forEach((node) => {
        outgoing.set(node.id, []);
        incoming.set(node.id, []);
    });

    (flow?.connections || []).forEach((connection) => {
        if (!nodesById.has(connection.fromNodeId) || !nodesById.has(connection.toNodeId)) return;
        outgoing.get(connection.fromNodeId).push(connection);
        incoming.get(connection.toNodeId).push(connection);
    });

    return { nodesById, outgoing, incoming };
}

function findStartNode(flow) {
    const graph = buildNodeGraph(flow);
    return (flow?.nodes || []).find((node) => (graph.incoming.get(node.id) || []).length === 0) || (flow?.nodes || [])[0] || null;
}

function evaluateTransform(expression, input) {
    const fn = new Function("input", expression);
    return fn(input);
}

function evaluateCondition(expression, input) {
    const fn = new Function("input", `return Boolean(${expression});`);
    return fn(input);
}

function previewData(data) {
    if (typeof data === "string") return data.slice(0, 1000);
    try {
        return JSON.stringify(data, null, 2).slice(0, 1000);
    } catch (error) {
        return String(data).slice(0, 1000);
    }
}

const REQUEST_TIMEOUT_MS = 18000;
const SLOW_REQUEST_WARNING_MS = 5000;

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS, onSlowRequest) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    const slowTimerId = typeof onSlowRequest === "function"
        ? window.setTimeout(() => onSlowRequest(), Math.min(SLOW_REQUEST_WARNING_MS, timeoutMs - 1))
        : null;

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (error.name === "AbortError") {
            const timeoutError = new Error("Request timed out — the endpoint may be slow or unreachable");
            timeoutError.isTimeout = true;
            throw timeoutError;
        }
        throw error;
    } finally {
        window.clearTimeout(timeoutId);
        if (slowTimerId !== null) window.clearTimeout(slowTimerId);
    }
}

async function executeRequestNode(node, input, options = {}) {
    const config = node.config || {};
    const headers = {};
    (config.headers || []).forEach((header) => {
        if (header.name) headers[header.name] = header.value || "";
    });

    const method = config.method || "GET";
    const requestOptions = { method, headers };

    if (!["GET", "HEAD"].includes(method.toUpperCase())) {
        if (config.useInputAsBody) {
            requestOptions.body = typeof input === "string" ? input : JSON.stringify(input ?? {});
            if (!headers["Content-Type"]) requestOptions.headers["Content-Type"] = "application/json";
        } else if (config.bodyTemplate) {
            requestOptions.body = config.bodyTemplate;
        }
    }

    const response = await fetchWithTimeout(
        config.url,
        requestOptions,
        REQUEST_TIMEOUT_MS,
        options.onSlowRequest ? () => options.onSlowRequest(node) : null
    );
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await response.json() : await response.text();

    if (!response.ok) {
        const error = new Error(`Request failed with ${response.status} ${response.statusText}`);
        error.output = { status: response.status, ok: response.ok, body };
        throw error;
    }

    return { status: response.status, ok: response.ok, headers: Object.fromEntries(response.headers.entries()), body, ...body };
}

async function executeFlow(flow, options = {}) {
    const graph = buildNodeGraph(flow);
    const steps = [];
    let node = options.startNode || findStartNode(flow);
    let input = options.initialInput ?? null;
    let finalOutput = input;
    const runStarted = performance.now();

    while (node) {
        const stepStarted = performance.now();
        const inputPreview = previewData(input);

        try {
            let output = input;
            let selectedPort = "default";

            if (options.onNodeStart) await options.onNodeStart(node, input, steps);

            if (node.type === "request") {
                output = await executeRequestNode(node, input, { onSlowRequest: options.onSlowRequest });
            }

            if (node.type === "transform") {
                output = evaluateTransform(node.config.expression, input);
            }

            if (node.type === "condition") {
                const passed = evaluateCondition(node.config.expression, input);
                output = input;
                selectedPort = passed ? "true" : "false";
            }

            if (node.type === "delay") {
                const ms = Number(node.config.ms || defaultWorkspace.settings.transitionSpeedMs);
                await new Promise((resolve) => window.setTimeout(resolve, ms));
                output = input;
            }

            if (node.type === "output") {
                output = input;
                finalOutput = output;
            }

            const step = {
                nodeId: node.id,
                nodeType: node.type,
                label: node.label,
                inputPreview,
                outputPreview: previewData(output),
                durationMs: Math.round(performance.now() - stepStarted),
                status: "success"
            };

            steps.push(step);
            if (options.onNodeComplete) await options.onNodeComplete(node, output, step, steps);

            input = output;
            finalOutput = output;

            const nextConnection = (graph.outgoing.get(node.id) || []).find((connection) => connection.fromPort === selectedPort)
                || (graph.outgoing.get(node.id) || [])[0];

            node = nextConnection ? graph.nodesById.get(nextConnection.toNodeId) : null;

            if (options.stepMode && options.afterStep) {
                await options.afterStep({ steps, currentNode: node, output: input });
            }
        } catch (error) {
            const step = {
                nodeId: node.id,
                nodeType: node.type,
                label: node.label,
                inputPreview,
                outputPreview: previewData(error.output || error.message),
                durationMs: Math.round(performance.now() - stepStarted),
                status: "error"
            };

            steps.push(step);

            const result = {
                id: generateId("run"),
                flowId: flow.id,
                status: "error",
                totalDurationMs: Math.round(performance.now() - runStarted),
                steps,
                error: error.message,
                finalOutput: error.output || null,
                createdAt: new Date().toISOString()
            };

            if (options.persist !== false) persistExecutionLog(result);
            throw result;
        }
    }

    const result = {
        id: generateId("run"),
        flowId: flow.id,
        status: "success",
        totalDurationMs: Math.round(performance.now() - runStarted),
        steps,
        finalOutput,
        createdAt: new Date().toISOString()
    };

    if (options.persist !== false) persistExecutionLog(result);
    return result;
}

function persistExecutionLog(result) {
    const workspace = loadWorkspace();
    workspace.executionLogs.unshift(result);
    workspace.executionLogs = workspace.executionLogs.slice(0, 120);
    saveWorkspace(workspace);
}

function generateFlowScript(flow, options = {}) {
    const graph = buildNodeGraph(flow);
    const startNode = findStartNode(flow);
    const flowData = JSON.stringify(flow, null, 2);

    return `const flow = ${flowData};

function buildNodeGraph(flow) {
  const nodesById = new Map(flow.nodes.map((node) => [node.id, node]));
  const outgoing = new Map(flow.nodes.map((node) => [node.id, []]));
  flow.connections.forEach((connection) => outgoing.get(connection.fromNodeId).push(connection));
  return { nodesById, outgoing };
}

async function runFlow(initialInput = null) {
  const graph = buildNodeGraph(flow);
  let node = flow.nodes.find((candidate) => !flow.connections.some((connection) => connection.toNodeId === candidate.id));
  let input = initialInput;

  while (node) {
    let output = input;
    let selectedPort = "default";

    if (node.type === "request") {
      const headers = {};
      (node.config.headers || []).forEach((header) => {
        if (header.name) headers[header.name] = header.value || "";
      });

      const options = { method: node.config.method || "GET", headers };
      if (!["GET", "HEAD"].includes(options.method.toUpperCase())) {
        if (node.config.useInputAsBody) {
          options.body = typeof input === "string" ? input : JSON.stringify(input ?? {});
          if (!headers["Content-Type"]) options.headers["Content-Type"] = "application/json";
        } else if (node.config.bodyTemplate) {
          options.body = node.config.bodyTemplate;
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000);
      let response;
      try {
        response = await fetch(node.config.url, { ...options, signal: controller.signal });
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          throw new Error("Request timed out — the endpoint may be slow or unreachable");
        }
        throw fetchError;
      } finally {
        clearTimeout(timeoutId);
      }
      const contentType = response.headers.get("content-type") || "";
      const body = contentType.includes("application/json") ? await response.json() : await response.text();

      if (!response.ok) {
        throw new Error(\`Request failed with \${response.status} \${response.statusText}\`);
      }

      output = { status: response.status, ok: response.ok, body, ...body };
    }

    if (node.type === "transform") {
      output = new Function("input", node.config.expression)(input);
    }

    if (node.type === "condition") {
      selectedPort = new Function("input", \`return Boolean(\${node.config.expression});\`)(input) ? "true" : "false";
      output = input;
    }

    if (node.type === "delay") {
      await new Promise((resolve) => setTimeout(resolve, Number(node.config.ms || 0)));
      output = input;
    }

    if (node.type === "output") {
      output = input;
    }

    input = output;
    const nextConnection = (graph.outgoing.get(node.id) || []).find((connection) => connection.fromPort === selectedPort)
      || (graph.outgoing.get(node.id) || [])[0];
    node = nextConnection ? graph.nodesById.get(nextConnection.toNodeId) : null;
  }

  return input;
}

runFlow(${options.includeInitialInput ? "undefined" : ""})
  .then((result) => console.log("Flow result:", result))
  .catch((error) => console.error("Flow failed:", error));`;
}

function renderMiniFlowPreview(flow, containerEl) {
    if (!containerEl) return;
    if (!flow || !Array.isArray(flow.nodes) || flow.nodes.length === 0) {
        containerEl.innerHTML = renderEmptyState("No nodes yet.");
        return;
    }

    const width = containerEl.clientWidth || 360;
    const height = containerEl.clientHeight || 130;
    const xs = flow.nodes.map((node) => node.position?.x || 0);
    const ys = flow.nodes.map((node) => node.position?.y || 0);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = Math.max(maxX - minX, 1);
    const rangeY = Math.max(maxY - minY, 1);
    const pad = 22;

    const positionFor = (node) => ({
        x: pad + (((node.position?.x || 0) - minX) / rangeX) * Math.max(width - pad * 2, 1),
        y: pad + (((node.position?.y || 0) - minY) / rangeY) * Math.max(height - pad * 2, 1)
    });

    const points = new Map(flow.nodes.map((node) => [node.id, positionFor(node)]));

    containerEl.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="${escapeHtml(flow.name)} preview">
      <defs>
        <marker id="mini-arrow-${flow.id}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--primary)"></path>
        </marker>
      </defs>
      ${(flow.connections || []).map((connection) => {
        const from = points.get(connection.fromNodeId);
        const to = points.get(connection.toNodeId);
        if (!from || !to) return "";
        return `<path d="M ${from.x} ${from.y} C ${(from.x + to.x) / 2} ${from.y}, ${(from.x + to.x) / 2} ${to.y}, ${to.x} ${to.y}" fill="none" stroke="var(--primary)" stroke-width="2" marker-end="url(#mini-arrow-${flow.id})"></path>`;
    }).join("")}
      ${(flow.nodes || []).map((node) => {
        const point = points.get(node.id);
        const type = nodeTypeConfig[node.type] || nodeTypeConfig.output;
        return `
          <g>
            <rect x="${point.x - 34}" y="${point.y - 14}" width="68" height="28" rx="8" fill="var(--card)" stroke="var(--${type.className === "request" ? "primary" : type.className === "transform" ? "secondary" : type.className === "condition" ? "warning" : type.className === "output" ? "success" : "muted"})"></rect>
            <text x="${point.x}" y="${point.y + 4}" text-anchor="middle" fill="var(--text)" font-size="9">${escapeHtml(type.label)}</text>
          </g>
        `;
    }).join("")}
    </svg>
  `;
}

function initPageTransitions() {
    applyThemeSettings();

    let overlay = document.querySelector(".transition-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "transition-overlay";
        overlay.innerHTML = `
      <div class="transition-loader">
        <span class="transition-spinner" aria-hidden="true"></span>
        <span>Loading workspace</span>
      </div>
    `;
        document.body.prepend(overlay);
    }

    document.body.classList.add("page-enter");

    window.setTimeout(() => hideTransitionOverlay(), 40);

    document.addEventListener("click", (event) => {
        const link = event.target.closest("a[href]");
        if (!link) return;

        const href = link.getAttribute("href");
        const isModified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
        const isExternal = link.origin && link.origin !== window.location.origin;
        const isHashOnly = href && href.startsWith("#");

        if (isModified || link.target === "_blank" || isExternal || isHashOnly || !href) return;

        event.preventDefault();
        showTransitionOverlay(false);

        const workspace = loadWorkspace();
        const minimum = workspace.settings.transitionSpeedMs;
        const loaderDelay = Math.max(Math.round(minimum * 0.65), 120);

        window.setTimeout(() => showTransitionOverlay(true), loaderDelay);
        window.setTimeout(() => {
            window.location.href = href;
        }, minimum);
    });
}

function showTransitionOverlay(withLoader = false) {
    const overlay = document.querySelector(".transition-overlay");
    if (!overlay) return;

    overlay.classList.remove("is-hidden");
    overlay.classList.toggle("show-loader", Boolean(withLoader));
}

function hideTransitionOverlay() {
    const overlay = document.querySelector(".transition-overlay");
    if (!overlay) return;

    overlay.classList.add("is-hidden");
    overlay.classList.remove("show-loader");
}

window.RestFlow = {
    STORAGE_KEY,
    defaultWorkspace,
    nodeTypeConfig,
    escapeHtml,
    generateId,
    formatTimestamp,
    loadWorkspace,
    saveWorkspace,
    resetWorkspace,
    seedDemoData,
    addActivityLog,
    applyThemeSettings,
    renderSidebar,
    setActiveNav,
    showStatus,
    renderEmptyState,
    downloadJson,
    downloadTextFile,
    copyText,
    slugify,
    buildNodeGraph,
    findStartNode,
    evaluateTransform,
    evaluateCondition,
    executeFlow,
    generateFlowScript,
    renderMiniFlowPreview,
    initPageTransitions,
    showTransitionOverlay,
    hideTransitionOverlay,
    previewData
};

document.addEventListener("DOMContentLoaded", () => {
    initPageTransitions();
});