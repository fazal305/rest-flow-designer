let workspace = null;

const colorTokens = [
    { key: "bg", label: "Background" },
    { key: "bgSoft", label: "Soft background" },
    { key: "card", label: "Card surface" },
    { key: "text", label: "Text" },
    { key: "muted", label: "Muted text" },
    { key: "primary", label: "Primary accent" },
    { key: "secondary", label: "Secondary accent" },
    { key: "success", label: "Success" },
    { key: "warning", label: "Warning" },
    { key: "danger", label: "Danger" }
];

const fontOptions = [
    "Inter, sans-serif",
    "Arial, sans-serif",
    "Segoe UI, sans-serif",
    "Georgia, serif",
    "Trebuchet MS, sans-serif",
    "Verdana, sans-serif"
];

const themePresets = [
    {
        id: "deep-ops",
        name: "Deep Ops",
        theme: RestFlow.defaultWorkspace.theme
    },
    {
        id: "clean-slate",
        name: "Clean Slate",
        theme: {
            bg: "#eef4fb",
            bgSoft: "#ffffff",
            card: "rgba(255,255,255,0.92)",
            text: "#102033",
            muted: "#5b6b82",
            primary: "#2563eb",
            secondary: "#7c3aed",
            success: "#16a34a",
            warning: "#ca8a04",
            danger: "#e11d48",
            radius: 12,
            fontFamily: "Segoe UI, sans-serif"
        }
    },
    {
        id: "terminal-pro",
        name: "Terminal Pro",
        theme: {
            bg: "#07100b",
            bgSoft: "#0c1a12",
            card: "rgba(12,26,18,0.92)",
            text: "#ecfdf5",
            muted: "#a7c4b5",
            primary: "#34d399",
            secondary: "#60a5fa",
            success: "#86efac",
            warning: "#fde047",
            danger: "#fb7185",
            radius: 10,
            fontFamily: "Verdana, sans-serif"
        }
    }
];

function rgbaToHex(value) {
    if (!String(value).startsWith("rgba")) return value;
    const parts = value.match(/\d+(\.\d+)?/g) || [];
    const [r, g, b] = parts.map(Number);
    return `#${[r, g, b].map((num) => num.toString(16).padStart(2, "0")).join("")}`;
}

function renderThemeCustomizer() {
    $("#themeCustomizer").html(colorTokens.map((token) => `
    <div class="theme-token-control">
      <label for="theme-${token.key}">${RestFlow.escapeHtml(token.label)}</label>
      <input id="theme-${token.key}" type="color" data-theme-token="${token.key}" value="${rgbaToHex(workspace.theme[token.key])}">
    </div>
  `).join(""));

    $("#radiusInput").val(workspace.theme.radius);
    $("#radiusValue").text(`${workspace.theme.radius}px`);

    $("#fontFamilyInput").html(fontOptions.map((font) => `
    <option value="${RestFlow.escapeHtml(font)}" ${workspace.theme.fontFamily === font ? "selected" : ""}>${RestFlow.escapeHtml(font)}</option>
  `).join(""));
}

function renderPresets() {
    $("#presetGrid").html(themePresets.map((preset) => `
    <button class="preset-card" data-preset-id="${preset.id}">
      <span class="preset-swatches">
        <span class="preset-swatch" style="--swatch-color:${preset.theme.bg}"></span>
        <span class="preset-swatch" style="--swatch-color:${preset.theme.primary}"></span>
        <span class="preset-swatch" style="--swatch-color:${preset.theme.secondary}"></span>
        <span class="preset-swatch" style="--swatch-color:${preset.theme.success}"></span>
      </span>
      <strong>${RestFlow.escapeHtml(preset.name)}</strong>
    </button>
  `).join(""));
}

function renderBehaviorSettings() {
    $("#transitionSpeedInput").val(workspace.settings.transitionSpeedMs);
    $("#transitionValue").text(`${workspace.settings.transitionSpeedMs}ms`);

    $("#defaultZoomInput").val(workspace.settings.defaultZoom);
    $("#zoomValue").text(`${Math.round(workspace.settings.defaultZoom * 100)}%`);

    $("#compactSidebarInput").prop("checked", Boolean(workspace.settings.compactSidebar));
}

function updateThemeToken(name, value) {
    workspace.theme[name] = value;
    RestFlow.saveWorkspace(workspace);
    RestFlow.applyThemeSettings();
}

