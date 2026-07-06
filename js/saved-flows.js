let workspace = null;
let renameModal = null;

function getAllTags() {
    return [...new Set(workspace.savedFlows.flatMap((flow) => flow.tags || []))].sort();
}

function renderTagFilters() {
    const tags = getAllTags();
    $("#tagFilter").html(`<option value="">All tags</option>${tags.map((tag) => `<option value="${RestFlow.escapeHtml(tag)}">${RestFlow.escapeHtml(tag)}</option>`).join("")}`);

    $("#tagChips").html(tags.map((tag) => `
    <button class="filter-chip" data-tag-chip="${RestFlow.escapeHtml(tag)}">${RestFlow.escapeHtml(tag)}</button>
  `).join(""));
}

function filterSavedFlows(query, tag) {
    const normalizedQuery = String(query || "").toLowerCase();
    return workspace.savedFlows.filter((flow) => {
        const matchesQuery = !normalizedQuery || flow.name.toLowerCase().includes(normalizedQuery) || (flow.description || "").toLowerCase().includes(normalizedQuery);
        const matchesTag = !tag || (flow.tags || []).includes(tag);
        return matchesQuery && matchesTag;
    });
}

function renderSavedFlows() {
    const query = $("#searchInput").val();
    const tag = $("#tagFilter").val();
    const flows = filterSavedFlows(query, tag);

    $(".filter-chip").removeClass("active");
    if (tag) $(`[data-tag-chip="${tag}"]`).addClass("active");

    if (!flows.length) {
        $("#savedFlowGrid").html(RestFlow.renderEmptyState("No saved flows match your filters."));
        return;
    }

    $("#savedFlowGrid").html(flows.map((flow) => `
    <article class="saved-flow-card">
      <div class="saved-flow-header">
        <div>
          <h2 class="saved-flow-title">${RestFlow.escapeHtml(flow.name)}</h2>
          <p class="saved-flow-description">${RestFlow.escapeHtml(flow.description || "No description")}</p>
        </div>
        <span class="badge-token">${flow.nodes.length} nodes</span>
      </div>

      <div class="mini-flow-preview" id="saved-preview-${flow.id}"></div>

      <div class="saved-flow-tags">
        ${(flow.tags || []).map((tag) => `<span class="badge-token">${RestFlow.escapeHtml(tag)}</span>`).join("") || `<span class="badge-token">untagged</span>`}
      </div>

      <div class="saved-flow-meta">
        <span>${flow.connections.length} connections</span>
        <span>Updated ${RestFlow.formatTimestamp(flow.updatedAt)}</span>
      </div>

      <div class="saved-flow-actions">
        <button class="btn btn-sm btn-outline-primary" data-action="open" data-id="${flow.id}">Open</button>
        <button class="btn btn-sm btn-outline-light" data-action="run" data-id="${flow.id}">Run</button>
        <button class="btn btn-sm btn-outline-light" data-action="duplicate" data-id="${flow.id}">Duplicate</button>
        <button class="btn btn-sm btn-outline-light" data-action="rename" data-id="${flow.id}">Rename</button>
        <button class="btn btn-sm btn-outline-primary" data-action="export" data-id="${flow.id}">Export</button>
        <button class="btn btn-sm btn-danger" data-action="delete" data-id="${flow.id}">Delete</button>
      </div>
    </article>
  `).join(""));

    flows.forEach((flow) => {
        RestFlow.renderMiniFlowPreview(flow, document.getElementById(`saved-preview-${flow.id}`));
    });
}

function openFlowInDesigner(id) {
    const flow = workspace.savedFlows.find((item) => item.id === id);
    if (!flow) return;

    workspace.currentFlowDraft = JSON.parse(JSON.stringify(flow));
    RestFlow.saveWorkspace(workspace);
    window.location.href = "flow-designer.html";
}

function runFlowFromList(id) {
    const flow = workspace.savedFlows.find((item) => item.id === id);
    if (!flow) return;

    workspace.currentFlowDraft = JSON.parse(JSON.stringify(flow));
    RestFlow.saveWorkspace(workspace);
    window.location.href = `flow-runner.html?flow=${encodeURIComponent(id)}`;
}

