/**========================================================================
 * ?                  Q_Spans_Pro.jsx
 * @author         :  Jason Schwarz (https://hellolovely.tv)
 * @email          :  hello@hellolovely.tv
 * @version        :  1.0.0
 * @createdFor     :  After Effects CC 2022+ (v22+)
 * @description    :  Dockable panel for queuing render items from composition or layer span markers.
 *========================================================================**/

// ============================================================
// SECTION 1 — Global State
// ============================================================

var gOutputFolder             = null;  // Folder object, set by Browse button
var gOutputModuleTemplateName = "";    // String, name of selected OM template

// ============================================================
// SECTION 2 — Utility / Helper Functions
// ============================================================

function padTwo(n) {
    return (n < 10) ? ("0" + n) : ("" + n);
}

function secondsToTimecode(seconds, frameRate) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor(seconds % 60);
    var f = Math.floor((seconds % 1) * frameRate);
    return padTwo(h) + ":" + padTwo(m) + ":" + padTwo(s) + ":" + padTwo(f);
}

function fillRoundedRect(g, brush, x, y, w, h, r) {
    if (r > h / 2) { r = Math.floor(h / 2); }
    if (r > w / 2) { r = Math.floor(w / 2); }
    // Vertical centre strip
    g.rectPath(x, y + r, w, h - 2 * r);
    g.fillPath(brush);
    // Horizontal top strip
    g.rectPath(x + r, y, w - 2 * r, r);
    g.fillPath(brush);
    // Horizontal bottom strip
    g.rectPath(x + r, y + h - r, w - 2 * r, r);
    g.fillPath(brush);
    // Four corner quarter-circles
    g.ellipsePath(x, y, 2 * r, 2 * r);
    g.fillPath(brush);
    g.ellipsePath(x + w - 2 * r, y, 2 * r, 2 * r);
    g.fillPath(brush);
    g.ellipsePath(x, y + h - 2 * r, 2 * r, 2 * r);
    g.fillPath(brush);
    g.ellipsePath(x + w - 2 * r, y + h - 2 * r, 2 * r, 2 * r);
    g.fillPath(brush);
}

// opts: { width, primary, hoverColor }
// hoverColor: array [r, g, b, a] in 0-1 float — overrides hover state color only.
function createStyledButton(parent, label, width, primary, hoverColor) {
    var btn = parent.add("button", undefined, "");
    btn.preferredSize  = [width || 90, 26];
    btn._label      = label;
    btn._hover      = false;
    btn._press      = false;
    btn._primary    = primary    || false;
    btn._hoverColor = hoverColor || null;

    btn.addEventListener("mouseover", function () { btn._hover = true;  btn.notify("onDraw"); });
    btn.addEventListener("mouseout",  function () { btn._hover = false; btn._press = false; btn.notify("onDraw"); });
    btn.addEventListener("mousedown", function () { btn._press = true;  btn.notify("onDraw"); });
    btn.addEventListener("mouseup",   function () { btn._press = false; btn.notify("onDraw"); });

    btn.onDraw = function () {
        var g  = this.graphics;
        var w  = this.size[0];
        var h  = this.size[1];
        var bg;

        if (this._primary) {
            bg = this._press  ? [0.16, 0.40, 0.75, 1]
               : this._hover ? [0.25, 0.55, 0.92, 1]
               :               [0.22, 0.50, 0.86, 1];
        } else {
            bg = this._press  ? [0.22, 0.22, 0.22, 1]
               : this._hover  && this._hoverColor ? this._hoverColor
               : this._hover ? [0.38, 0.38, 0.38, 1]
               :               [0.30, 0.30, 0.30, 1];
        }

        fillRoundedRect(g, g.newBrush(g.BrushType.SOLID_COLOR, bg), 0, 0, w, h, 4);

        var pen = g.newPen(g.PenType.SOLID_COLOR, [1, 1, 1, 1], 1);
        var sz  = g.measureString(this._label);
        g.drawString(this._label, pen, (w - sz.width) / 2, (h - sz.height) / 2);
    };

    return btn;
}

function getOutputModuleTemplates() {
    var templates = [];

    // Find a CompItem to use as a dummy source
    var dummyComp = null;
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.items[i] instanceof CompItem) {
            dummyComp = app.project.items[i];
            break;
        }
    }
    if (!dummyComp) return templates;

    var dummyItem = null;
    try {
        dummyItem = app.project.renderQueue.items.add(dummyComp);
        var rawTemplates = dummyItem.outputModules[1].templates;
        for (var t = 0; t < rawTemplates.length; t++) {
            templates.push(rawTemplates[t]);
        }
    } catch (e) {
        // silently return whatever we have
    } finally {
        if (dummyItem) dummyItem.remove();
    }

    return templates;
}

