/**========================================================================
 * ?                  Q-Spans Plus.jsx
 * @author         :  Jason Schwarz (https://hellolovely.tv)
 * @email          :  hello@hellolovely.tv
 * @version        :  1.0.0
 * @createdFor     :  After Effects CC 2022+ (v22+)
 * @description    :  Dockable panel for queuing render items from composition and layer marker spans. Single non-span markers will be skipped.
 *========================================================================**/

(function (thisObj) {

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
    // Derive all components from total frame count to avoid floating-point drift
    // at non-integer frame rates (23.976, 29.97, 59.94, etc.)
    var totalFrames = Math.round(seconds * frameRate);
    var f           = totalFrames % Math.round(frameRate);
    var totalSecs   = Math.floor(totalFrames / Math.round(frameRate));
    var s           = totalSecs % 60;
    var totalMins   = Math.floor(totalSecs / 60);
    var m           = totalMins % 60;
    var h           = Math.floor(totalMins / 60);
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

// Parse output module template names and default index from AE's prefs file.
// Returns { templates: Array, defaultIndex: Number }
// Falls back to dummy render queue item if the prefs file cannot be read.
function getOutputModuleTemplates() {

    // --- Primary: parse from prefs file ---
    var result = getTemplatesFromPrefs();
    if (result.templates.length > 0) { return result; }

    // --- Fallback: dummy render queue item ---
    return getTemplatesFromRenderQueue();
}

function getAEPrefsFolder() {
    // Locate the most recently modified AE version folder under AppData/Roaming/Adobe/After Effects
    var isWin   = ($.os.indexOf("Windows") !== -1);
    var basePath = isWin
        ? $.getenv("APPDATA") + "/Adobe/After Effects"
        : Folder.userData.fsName + "/Library/Preferences/Adobe/After Effects";

    var baseFolder = new Folder(basePath);
    if (!baseFolder.exists) { return null; }

    var subFolders = baseFolder.getFiles(function (f) { return f instanceof Folder; });
    if (!subFolders || subFolders.length === 0) { return null; }

    // Pick the most recently modified folder (highest version number)
    var best = null;
    var bestVer = -1;
    for (var i = 0; i < subFolders.length; i++) {
        var verStr = subFolders[i].name;
        var verNum = parseFloat(verStr);
        if (!isNaN(verNum) && verNum > bestVer) {
            bestVer = verNum;
            best    = subFolders[i];
        }
    }
    return best;
}

function getTemplatesFromPrefs() {
    var result = { templates: [], defaultIndex: 0 };

    var versionFolder = getAEPrefsFolder();
    if (!versionFolder) { return result; }

    var verName  = versionFolder.name; // e.g. "26.0"
    var prefsFile = new File(
        versionFolder.fsName + "/Adobe After Effects " + verName + " Prefs-indep-output.txt"
    );
    if (!prefsFile.exists) { return result; }

    var fileOpened = false;
    try {
        fileOpened = prefsFile.open("r");
        if (!fileOpened) { return result; }
        prefsFile.encoding = "UTF-8";

        var names        = {};  // index -> name string
        var defaultIndex = 0;

        while (!prefsFile.eof) {
            var line = prefsFile.readln();

            // Match: "Output Module Spec Strings Name N" = "TemplateName"
            var nameMatch = line.match(/^\s*"Output Module Spec Strings Name (\d+)"\s*=\s*"(.*)"\s*$/);
            if (nameMatch) {
                names[parseInt(nameMatch[1], 10)] = nameMatch[2];
                continue;
            }

            // Match: "Default OM Index" = "N"  (value may or may not be quoted)
            var defMatch = line.match(/^\s*"Default OM Index"\s*=\s*"?(\d+)"?\s*$/);
            if (defMatch) {
                defaultIndex = parseInt(defMatch[1], 10);
            }
        }

        // Build ordered array from parsed index->name map
        var indices = [];
        for (var k in names) {
            if (names.hasOwnProperty(k)) { indices.push(parseInt(k, 10)); }
        }
        indices.sort(function (a, b) { return a - b; });

        // Filter out hidden X-Factor templates (names starting with "(")
        var indexMap = []; // maps array position -> original pref index (for defaultIndex lookup)
        for (var j = 0; j < indices.length; j++) {
            var n = names[indices[j]];
            if (n.charAt(0) !== "(" && n.indexOf("_HIDDEN") !== 0) {
                result.templates.push(n);
                indexMap.push(indices[j]);
            }
        }

        // Map defaultIndex from pref index space to array position
        for (var m = 0; m < indexMap.length; m++) {
            if (indexMap[m] === defaultIndex) {
                result.defaultIndex = m;
                break;
            }
        }

    } catch (e) {
        // silently return whatever was parsed before the error
    } finally {
        if (fileOpened) { try { prefsFile.close(); } catch (e2) {} }
    }

    return result;
}

function getTemplatesFromRenderQueue() {
    var result = { templates: [], defaultIndex: 0 };

    var dummyComp = null;
    for (var i = 1; i <= app.project.numItems; i++) {
        if (app.project.items[i] instanceof CompItem) {
            dummyComp = app.project.items[i];
            break;
        }
    }
    if (!dummyComp) { return result; }

    // Save the active item so we can restore focus after touching the render queue
    var previousItem = app.project.activeItem;

    var dummyItem = null;
    try {
        dummyItem = app.project.renderQueue.items.add(dummyComp);
        var raw = dummyItem.outputModules[1].templates;
        for (var t = 0; t < raw.length; t++) {
            result.templates.push(raw[t]);
            if (raw[t].indexOf("(default)") !== -1 || raw[t] === "Lossless") {
                result.defaultIndex = t;
            }
        }
    } catch (e) {
        // silently return whatever we have
    } finally {
        if (dummyItem) { try { dummyItem.remove(); } catch (e2) {} }
        // Restore focus to the previously active comp
        if (previousItem && previousItem instanceof CompItem) {
            try { previousItem.openInViewer(); } catch (e3) {}
        }
    }

    return result;
}

function showUnnamedMarkerDialog(markerIndex, timecodeStr) {
    var dlg = new Window("dialog", "Unnamed Marker");
    dlg.orientation   = "column";
    dlg.alignChildren = "fill";
    dlg.spacing       = 10;
    dlg.margins       = 14;

    var infoGroup = dlg.add("group");
    infoGroup.orientation   = "column";
    infoGroup.alignChildren = "left";
    infoGroup.add("statictext", undefined,
        "Marker " + markerIndex + " at " + timecodeStr + " has no name.");
    infoGroup.add("statictext", undefined,
        "Enter a name, or skip to auto-number it.");

    var nameField = dlg.add("edittext", undefined, "");
    nameField.preferredSize.width = 260;
    nameField.active = true;

    var btnGroup = dlg.add("group");
    btnGroup.alignment   = "fill";
    btnGroup.orientation = "row";
    btnGroup.spacing     = 6;

    var btnCancel   = btnGroup.add("button", undefined, "Cancel All");
    var spacer      = btnGroup.add("group");
    spacer.alignment = ["fill", "center"];
    var btnConfirm  = btnGroup.add("button", undefined, "Name / Skip", true);

    nameField.addEventListener("keydown", function (e) {
        if (e.keyName === "Enter") { btnConfirm.notify("onClick"); }
    });

    var result = { action: "skip" };

    btnConfirm.onClick = function () {
        var name = nameField.text;
        result = (name !== "")
            ? { action: "ok", name: name }
            : { action: "skip" };
        dlg.close();
    };
    btnCancel.onClick = function () {
        result = { action: "cancel" };
        dlg.close();
    };

    dlg.show();
    return result;
}

function sanitizeFileName(str) {
    // Replace characters illegal in file names on Windows and Mac
    return str.replace(/[\/\\:*?"<>|]/g, "_");
}

function buildOutputFilePath(outputFolder, compName, markerName) {
    return new File(outputFolder.fsName + "/" + sanitizeFileName(compName) + "_" + sanitizeFileName(markerName));
}

// ============================================================
// SECTION 3 — Core Logic
// ============================================================

// Shared render-queue loop used by both queue functions.
// skipCounterObj: { count: Number } — passed as object so mutations persist.
// Returns { skipped: Array, cancelled: Boolean }
function processMarkerProperty(markerProp, comp, skipCounterObj) {
    var skippedDescriptions = [];
    var templateFailed      = false;
    var addedItems          = []; // track items added this run for rollback on cancel

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
            if (dlgResult.action === "cancel") {
                // Remove all items added so far this run and abort
                for (var r = addedItems.length - 1; r >= 0; r--) {
                    try { addedItems[r].remove(); } catch (e) {}
                }
                return { skipped: skippedDescriptions, cancelled: true };
            } else if (dlgResult.action === "ok" && dlgResult.name !== "") {
                markerName = dlgResult.name;
            } else {
                // Treat blank OK the same as Skip — auto-number it
                markerName = "_" + padTwo(skipCounterObj.count);
                skipCounterObj.count++;
            }
        }

        // Add render queue item
        var item              = app.project.renderQueue.items.add(comp);
        item.timeSpanStart    = markerTime;
        item.timeSpanDuration = marker.duration;
        addedItems.push(item);

        // Apply output module template
        var output = item.outputModules[1];
        if (gOutputModuleTemplateName !== "") {
            try {
                output.applyTemplate(gOutputModuleTemplateName);
            } catch (e) {
                templateFailed = true; // flag once — alert after loop
            }
        }

        // Set output file path
        output.file = buildOutputFilePath(gOutputFolder, comp.name, markerName);
    }

    if (templateFailed) {
        alert(
            "Warning: Output Module template \"" + gOutputModuleTemplateName + "\" could not be applied.\n" +
            "Affected items were queued using AE's default output settings.\n\n" +
            "Refresh the template list and re-queue, or set the output module manually in the Render Queue."
        );
    }

    return { skipped: skippedDescriptions, cancelled: false };
}

function queueCompMarkerSpans() {
    app.beginUndoGroup("Queue Comp Marker Spans");
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }

        if (!app.project.file) {
            alert("Please save the project before queuing renders.");
            return;
        }

        if (!gOutputFolder) {
            alert("Please choose an output folder before queuing renders.");
            return;
        }

        var compMarkers = comp.markerProperty;
        if (compMarkers.numKeys === 0) {
            alert("The active composition has no markers.");
            return;
        }

        var skipCounterObj = { count: 0 };
        var result         = processMarkerProperty(compMarkers, comp, skipCounterObj);

        if (!result.cancelled && result.skipped.length) {
            alert("Skipped " + result.skipped.length + " zero-duration marker(s):\n" + result.skipped.join(", "));
        }
    } finally {
        app.endUndoGroup();
    }
}