function applyThemePreset(presetId) {
    const preset = themePresets.find((item) => item.id === presetId);
    if (!preset) return;

    workspace.theme = JSON.parse(JSON.stringify(preset.theme));
    RestFlow.saveWorkspace(workspace);
    RestFlow.applyThemeSettings();
    renderThemeCustomizer();
    renderBehaviorSettings();
    RestFlow.addActivityLog("Settings", "Theme changed", `Applied '${preset.name}' preset`);
    RestFlow.showStatus("Theme preset applied.", "success");
}

function resetThemeToDefault() {
    workspace.theme = JSON.parse(JSON.stringify(RestFlow.defaultWorkspace.theme));
    RestFlow.saveWorkspace(workspace);
    RestFlow.applyThemeSettings();
    renderThemeCustomizer();
    RestFlow.addActivityLog("Settings", "Theme reset", "Reset theme to defaults");
    RestFlow.showStatus("Theme reset.", "success");
}

function setTransitionSpeed(ms) {
    workspace.settings.transitionSpeedMs = Number(ms);
    RestFlow.saveWorkspace(workspace);
    RestFlow.applyThemeSettings();
    $("#transitionValue").text(`${workspace.settings.transitionSpeedMs}ms`);
}

function setDefaultZoom(level) {
    workspace.settings.defaultZoom = Number(level);
    RestFlow.saveWorkspace(workspace);
    $("#zoomValue").text(`${Math.round(workspace.settings.defaultZoom * 100)}%`);
}

function toggleCompactSidebar() {
    workspace.settings.compactSidebar = $("#compactSidebarInput").is(":checked");
    RestFlow.saveWorkspace(workspace);
    RestFlow.applyThemeSettings();
}

function exportWorkspace() {
    RestFlow.downloadJson("rest-flow-designer-workspace.json", workspace);
    RestFlow.addActivityLog("Settings", "Workspace exported", "Exported full workspace JSON");
    RestFlow.showStatus("Workspace exported.", "success");
}

function importWorkspace(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function () {
        try {
            const imported = JSON.parse(reader.result);
            workspace = RestFlow.saveWorkspace(imported);
            RestFlow.applyThemeSettings();
            renderThemeCustomizer();
            renderBehaviorSettings();
            renderPresets();
            RestFlow.addActivityLog("Settings", "Workspace imported", "Imported workspace JSON");
            RestFlow.showStatus("Workspace imported.", "success");
        } catch (error) {
            RestFlow.showStatus("Import failed. Choose a valid JSON file.", "danger");
        }
    };

    reader.readAsText(file);
}

function resetDemoWorkspace() {
    if (!window.confirm("Reset workspace to demo data?")) return;
    workspace = RestFlow.resetWorkspace();
    RestFlow.applyThemeSettings();
    renderThemeCustomizer();
    renderBehaviorSettings();
    renderPresets();
    RestFlow.showStatus("Demo workspace restored.", "success");
}

function clearWorkspace() {
    if (!window.confirm("Clear REST Flow Designer localStorage entirely?")) return;
    localStorage.removeItem(RestFlow.STORAGE_KEY);
    workspace = RestFlow.seedDemoData();
    RestFlow.applyThemeSettings();
    renderThemeCustomizer();
    renderBehaviorSettings();
    renderPresets();
    RestFlow.showStatus("Workspace cleared and reseeded.", "success");
}

function bindSettingsEvents() {
    $(document).on("input", "[data-theme-token]", function () {
        updateThemeToken($(this).data("theme-token"), this.value);
    });

    $("#radiusInput").on("input", function () {
        updateThemeToken("radius", Number(this.value));
        $("#radiusValue").text(`${this.value}px`);
    });

    $("#fontFamilyInput").on("change", function () {
        updateThemeToken("fontFamily", this.value);
    });

    $(document).on("click", "[data-preset-id]", function () {
        applyThemePreset($(this).data("preset-id"));
    });

    $("#resetThemeBtn").on("click", resetThemeToDefault);
    $("#transitionSpeedInput").on("input", function () { setTransitionSpeed(this.value); });
    $("#defaultZoomInput").on("input", function () { setDefaultZoom(this.value); });
    $("#compactSidebarInput").on("change", toggleCompactSidebar);

    $("#exportWorkspaceBtn").on("click", exportWorkspace);
    $("#importWorkspaceInput").on("change", importWorkspace);
    $("#resetDemoBtn").on("click", resetDemoWorkspace);
    $("#clearWorkspaceBtn").on("click", clearWorkspace);
}

$(function () {
    RestFlow.renderSidebar("settings");
    RestFlow.applyThemeSettings();
    workspace = RestFlow.loadWorkspace();
    renderThemeCustomizer();
    renderPresets();
    renderBehaviorSettings();
    bindSettingsEvents();
});