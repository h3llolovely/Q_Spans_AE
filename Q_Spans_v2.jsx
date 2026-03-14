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
}

// --- Main Functions
function queueCompMarkerSpans() {
    // Selected Composition
    var comp = app.project.activeItem;
    
    // Check if a composition is selected
    if (!comp || !(comp instanceof CompItem)) {
        alert("Please select a composition.");
        return;
    }

    // Composition markers
    var compMarkers = comp.markerProperty;

	// Project file path
    var projPath = app.project.file.path;

    // Check if the composition has markers
    if (compMarkers.numKeys > 0) {
        for (var i = 1; i <= compMarkers.numKeys; i++) {
            // Show markers duration (in seconds)
            // alert(compMarkers.keyValue(i).comment + " has duration of " + compMarkers.keyValue(i).duration);

            // Verify marker has a duration before adding to render queue
            if (compMarkers.keyValue(i).duration > 0) {
                var item = app.project.renderQueue.items.add(comp);
                item.timeSpanStart = compMarkers.keyTime(i);
                item.timeSpanDuration = compMarkers.keyValue(i).duration;

                var output = item.outputModules[1];
                var outputFilePath = projPath + "/_Renders/" + comp.name + "_" + compMarkers.keyValue(i).comment;
                output.file = new File(outputFilePath);
            } else {
              // alert("Marker " + compMarkers.keyValue(i).comment + " is not a span.");
            }
        }
    } else {
      alert("The selected composition has no markers.");
    }
}

function queueLayerMarkerSpans() {
    // Selected Composition
    var comp = app.project.activeItem;
    
    // Check if a composition is selected
    if (!comp || !(comp instanceof CompItem)) {
        alert("Please select a composition.");
        return;
    }

    // Selected Layer
    var spanLayer = comp.selectedLayers[0]; // Assuming you want the first selected layer

    // Check if a layer is selected
    if (!spanLayer) {
        alert("Please select a layer.");
        return;
    }

    // Layer Markers
    var layerMarkers = spanLayer.property("Marker");

    // Project file path
    var projPath = app.project.file.path;

    // Check if the composition has markers
    if (layerMarkers.numKeys > 0) {
        for (var i = 1; i <= layerMarkers.numKeys; i++) {
            // Show markers duration (in seconds)
            // alert(layerMarkers.keyValue(i).comment + " has duration of " + layerMarkers.keyValue(i).duration);

            // Verify marker has a duration before adding to render queue
            if (layerMarkers.keyValue(i).duration > 0) {
                var item = app.project.renderQueue.items.add(comp);
                item.timeSpanStart = layerMarkers.keyTime(i);
                item.timeSpanDuration = layerMarkers.keyValue(i).duration;

                var output = item.outputModules[1];
                var outputFilePath = projPath + "/_Renders/" + comp.name + "_" + layerMarkers.keyValue(i).comment;
                output.file = new File(outputFilePath);
            } else {
              // alert("Marker " + layerMarkers.keyValue(i).comment + " is not a span.");
            }
        }
    } else {
      alert("The selected layer has no markers.");
    }
}

// Run it
createUIPanel(this)