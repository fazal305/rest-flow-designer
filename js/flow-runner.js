let workspace = null;
let selectedFlow = null;
let stepSession = null;
let executingNodeId = null;

function getFlowOptions() {
    const options = [];

    if (workspace.currentFlowDraft && workspace.currentFlowDraft.nodes?.length) {
        options.push({
            id: "draft",
            label: `Current draft: ${workspace.currentFlowDraft.name || "Untitled Flow"}`,
            flow: workspace.currentFlowDraft
        });
    }

    workspace.savedFlows.forEach((flow) => {
        options.push({ id: flow.id, label: flow.name, flow });
    });

    return options;
}

function renderFlowSelect() {
    const options = getFlowOptions();

    if (!options.length) {
        $("#flowSelect").html("<option>No flows available</option>");
        selectedFlow = null;
        return;
    }

    const queryFlow = new URLSearchParams(window.location.search).get("flow");
    const selectedId = queryFlow || options[0].id;

    $("#flowSelect").html(options.map((option) => `
    <option value="${option.id}" ${option.id === selectedId ? "selected" : ""}>${RestFlow.escapeHtml(option.label)}</option>
  `).join(""));

    selectedFlow = (options.find((option) => option.id === selectedId) || options[0]).flow;
}

function renderFlowPreview(flow) {
    const container = document.getElementById("runnerPreview");
    RestFlow.renderMiniFlowPreview(flow, container);

    if (executingNodeId) {
        const node = flow.nodes.find((item) => item.id === executingNodeId);
        if (node) {
            const badge = document.createElement("div");
            badge.className = "badge-token";
            badge.style.position = "absolute";
            badge.style.left = "1rem";
            badge.style.bottom = "1rem";
            badge.textContent = `Executing: ${node.label}`;
            container.appendChild(badge);
        }
    }
}

function renderExecutionLog(steps) {
    if (!steps || !steps.length) {
        $("#executionLog").html(RestFlow.renderEmptyState("No execution steps yet."));
        return;
    }

    $("#executionLog").html(steps.map((step) => `
    <article class="execution-step ${step.status} ${step.nodeId === executingNodeId ? "active" : ""}">
      <div class="execution-step-header">
        <div>
          <p class="execution-step-title">${RestFlow.escapeHtml(step.label)}</p>
          <span class="badge-token">${RestFlow.escapeHtml(step.nodeType)}</span>
        </div>
        <div class="text-end">
          <span class="badge-token status-${step.status}">${RestFlow.escapeHtml(step.status)}</span>
          <div class="stat-label mt-1">${step.durationMs}ms</div>
        </div>
      </div>
      <div class="execution-preview-grid">
        <div class="preview-block">
          <p class="preview-label">Input</p>
          <pre class="preview-code">${RestFlow.escapeHtml(step.inputPreview)}</pre>
        </div>
        <div class="preview-block">
          <p class="preview-label">Output</p>
          <pre class="preview-code">${RestFlow.escapeHtml(step.outputPreview)}</pre>
        </div>
      </div>
    </article>
  `).join(""));
}

function renderFinalOutput(result) {
    $("#finalOutput").text(result ? RestFlow.previewData(result.finalOutput ?? result.error ?? result) : "No run yet.");
}

function renderRunHistory(flowId) {
    const logs = workspace.executionLogs.filter((log) => log.flowId === flowId).slice(0, 12);

    if (!logs.length) {
        $("#runHistory").html(RestFlow.renderEmptyState("No run history for this flow yet."));
        return;
    }

    $("#runHistory").html(logs.map((log) => `
    <article class="history-item">
      <div>
        <strong class="status-${log.status}">${RestFlow.escapeHtml(log.status)}</strong>
        <div class="stat-label">${RestFlow.formatTimestamp(log.createdAt)}</div>
      </div>
      <div class="text-end">
        <span class="badge-token">${log.totalDurationMs}ms</span>
        <div class="stat-label">${log.steps.length} steps</div>
      </div>
    </article>
  `).join(""));
}

async function runFlow(flow) {
    if (!flow) {
        RestFlow.showStatus("Select a flow first.", "warning");
        return;
    }

    $("#runStatus").text("Running");
    $("#runFlowBtn, #nextStepBtn").prop("disabled", true);
    renderExecutionLog([]);

    try {
        const result = await RestFlow.executeFlow(flow, {
            onNodeStart: async (node, input, steps) => {
                executingNodeId = node.id;
                renderFlowPreview(flow);
                renderExecutionLog(steps);
            },
            onNodeComplete: async (node, output, step, steps) => {
                renderExecutionLog(steps);
            }
        });

        executingNodeId = null;
        workspace = RestFlow.loadWorkspace();
        $("#runStatus").text("Success");
        renderExecutionLog(result.steps);
        renderFinalOutput(result);
        renderRunHistory(flow.id);
        renderFlowPreview(flow);
        RestFlow.addActivityLog("Flow Runner", "Run completed", `Ran '${flow.name}' successfully`);
        RestFlow.showStatus("Flow run completed.", "success");
    } catch (result) {
        executingNodeId = null;
        workspace = RestFlow.loadWorkspace();
        $("#runStatus").text("Failed");
        renderExecutionLog(result.steps || []);
        renderFinalOutput(result);
        renderRunHistory(flow.id);
        renderFlowPreview(flow);
        RestFlow.addActivityLog("Flow Runner", "Run failed", `Flow '${flow.name}' failed`);
        RestFlow.showStatus(result.error || "Flow failed.", "danger");
    } finally {
        $("#runFlowBtn").prop("disabled", false);
        $("#nextStepBtn").prop("disabled", !$("#stepModeToggle").is(":checked"));
    }
}

