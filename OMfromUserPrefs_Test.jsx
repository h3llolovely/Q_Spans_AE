// Parse output module template names and default index from AE's prefs file.
// Returns { templates: Array, defaultIndex: Number }
// Falls back to dummy render queue item if the prefs file cannot be read.

(function () {
    var win = new Window("dialog", "OM Template Test");
    win.orientation = "row";
    win.add("button", undefined, "Test").onClick = function () { getOutputModuleTemplates(); };
    win.add("button", undefined, "Cancel").onClick = function () { win.close(); };
    win.show();
})();

function getOutputModuleTemplates() {

    // --- Primary: parse from prefs file ---
    var result = getTemplatesFromPrefs();
    if (result.templates.length > 0) {
        alert("SUCCESS: getTemplatesFromPrefs() returned " + result.templates.length + " template(s).\n\nTemplates:\n  " + result.templates.join("\n  ") + "\n\nDefault index: " + result.defaultIndex + " (\"" + result.templates[result.defaultIndex] + "\")");
        return result;
    }

    // --- Fallback: dummy render queue item ---
    alert("FALLBACK: getTemplatesFromPrefs() returned 0 templates.\nFalling back to render queue method.");
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
    if (!versionFolder) {
        alert("FAIL: getAEPrefsFolder() returned null.\nCould not locate the AE prefs folder.");
        return result;
    }
    alert("OK: Found AE prefs folder:\n" + versionFolder.fsName);

    var verName  = versionFolder.name; // e.g. "26.0"
    var prefsFile = new File(
        versionFolder.fsName + "/Adobe After Effects " + verName + " Prefs-indep-output.txt"
    );
    alert("Checking for prefs file:\n" + prefsFile.fsName + "\n\nExists: " + prefsFile.exists);
    if (!prefsFile.exists) { return result; }

    var fileOpened = false;
    try {
        fileOpened = prefsFile.open("r");
        if (!fileOpened) {
            alert("FAIL: Could not open prefs file for reading.");
            return result;
        }
        alert("OK: Prefs file opened successfully.");
        prefsFile.encoding = "UTF-8";

        var names        = {};  // index -> name string
        var defaultIndex = 0;
        var debugLines   = [];

        while (!prefsFile.eof) {
            var line = prefsFile.readln();
            if (line.indexOf("Output Module") !== -1 || line.indexOf("Default OM") !== -1) {
                debugLines.push(line);
            }

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

        alert("RAW LINES (containing 'Output Module' or 'Default OM'):\n\n" + (debugLines.length > 0 ? debugLines.join("\n") : "(none found)"));
        alert("PARSED: " + result.templates.length + " visible template(s) found.\n\nTemplates:\n  " + (result.templates.length > 0 ? result.templates.join("\n  ") : "(none)") + "\n\nDefault index: " + result.defaultIndex);

    } catch (e) {
        alert("ERROR in getTemplatesFromPrefs():\n" + e.toString());
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