function showUnnamedMarkerDialog(markerIndex, timecodeStr) {
    var dlg = new Window("dialog", "Unnamed Marker");
    dlg.orientation  = "column";
    dlg.alignChildren = "fill";
    dlg.spacing      = 10;
    dlg.margins      = 14;

    var infoGroup = dlg.add("group");
    infoGroup.orientation = "column";
    infoGroup.alignChildren = "left";
    infoGroup.add("statictext", undefined,
        "Marker " + markerIndex + " at " + timecodeStr + " has no name.");
    infoGroup.add("statictext", undefined,
        "Enter a name, or skip to auto-number it.");

    var nameField = dlg.add("edittext", undefined, "");
    nameField.preferredSize.width = 260;
    nameField.active = true;

    var btnGroup = dlg.add("group");
    btnGroup.alignment  = "right";
    btnGroup.orientation = "row";
    btnGroup.spacing     = 6;
    var btnOk   = btnGroup.add("button", undefined, "OK");
    var btnSkip = btnGroup.add("button", undefined, "Skip");

    var result = { action: "skip" };

    btnOk.onClick = function () {
        result = { action: "ok", name: nameField.text };
        dlg.close();
    };
    btnSkip.onClick = function () {
        result = { action: "skip" };
        dlg.close();
    };

    dlg.show();
    return result;
}

function buildOutputFilePath(outputFolder, compName, markerName) {
    return new File(outputFolder.fsName + "/" + compName + "_" + markerName);
}

// ============================================================
// SECTION 3 — Core Logic
// ============================================================

// Shared render-queue loop used by both queue functions.
// skipCounterObj: { count: Number } — passed as object so mutations persist.
// Returns an array of descriptions for zero-duration (skipped) markers.
function processMarkerProperty(markerProp, comp, skipCounterObj) {
    var skippedDescriptions = [];

    for (var i = 1; i <= markerProp.numKeys; i++) {
        var marker     = markerProp.keyValue(i);
        var markerTime = markerProp.keyTime(i);
        var markerName = marker.comment;

        // Skip zero-duration markers
        if (marker.duration <= 0) {
            skippedDescriptions.push(markerName ? markerName : ("#" + i));
            continue;
        }

        // Handle unnamed markers
        if (markerName === "") {
            var tc        = secondsToTimecode(markerTime, comp.frameRate);
            var dlgResult = showUnnamedMarkerDialog(i, tc);
            if (dlgResult.action === "ok") {
                markerName = dlgResult.name;
            } else {
                markerName = "_" + padTwo(skipCounterObj.count);
                skipCounterObj.count++;
            }
        }

        // Add render queue item
        var item              = app.project.renderQueue.items.add(comp);
        item.timeSpanStart    = markerTime;
        item.timeSpanDuration = marker.duration;

        // Apply output module template
        var output = item.outputModules[1];
        if (gOutputModuleTemplateName !== "") {
            try {
                output.applyTemplate(gOutputModuleTemplateName);
            } catch (e) {
                // Template not found — use AE default
            }
        }

        // Set output file path
        output.file = buildOutputFilePath(gOutputFolder, comp.name, markerName);
    }

    return skippedDescriptions;
}

function queueCompMarkerSpans() {
    app.beginUndoGroup("Queue Comp Marker Spans");

    function exit(msg) {
        if (msg) alert(msg);
        app.endUndoGroup();
    }

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return exit("Please select a composition.");
    }

    if (!app.project.file) {
        return exit("Please save the project before queuing renders.");
    }

    if (!gOutputFolder) {
        return exit("Please choose an output folder before queuing renders.");
    }

    var compMarkers = comp.markerProperty;
    if (compMarkers.numKeys === 0) {
        return exit("The active composition has no markers.");
    }

    var skipCounterObj = { count: 0 };
    var skipped        = processMarkerProperty(compMarkers, comp, skipCounterObj);

    if (skipped.length) {
        alert("Skipped " + skipped.length + " zero-duration marker(s):\n" + skipped.join(", "));
    }

    app.endUndoGroup();
}

function queueLayerMarkerSpans() {
    app.beginUndoGroup("Queue Layer Marker Spans");

    function exit(msg) {
        if (msg) alert(msg);
        app.endUndoGroup();
    }

    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return exit("Please select a composition.");
    }

    if (!app.project.file) {
        return exit("Please save the project before queuing renders.");
    }

    if (!gOutputFolder) {
        return exit("Please choose an output folder before queuing renders.");
    }

    var spanLayer = comp.selectedLayers[0];
    if (!spanLayer) {
        return exit("Please select a layer.");
    }

    var layerMarkers = spanLayer.property("Marker");
    if (layerMarkers.numKeys === 0) {
        return exit("The selected layer has no markers.");
    }

    var skipCounterObj = { count: 0 };
    var skipped        = processMarkerProperty(layerMarkers, comp, skipCounterObj);

    if (skipped.length) {
        alert("Skipped " + skipped.length + " zero-duration marker(s):\n" + skipped.join(", "));
    }

    app.endUndoGroup();
}