function createStepSession(flow) {
    const graph = RestFlow.buildNodeGraph(flow);
    return {
        flow,
        graph,
        node: RestFlow.findStartNode(flow),
        input: null,
        steps: [],
        started: performance.now()
    };
}

async function executeSingleNode(session) {
    const node = session.node;
    if (!node) return null;

    const beforeSteps = session.steps.length;
    const tempFlow = {
        ...session.flow,
        nodes: session.flow.nodes,
        connections: session.flow.connections.filter((connection) => connection.fromNodeId !== node.id)
    };

    executingNodeId = node.id;
    renderFlowPreview(session.flow);

    try {
        const result = await RestFlow.executeFlow({ ...tempFlow, nodes: [node] }, {
            persist: false,
            initialInput: session.input
        });

        const step = result.steps[0];
        session.steps.push(step);

        let selectedPort = "default";
        if (node.type === "condition") {
            selectedPort = RestFlow.evaluateCondition(node.config.expression, session.input) ? "true" : "false";
        }

        session.input = result.finalOutput;
        const nextConnection = (session.graph.outgoing.get(node.id) || []).find((connection) => connection.fromPort === selectedPort)
            || (session.graph.outgoing.get(node.id) || [])[0];
        session.node = nextConnection ? session.graph.nodesById.get(nextConnection.toNodeId) : null;

        renderExecutionLog(session.steps);
        renderFinalOutput({ finalOutput: session.input });

        if (!session.node) {
            const runResult = {
                id: RestFlow.generateId("run"),
                flowId: session.flow.id,
                status: "success",
                totalDurationMs: Math.round(performance.now() - session.started),
                steps: session.steps,
                finalOutput: session.input,
                createdAt: new Date().toISOString()
            };

            const freshWorkspace = RestFlow.loadWorkspace();
            freshWorkspace.executionLogs.unshift(runResult);
            RestFlow.saveWorkspace(freshWorkspace);
            workspace = RestFlow.loadWorkspace();
            renderRunHistory(session.flow.id);
            $("#runStatus").text("Success");
            $("#nextStepBtn").prop("disabled", true);
            RestFlow.showStatus("Step run completed.", "success");
        }

        return session.steps.length > beforeSteps ? session.steps.at(-1) : null;
    } catch (result) {
        session.steps.push(...((result.steps || []).filter((step) => !session.steps.some((existing) => existing.nodeId === step.nodeId))));
        renderExecutionLog(session.steps);
        renderFinalOutput(result);
        $("#runStatus").text("Failed");
        $("#nextStepBtn").prop("disabled", true);
        return null;
    } finally {
        executingNodeId = null;
        renderFlowPreview(session.flow);
    }
}

async function stepFlow(flow) {
    if (!stepSession || stepSession.flow.id !== flow.id) {
        stepSession = createStepSession(flow);
        $("#runStatus").text("Stepping");
        renderExecutionLog([]);
        renderFinalOutput(null);
    }

    if (!stepSession.node) {
        RestFlow.showStatus("No next node to execute.", "warning");
        return;
    }

    await executeSingleNode(stepSession);
}

function bindRunnerEvents() {
    $("#flowSelect").on("change", function () {
        const selected = getFlowOptions().find((option) => option.id === this.value);
        selectedFlow = selected?.flow || null;
        stepSession = null;
        executingNodeId = null;
        renderFlowPreview(selectedFlow);
        renderExecutionLog([]);
        renderFinalOutput(null);
        renderRunHistory(selectedFlow?.id);
        $("#runStatus").text("Idle");
    });

    $("#stepModeToggle").on("change", function () {
        stepSession = null;
        $("#nextStepBtn").prop("disabled", !this.checked);
        $("#runFlowBtn").text(this.checked ? "Restart Step Run" : "Run Flow");
    });

    $("#runFlowBtn").on("click", function () {
        if ($("#stepModeToggle").is(":checked")) {
            stepSession = createStepSession(selectedFlow);
            $("#runStatus").text("Stepping");
            renderExecutionLog([]);
            renderFinalOutput(null);
            $("#nextStepBtn").prop("disabled", false);
            RestFlow.showStatus("Step session started. Press Next Step.", "success");
            return;
        }

        runFlow(selectedFlow);
    });

    $("#nextStepBtn").on("click", () => stepFlow(selectedFlow));

    $("#clearLogBtn").on("click", function () {
        stepSession = null;
        executingNodeId = null;
        renderExecutionLog([]);
        renderFinalOutput(null);
        $("#runStatus").text("Idle");
        renderFlowPreview(selectedFlow);
    });
}

$(function () {
    RestFlow.renderSidebar("runner");
    RestFlow.applyThemeSettings();
    workspace = RestFlow.loadWorkspace();
    renderFlowSelect();
    renderFlowPreview(selectedFlow);
    renderExecutionLog([]);
    renderFinalOutput(null);
    renderRunHistory(selectedFlow?.id);
    bindRunnerEvents();
});