function duplicateFlow(id) {
    const flow = workspace.savedFlows.find((item) => item.id === id);
    if (!flow) return;

    const copy = JSON.parse(JSON.stringify(flow));
    copy.id = RestFlow.generateId("flow");
    copy.name = `${flow.name} Copy`;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;

    workspace.savedFlows.unshift(copy);
    RestFlow.saveWorkspace(workspace);
    RestFlow.addActivityLog("Saved Flows", "Duplicated flow", `Duplicated '${flow.name}'`);
    RestFlow.showStatus("Flow duplicated.", "success");
    refreshSavedFlows();
}

function renameFlow(id, newName) {
    const flow = workspace.savedFlows.find((item) => item.id === id);
    if (!flow) return;

    flow.name = newName.trim() || flow.name;
    flow.updatedAt = new Date().toISOString();

    if (workspace.currentFlowDraft?.id === id) {
        workspace.currentFlowDraft.name = flow.name;
        workspace.currentFlowDraft.updatedAt = flow.updatedAt;
    }

    RestFlow.saveWorkspace(workspace);
    RestFlow.addActivityLog("Saved Flows", "Renamed flow", `Renamed flow to '${flow.name}'`);
    RestFlow.showStatus("Flow renamed.", "success");
    refreshSavedFlows();
}

function deleteFlow(id) {
    const flow = workspace.savedFlows.find((item) => item.id === id);
    if (!flow) return;

    if (!window.confirm(`Delete "${flow.name}"?`)) return;

    workspace.savedFlows = workspace.savedFlows.filter((item) => item.id !== id);
    workspace.executionLogs = workspace.executionLogs.filter((log) => log.flowId !== id);

    if (workspace.currentFlowDraft?.id === id) {
        workspace.currentFlowDraft = null;
    }

    RestFlow.saveWorkspace(workspace);
    RestFlow.addActivityLog("Saved Flows", "Deleted flow", `Deleted '${flow.name}'`);
    RestFlow.showStatus("Flow deleted.", "success");
    refreshSavedFlows();
}

function exportFlow(id) {
    window.location.href = `export.html?flow=${encodeURIComponent(id)}`;
}

function refreshSavedFlows() {
    workspace = RestFlow.loadWorkspace();
    renderTagFilters();
    renderSavedFlows();
}

function bindSavedFlowEvents() {
    $("#searchInput").on("input", renderSavedFlows);

    $("#tagFilter").on("change", renderSavedFlows);

    $("#clearFiltersBtn").on("click", function () {
        $("#searchInput").val("");
        $("#tagFilter").val("");
        renderSavedFlows();
    });

    $(document).on("click", "[data-tag-chip]", function () {
        $("#tagFilter").val($(this).data("tag-chip"));
        renderSavedFlows();
    });

    $(document).on("click", "[data-action]", function () {
        const action = $(this).data("action");
        const id = $(this).data("id");

        if (action === "open") openFlowInDesigner(id);
        if (action === "run") runFlowFromList(id);
        if (action === "duplicate") duplicateFlow(id);
        if (action === "export") exportFlow(id);
        if (action === "delete") deleteFlow(id);

        if (action === "rename") {
            const flow = workspace.savedFlows.find((item) => item.id === id);
            $("#renameFlowId").val(id);
            $("#renameFlowName").val(flow?.name || "");
            renameModal.show();
        }
    });

    $("#renameForm").on("submit", function (event) {
        event.preventDefault();
        renameFlow($("#renameFlowId").val(), $("#renameFlowName").val());
        renameModal.hide();
    });
}

$(function () {
    RestFlow.renderSidebar("saved");
    RestFlow.applyThemeSettings();
    workspace = RestFlow.loadWorkspace();
    renameModal = new bootstrap.Modal(document.getElementById("renameModal"));
    renderTagFilters();
    renderSavedFlows();
    bindSavedFlowEvents();
});