// ============================================================
// SECTION 4 — UI Construction
// ============================================================

function createUIPanel(thisObj) {
    var uiPanel = (thisObj instanceof Panel)
        ? thisObj
        : new Window("palette", "Q Spans Pro", undefined, { resizeable: true });

    if (!uiPanel) return;

    uiPanel.orientation   = "column";
    uiPanel.alignChildren = "fill";
    uiPanel.spacing       = 8;
    uiPanel.margins       = 10;

    // --- Output Module Row ---
    var templateRow = uiPanel.add("group");
    templateRow.orientation   = "row";
    templateRow.alignChildren = "center";
    templateRow.spacing       = 6;

    templateRow.add("statictext", undefined, "Output Module:");

    var templateDropdown = templateRow.add("dropdownlist", undefined, []);
    templateDropdown.preferredSize.width = 150;

    var templates    = getOutputModuleTemplates();
    var defaultIndex = 0;
    for (var t = 0; t < templates.length; t++) {
        templateDropdown.add("item", templates[t]);
        // AE marks the user's default template with "(default)" in its name
        if (templates[t].indexOf("(default)") !== -1 ||
            templates[t] === "Lossless") {
            defaultIndex = t;
        }
    }
    if (templateDropdown.items.length > 0) {
        templateDropdown.selection    = defaultIndex;
        gOutputModuleTemplateName     = templateDropdown.items[defaultIndex].text;
    }

    templateDropdown.onChange = function () {
        if (this.selection) {
            gOutputModuleTemplateName = this.selection.text;
        }
    };

    // --- Output Folder Row ---
    var folderRow = uiPanel.add("group");
    folderRow.orientation   = "row";
    folderRow.alignChildren = "center";
    folderRow.spacing       = 6;

    folderRow.add("statictext", undefined, "Output Folder:");
    var folderField = folderRow.add("edittext", undefined, "-- No Folder --");
    folderField.preferredSize.width = 90;
    folderField.graphics.foregroundColor =
        folderField.graphics.newPen(folderField.graphics.PenType.SOLID_COLOR, [1, 1, 1, 1], 1);
    // Keep enabled so text color is not greyed out; block keyboard input to stay read-only
    folderField.addEventListener("keydown", function (e) { e.preventDefault(); });

    var btnBrowse = createStyledButton(folderRow, "Browse...", 60, true);

    btnBrowse.onClick = function () {
        var startPath = (app.project.file)
            ? app.project.file.parent.fsName
            : Folder.desktop.fsName;

        // Pass fsName string as second arg — required for Windows to respect start location
        var picked = Folder.selectDialog("Select Output Folder", startPath);
        if (picked !== null) {
            gOutputFolder    = picked;
            folderField.text = picked.name;
        }
    };

    // --- Button Row ---
    var buttonRow = uiPanel.add("group");
    buttonRow.orientation   = "row";
    buttonRow.alignChildren = "center";
    buttonRow.spacing       = 4;

    var btnHelp       = createStyledButton(buttonRow, "?", 26, false, [1.0, 0.725, 0.196, 1]);
    var btnQueueComp  = createStyledButton(buttonRow, "Q Comp Spans",  100, false, [0.22, 0.50, 0.86, 1]);
    var btnQueueLayer = createStyledButton(buttonRow, "Q Layer Spans", 100, false, [0.22, 0.50, 0.86, 1]);

    btnQueueComp.onClick  = queueCompMarkerSpans;
    btnQueueLayer.onClick = queueLayerMarkerSpans;
    btnHelp.onClick = function () {
        alert(
            "Q Spans Pro\n\n" +
            "Q Comp Spans:\n" +
            "Adds a render queue item for each span marker on the active composition.\n\n" +
            "Q Layer Spans:\n" +
            "Adds a render queue item for each span marker on the selected layer.\n\n" +
            "Markers with no comment will prompt you to name them.\n" +
            "Zero-duration markers are skipped.\n\n" +
            "Set an Output Module template and Output Folder before queuing."
        );
    };

    // --- Layout ---
    uiPanel.layout.layout(true);
    uiPanel.layout.resize();
    uiPanel.onResizing = uiPanel.onResize = function () {
        this.layout.resize();
    };

    if (uiPanel instanceof Window) {
        uiPanel.center();
        uiPanel.show();
    }

    return uiPanel;
}

// ============================================================
// SECTION 5 — Entry Point
// ============================================================

createUIPanel(this);
