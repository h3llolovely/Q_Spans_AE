// Create UI

function createUIPanel(thisObj) {
    // Create a new window
    var uiPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Q-Spans", [100, 100, 150, 200], { resizeable: true });
    if (uiPanel !== null) {
        // Add buttons to the UI
        var btnQueueComp = uiPanel.add("button", undefined, "Q Comp Spans");
        var btnQueueLayer = uiPanel.add("button", undefined, "Q Layer Spans");

        // Set button callbacks
        btnQueueComp.onClick = queueCompMarkerSpans;
        btnQueueLayer.onClick = queueLayerMarkerSpans;

        // Set layout and properties
        uiPanel.orientation = "column";
        uiPanel.alignChildren = "center";

        // Resize the panel when the window is resized
        uiPanel.layout.layout(true);
        uiPanel.layout.resize();
        uiPanel.onResizing = uiPanel.onResize = function() {
            this.layout.resize();
            };
    }
    return uiPanel;
};

// --- Main Functions
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

    var compMarkers = comp.markerProperty;
    if (compMarkers.numKeys === 0) {
        return exit("The selected composition has no markers.");
    }

    var projPath = app.project.file.path;
    var skipped  = [];

    for (var i = 1; i <= compMarkers.numKeys; i++) {
        var marker     = compMarkers.keyValue(i);
        var markerTime = compMarkers.keyTime(i);
        var markerName = compMarkers.keyValue(i).comment;

        if (marker.duration <= 0) {
            skipped.push(markerName);
            continue;
        }

        var item = app.project.renderQueue.items.add(comp);
        item.timeSpanStart    = markerTime;
        item.timeSpanDuration = marker.duration;

        var output = item.outputModules[1];
        output.file = new File(projPath + "/_Renders/" + comp.name + "_" + markerName);
    }

    if (skipped.length) {
        alert("Skipped non-span markers: " + skipped.join(", "));
    }

    app.endUndoGroup();

};

function queueLayerMarkerSpans() {

    app.beginUndoGroup("'Queue Layer Marker Spans'");

    function exit(msg) {
        if (msg) alert(msg);
        app.endUndoGroup();
    }
    
    var comp = app.project.activeItem;
    
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        return exit("Please select a composition.");
    }

    var spanLayer = comp.selectedLayers[0];
    if (!spanLayer) {
        return exit("Please select a layer.");
    }

    var layerMarkers = spanLayer.property("Marker");

    if (layerMarkers.numKeys === 0) {
        return exit("The selected layer has no markers.");
    }

    var projPath = app.project.file.path;
    var skipped  = [];

    for (var i = 1; i <= layerMarkers.numKeys; i++) {
        var marker     = layerMarkers.keyValue(i);
        var markerTime = layerMarkers.keyTime(i);
        var markerName = layerMarkers.keyValue(i).comment;

        if (marker.duration <= 0) {
            skipped.push(markerName);
            continue;
        }

        var item = app.project.renderQueue.items.add(comp);
        item.timeSpanStart    = markerTime;
        item.timeSpanDuration = marker.duration;

        var output = item.outputModules[1];
        output.file = new File(projPath + "/_Renders/" + comp.name + "_" + markerName);
    }

    if (skipped.length) {
        alert("Skipped non-span markers: " + skipped.join(", "));
    }

    app.endUndoGroup();
    
};

// Run it
createUIPanel(this);