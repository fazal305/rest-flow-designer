function getWorkspace() {
    return RestFlow.loadWorkspace();
}

function renderDashboardStats() {
    const workspace = getWorkspace();
    const flows = workspace.savedFlows;
    const totalNodes = flows.reduce((sum, flow) => sum + flow.nodes.length, 0);
    const recentFlow = [...flows].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
    const totalRuns = workspace.executionLogs.length;

    const stats = [
        { label: "Saved flows", value: flows.length, detail: "Reusable API workflows" },
        { label: "Total nodes", value: totalNodes, detail: "Across all saved graphs" },
        { label: "Recent flow", value: recentFlow ? recentFlow.name : "None", detail: recentFlow ? RestFlow.formatTimestamp(recentFlow.updatedAt) : "Create your first flow" },
        { label: "Runs executed", value: totalRuns, detail: "Stored execution history" }
    ];

    $("#dashboardStats").html(stats.map((stat) => `
    <article class="stat-card">
      <p class="stat-label">${RestFlow.escapeHtml(stat.label)}</p>
      <p class="stat-value">${RestFlow.escapeHtml(stat.value)}</p>
      <p class="stat-label">${RestFlow.escapeHtml(stat.detail)}</p>
    </article>
  `).join(""));
}

function renderQuickActions() {
    const actions = [
        { title: "New Flow", copy: "Open the visual canvas and start building.", href: "flow-designer.html", icon: "+" },
        { title: "View Saved Flows", copy: "Search, duplicate, rename, run, or delete flows.", href: "saved-flows.html", icon: "▣" },
        { title: "Flow Runner", copy: "Execute real request and transform chains.", href: "flow-runner.html", icon: "▶" },
        { title: "Export Center", copy: "Generate JSON or runnable JavaScript.", href: "export.html", icon: "⇩" }
    ];

    $("#quickActions").html(actions.map((action) => `
    <a class="action-card" href="${action.href}">
      <span class="action-card-content">
        <span class="action-icon">${action.icon}</span>
        <span>
          <span class="card-title d-block">${RestFlow.escapeHtml(action.title)}</span>
          <span class="card-text small">${RestFlow.escapeHtml(action.copy)}</span>
        </span>
      </span>
    </a>
  `).join(""));
}

function renderRecentFlows() {
    const workspace = getWorkspace();
    const flows = [...workspace.savedFlows]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 3);

    if (!flows.length) {
        $("#recentFlows").html(RestFlow.renderEmptyState("No saved flows yet. Create one in Flow Designer."));
        return;
    }

    $("#recentFlows").html(flows.map((flow) => `
    <article class="recent-flow-card" data-flow-id="${flow.id}">
      <div class="mini-flow-preview" id="preview-${flow.id}"></div>
      <div class="recent-flow-meta">
        <div class="recent-flow-title-row">
          <div>
            <h3 class="card-title">${RestFlow.escapeHtml(flow.name)}</h3>
            <p class="card-text small mb-0">${RestFlow.escapeHtml(flow.description || "No description")}</p>
          </div>
          <span class="badge-token">${flow.nodes.length} nodes</span>
        </div>
        <div class="d-flex flex-wrap gap-1">
          ${(flow.tags || []).map((tag) => `<span class="badge-token">${RestFlow.escapeHtml(tag)}</span>`).join("")}
        </div>
        <p class="stat-label mb-0">Updated ${RestFlow.formatTimestamp(flow.updatedAt)}</p>
        <div class="recent-flow-actions">
          <button class="btn btn-sm btn-outline-primary" data-action="open" data-id="${flow.id}">Open</button>
          <button class="btn btn-sm btn-outline-light" data-action="run" data-id="${flow.id}">Run</button>
          <button class="btn btn-sm btn-outline-light" data-action="duplicate" data-id="${flow.id}">Duplicate</button>
          <button class="btn btn-sm btn-danger" data-action="delete" data-id="${flow.id}">Delete</button>
        </div>
      </div>
    </article>
  `).join(""));

    flows.forEach((flow) => {
        RestFlow.renderMiniFlowPreview(flow, document.getElementById(`preview-${flow.id}`));
    });
}

function renderRecentActivityLog() {
    const workspace = getWorkspace();
    const logs = workspace.activityLog.slice(0, 8);

    if (!logs.length) {
        $("#activityLog").html(RestFlow.renderEmptyState("No activity yet."));
        return;
    }

    $("#activityLog").html(logs.map((entry) => `
    <article class="activity-item">
      <span class="activity-dot"></span>
      <div>
        <p class="activity-title">${RestFlow.escapeHtml(entry.module)} · ${RestFlow.escapeHtml(entry.action)}</p>
        <p class="activity-detail">${RestFlow.escapeHtml(entry.detail)}</p>
        <span class="activity-time">${RestFlow.formatTimestamp(entry.createdAt)}</span>
      </div>
    </article>
  `).join(""));
}

function openFlow(id) {
    const workspace = getWorkspace();
    const flow = workspace.savedFlows.find((item) => item.id === id);
    if (!flow) return;

    workspace.currentFlowDraft = JSON.parse(JSON.stringify(flow));
    RestFlow.saveWorkspace(workspace);
    window.location.href = "flow-designer.html";
}

function runFlow(id) {
    const workspace = getWorkspace();
    workspace.currentFlowDraft = JSON.parse(JSON.stringify(workspace.savedFlows.find((item) => item.id === id)));
    RestFlow.saveWorkspace(workspace);
    window.location.href = `flow-runner.html?flow=${encodeURIComponent(id)}`;
}

function duplicateFlow(id) {
    const workspace = getWorkspace();
    const flow = workspace.savedFlows.find((item) => item.id === id);
    if (!flow) return;

    const copy = JSON.parse(JSON.stringify(flow));
    copy.id = RestFlow.generateId("flow");
    copy.name = `${flow.name} Copy`;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;

    workspace.savedFlows.unshift(copy);
    RestFlow.saveWorkspace(workspace);
    RestFlow.addActivityLog("Dashboard", "Duplicated flow", `Duplicated '${flow.name}'`);
    RestFlow.showStatus("Flow duplicated.", "success");
    renderDashboardStats();
    renderRecentFlows();
    renderRecentActivityLog();
}

function deleteFlow(id) {
    const workspace = getWorkspace();
    const flow = workspace.savedFlows.find((item) => item.id === id);
    if (!flow) return;

    if (!window.confirm(`Delete "${flow.name}"?`)) return;

    workspace.savedFlows = workspace.savedFlows.filter((item) => item.id !== id);
    workspace.executionLogs = workspace.executionLogs.filter((log) => log.flowId !== id);
    RestFlow.saveWorkspace(workspace);
    RestFlow.addActivityLog("Dashboard", "Deleted flow", `Deleted '${flow.name}'`);
    RestFlow.showStatus("Flow deleted.", "success");
    renderDashboardStats();
    renderRecentFlows();
    renderRecentActivityLog();
}

function bindDashboardActions() {
    $(document).on("click", "[data-action]", function () {
        const action = $(this).data("action");
        const id = $(this).data("id");

        if (action === "open") openFlow(id);
        if (action === "run") runFlow(id);
        if (action === "duplicate") duplicateFlow(id);
        if (action === "delete") deleteFlow(id);
    });
}

$(function () {
    RestFlow.renderSidebar("dashboard");
    RestFlow.applyThemeSettings();
    renderQuickActions();
    renderDashboardStats();
    renderRecentFlows();
    renderRecentActivityLog();
    bindDashboardActions();
});