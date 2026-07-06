let workspace = null;
let selectedFlow = null;
let exportType = "json";

function getExportSources() {
    const sources = [];

    if (workspace.currentFlowDraft && workspace.currentFlowDraft.nodes?.length) {
        sources.push({
            id: "draft",
            label: `Current draft: ${workspace.currentFlowDraft.name || "Untitled Flow"}`,
            flow: workspace.currentFlowDraft
        });
    }

    workspace.savedFlows.forEach((flow) => {
        sources.push({ id: flow.id, label: flow.name, flow });
    });

    return sources;
}

function renderExportOptions() {
    const sources = getExportSources();
    const queryFlow = new URLSearchParams(window.location.search).get("flow");

    if (!sources.length) {
        $("#exportSource").html("<option>No flows available</option>");
        selectedFlow = null;
        renderExportCode();
        return;
    }

    const selectedId = queryFlow || sources[0].id;

    $("#exportSource").html(sources.map((source) => `
    <option value="${source.id}" ${source.id === selectedId ? "selected" : ""}>${RestFlow.escapeHtml(source.label)}</option>
  `).join(""));

    selectedFlow = (sources.find((source) => source.id === selectedId) || sources[0]).flow;
    renderExportSummary();
}

function selectExportSource(sourceId) {
    const source = getExportSources().find((item) => item.id === sourceId);
    selectedFlow = source?.flow || null;
    renderExportSummary();
    renderExportCode();
}

function getGeneratedContent() {
    if (!selectedFlow) return "";

    if (exportType === "json") {
        return JSON.stringify(selectedFlow, null, 2);
    }

    return RestFlow.generateFlowScript(selectedFlow);
}

function renderExportSummary() {
    if (!selectedFlow) {
        $("#exportSummary").html(RestFlow.renderEmptyState("No flow selected."));
        return;
    }

    $("#exportSummary").html(`
    <div>
      <span class="badge-token">${selectedFlow.nodes.length} nodes</span>
      <span class="badge-token">${selectedFlow.connections.length} connections</span>
    </div>
    <div>
      <strong>${RestFlow.escapeHtml(selectedFlow.name)}</strong>
      <p class="panel-text mb-0">${RestFlow.escapeHtml(selectedFlow.description || "No description")}</p>
    </div>
    <div class="d-flex flex-wrap gap-1">
      ${(selectedFlow.tags || []).map((tag) => `<span class="badge-token">${RestFlow.escapeHtml(tag)}</span>`).join("") || `<span class="badge-token">untagged</span>`}
    </div>
  `);
}

function renderExportCode() {
    $("#exportCode").text(getGeneratedContent() || "Select a flow to export.");
}

function copyExportedCode() {
    const content = getGeneratedContent();
    if (!content) {
        RestFlow.showStatus("Nothing to copy.", "warning");
        return;
    }

    RestFlow.copyText(content, "Export copied.");
    RestFlow.addActivityLog("Export Center", "Copied export", `Copied '${selectedFlow.name}' as ${exportType}`);
}

function downloadExportedFile() {
    if (!selectedFlow) {
        RestFlow.showStatus("Select a flow first.", "warning");
        return;
    }

    const baseName = RestFlow.slugify(selectedFlow.name);
    const content = getGeneratedContent();

    if (exportType === "json") {
        RestFlow.downloadJson(`${baseName}.flow.json`, selectedFlow);
    } else {
        RestFlow.downloadTextFile(`${baseName}.flow.js`, content, "text/javascript");
    }

    RestFlow.addActivityLog("Export Center", "Downloaded export", `Downloaded '${selectedFlow.name}' as ${exportType}`);
    RestFlow.showStatus("Export downloaded.", "success");
}

function bindExportEvents() {
    $("#exportSource").on("change", function () {
        selectExportSource(this.value);
    });

    $("input[name='exportType']").on("change", function () {
        exportType = this.value;
        $(".export-type-card").removeClass("active");
        $(`[data-export-card="${exportType}"]`).addClass("active");
        renderExportCode();
    });

    $(".export-type-card").on("click", function () {
        const type = $(this).data("export-card");
        exportType = type;
        $(`input[name='exportType'][value='${type}']`).prop("checked", true).trigger("change");
    });

    $("#copyExportBtn").on("click", copyExportedCode);
    $("#downloadExportBtn").on("click", downloadExportedFile);
}

$(function () {
    RestFlow.renderSidebar("export");
    RestFlow.applyThemeSettings();
    workspace = RestFlow.loadWorkspace();
    renderExportOptions();
    renderExportCode();
    bindExportEvents();
});