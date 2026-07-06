# REST Flow Designer

An interactive, browser-based visual workflow builder for designing and
actually running API flows — HTTP requests, data transforms, conditions,
and delays — wired together on a canvas, with real execution and real
generated code export.

## Live Links

- GitHub Repository: [fazal305/rest-flow-designer](https://github.com/fazal305/rest-flow-designer)
- Live Demo: [https://fazal305.github.io/rest-flow-designer/](https://fazal305.github.io/rest-flow-designer/)

## Overview

REST Flow Designer is a multi-page frontend application for visually building API workflows as connected nodes. It works entirely in the browser with localStorage persistence, real `fetch()` execution, real JavaScript transform and condition evaluation, dynamic theming, and runnable code generation.

## Pages

- Dashboard: overview, workspace stats, activity, quick actions, and recent flow previews.
- Flow Designer: visual node canvas for building, wiring, configuring, and saving API flows.
- Flow Runner: real execution engine with full step logging and run history.
- Saved Flows: searchable and filterable flow library with preview and management actions.
- Export Center: JSON export and generated standalone JavaScript export.
- Settings: live theme customizer, behavior settings, workspace import/export, and reset tools.

## Features

- Multi-page browser app with one HTML, CSS, and JS file per major module.
- Shared sidebar navigation with active page highlighting.
- Smooth shared page transitions with automatic loader fallback.
- Visual workflow canvas with request, transform, condition, delay, and output nodes.
- Drag-to-position nodes and port-based node connections.
- Real HTTP request execution using the Fetch API.
- Real JavaScript expression evaluation for transform and condition nodes.
- Step mode and full-run mode in the Flow Runner.
- Persistent execution logs and recent activity logs.
- Saved flow search, tag filtering, duplicate, rename, delete, open, run, and export actions.
- Live mini flow previews rendered from real node and connection data.
- Dynamic theme system powered by CSS custom properties written at runtime.
- Workspace export/import through JSON.
- Runnable JavaScript generation from the selected visual graph.
- No build step, no framework, and no backend required.

## Technologies Used

- HTML5
- CSS3 (custom properties / dynamic theming)
- Bootstrap 5
- jQuery
- Vanilla JavaScript
- Fetch API
- LocalStorage
- Blob API
- Clipboard API

## Learning Outcomes

- Building a complete no-build, multi-page frontend application.
- Designing a shared state model with localStorage persistence.
- Rendering and manipulating node/connection graph data.
- Implementing real API workflow orchestration in the browser.
- Evaluating controlled JavaScript expressions with `new Function(...)`.
- Generating runnable code from a visual graph model.
- Creating reusable shared utilities across dedicated page modules.
- Building a dynamic theme system without fixed page-level colors.
- Designing smooth page transitions for a traditional multi-page app.
- Creating portfolio-ready enterprise UI with Bootstrap, jQuery, and vanilla JavaScript.

## Architecture Notes

REST Flow Designer uses a multi-page frontend architecture: each major module has its own HTML file, JavaScript file, and CSS file. Shared layout, cards, typography, sidebar, buttons, forms, transitions, and utility styles live in `styles.css`, while module-specific styling lives in the relevant file under `css/`.

Shared JavaScript utilities live in `js/shared.js`. That file owns workspace loading/saving, demo data seeding, activity logs, theme application, sidebar rendering, status messages, graph helpers, transform and condition evaluation, flow execution, export code generation, mini preview rendering, and the page-transition system.

The localStorage workspace model stores settings, theme tokens, the current designer draft, saved flows, execution logs, and activity logs. The theme system is fully dynamic: CSS files reference custom properties, and runtime JavaScript applies the current workspace theme to `:root`.

Flows are represented as node/connection graphs. Nodes hold type-specific configuration for requests, transforms, conditions, delays, and outputs. Connections define how data moves from one node to another, including true/false condition branches.

Execution is real behavior rather than canned output. Request nodes use `fetch()`, transform nodes run JavaScript expressions against incoming data, condition nodes evaluate a boolean expression, delay nodes wait with `setTimeout`, and output nodes capture the final result.

The Export Center generates either raw flow JSON or runnable JavaScript. The JavaScript export includes the selected flow graph and reproduces its request, transform, condition, delay, and traversal logic outside the app.

The shared page-transition system injects a full-screen overlay into every page, fades it out on load, intercepts internal navigation links, fades back in on navigation, and shows a loader when a transition takes longer than the configured timing.

The app is intentionally no-build: it runs locally by opening `index.html` directly in a browser. Bootstrap and jQuery are loaded from CDNs only.

## Folder Structure

```text
rest-flow-designer/
  index.html
  flow-designer.html
  flow-runner.html
  saved-flows.html
  export.html
  settings.html

  styles.css

  css/
    dashboard.css
    flow-designer.css
    flow-runner.css
    saved-flows.css
    export.css
    settings.css

  js/
    shared.js
    dashboard.js
    flow-designer.js
    flow-runner.js
    saved-flows.js
    export.js
    settings.js

  README.md
  LICENSE
  .gitignore
```

How To Run Locally
git clone https://github.com/fazal305/rest-flow-designer.git
cd rest-flow-designer
Open index.html directly in your browser.
No build command is required.
How To Use
Open index.html to view the dashboard and seeded demo workspace.
Go to Flow Designer.
Add nodes from the palette or apply a starter template.
Configure each node in the configuration panel.
Connect node output ports to input ports.
Save the flow with a name, description, and tags.
Open Flow Runner and select the saved flow.
Run the flow normally or enable Step Mode.
Inspect each real execution step and final output.
Go to Export Center to copy or download JSON or runnable JavaScript.
Open Settings to customize the theme and workspace behavior.
Sample Workflow
Build a flow with a Request node, a Transform node, and another Request node. Configure the first Request node to fetch a sample user, configure the Transform node to return only the fields you want, and configure the second Request node to post the transformed payload.
Save the flow, then open it in the Flow Runner. Run it and inspect the execution log to see the real request output, transform result, second request response, timing, and final captured output.
Open Export Center and export the same flow as runnable JavaScript. The generated file contains the graph and execution logic needed to run the flow outside REST Flow Designer.
Finally, open Settings, change the theme colors, radius, and font, and watch the entire app update instantly through the runtime theme system.