function queueLayerMarkerSpans() {
    app.beginUndoGroup("Queue Layer Marker Spans");
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }

        if (!app.project.file) {
            alert("Please save the project before queuing renders.");
            return;
        }

        if (!gOutputFolder) {
            alert("Please choose an output folder before queuing renders.");
            return;
        }

        var spanLayer = comp.selectedLayers[0];
        if (!spanLayer) {
            alert("Please select a layer.");
            return;
        }

        var layerMarkers = spanLayer.property("Marker");
        if (!layerMarkers) {
            alert("The selected layer does not support markers.");
            return;
        }
        if (layerMarkers.numKeys === 0) {
            alert("The selected layer has no markers.");
            return;
        }

        var skipCounterObj = { count: 0 };
        var result         = processMarkerProperty(layerMarkers, comp, skipCounterObj);

        if (!result.cancelled && result.skipped.length) {
            alert("Skipped " + result.skipped.length + " zero-duration marker(s):\n" + result.skipped.join(", "));
        }
    } finally {
        app.endUndoGroup();
    }
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
    templateDropdown.preferredSize.width = 115;

    var btnRefresh = createStyledButton(templateRow, "⭮", 26);
    btnRefresh.helpTip = "Refresh the Output Module template list.";

    // Populates the dropdown from prefs (or fallback). Safe to call multiple times.
    function populateTemplateDropdown() {
        var result = getOutputModuleTemplates();
        templateDropdown.removeAll();
        for (var t = 0; t < result.templates.length; t++) {
            templateDropdown.add("item", result.templates[t]);
        }
        if (templateDropdown.items.length > 0) {
            templateDropdown.selection = result.defaultIndex;
            gOutputModuleTemplateName  = templateDropdown.items[result.defaultIndex].text;
        } else {
            gOutputModuleTemplateName = "";
        }
    }

    populateTemplateDropdown();

    templateDropdown.onChange = function () {
        if (this.selection) {
            gOutputModuleTemplateName = this.selection.text;
        }
    };

    btnRefresh.onClick = function () {
        populateTemplateDropdown();
    };

    // --- Output Folder Row ---
    var folderRow = uiPanel.add("group");
    folderRow.orientation   = "row";
    folderRow.alignChildren = "center";
    folderRow.spacing       = 6;

    folderRow.add("statictext", undefined, "Output Folder:");
    var folderField = folderRow.add("edittext", undefined, "-- No Folder --");
    folderField.preferredSize.width = 90;
    folderField.helpTip = "Paste an absolute or relative path, then press Enter.";
    folderField.graphics.foregroundColor =
        folderField.graphics.newPen(folderField.graphics.PenType.SOLID_COLOR, [1, 1, 1, 1], 1);

    // Resolve and validate a typed/pasted path on Enter or focus loss
    function applyFolderPath(rawText) {
        var trimmed = rawText.replace(/^\s+|\s+$/g, "");
        if (trimmed === "" || trimmed === "-- No Folder --") { return; }

        // Resolve relative paths against the project file location, or desktop fallback
        var resolved;
        if (trimmed.charAt(0) === "." || trimmed.indexOf(":") === -1 && trimmed.charAt(0) !== "/") {
            var base = (app.project.file) ? app.project.file.parent.fsName : Folder.desktop.fsName;
            resolved = new Folder(base + "/" + trimmed);
        } else {
            resolved = new Folder(trimmed);
        }

        if (resolved.exists) {
            gOutputFolder    = resolved;
            folderField.text = resolved.name;
        } else {
            alert("Folder not found:\n" + resolved.fsName);
            folderField.text = gOutputFolder ? gOutputFolder.name : "-- No Folder --";
        }
    }

    folderField.addEventListener("keydown", function (e) {
        if (e.keyName === "Enter") { applyFolderPath(this.text); }
    });
    folderField.addEventListener("blur", function () {
        applyFolderPath(this.text);
    });

    var btnBrowse = createStyledButton(folderRow, "Browse...", 60, true);
    btnBrowse.helpTip = "Select an output directory.";

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

    // --- Divider ---
    var divider = uiPanel.add("panel", undefined, undefined);
    divider.alignment = ["fill", "center"];
    divider.preferredSize.height = 1;

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
            "Q Spans Plus\n\n" +
            "Set up:\n" +
            "1. Set an Output Module template.\n" +
            "2. Set an Output Folder.\n" +
            "   - Use Browse to select a folder via the OS dialog.\n" +
            "   - Or paste an absolute or relative path into the field and press Enter.\n" +
            "   - Relative paths are resolved from the project file's location.\n\n" +
            "Queueing:\n" +
            "1. Q Comp Spans:\n" +
            "   - Adds a render queue item for each marker span on the active composition.\n\n" +
            "2. Q Layer Spans:\n" +
            "   - Adds a render queue item for each marker span on the selected layer.\n\n" +
            "Marker spans without a comment will prompt you to name them.\n" +
            "Press Name / Skip with a name entered to use it, or blank to auto-number.\n" +
            "Zero-duration marker spans are skipped."
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

createUIPanel(thisObj);

})(this);
