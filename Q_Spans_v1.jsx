// Create and show the UI
var scriptUIPanel = createUIPanel();
scriptUIPanel.show();

function createUIPanel() {
    // Create a new window
    var uiPanel = new Window("palette", "Q Spans", undefined, { resizeable: true });

    // Add buttons to the UI
    var btnQueueComp = uiPanel.add("button", undefined, "Q Comp Spans");
    var btnQueueLayer = uiPanel.add("button", undefined, "Q Layer Spans");

    // Set button callbacks
    btnQueueComp.onClick = queueCompMarkerSpans;
    btnQueueLayer.onClick = queueLayerMarkerSpans;

    // Set layout and properties
    uiPanel.orientation = "rows";
    uiPanel.alignChildren = "center";

    // Resize the panel when the window is resized
    uiPanel.layout.layout(true);
    uiPanel.layout.resize();

    return uiPanel;
}

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
            var item = app.project.renderQueue.items.add(comp);
            item.timeSpanStart = compMarkers.keyTime(i);
            item.timeSpanDuration = compMarkers.keyValue(i).duration;

            var output = item.outputModules[1];
            var outputFilePath = projPath + "/_Renders/" + comp.name + "_" + compMarkers.keyValue(i).comment;
            output.file = new File(outputFilePath);
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

    // Project file path
    var projPath = app.project.file.path;

    var layerMarkers = spanLayer.property("Marker");

    if (layerMarkers.numKeys > 0) {
        for (var i = 1; i <= layerMarkers.numKeys; i++) {
            var item = app.project.renderQueue.items.add(comp);
            item.timeSpanStart = layerMarkers.keyTime(i);
            item.timeSpanDuration = layerMarkers.keyValue(i).duration;

            var output = item.outputModules[1];
            var outputFilePath = projPath + "/_Renders/" + comp.name + "_" + layerMarkers.keyValue(i).comment;
            output.file = new File(outputFilePath);
        }
    } else {
        alert("The selected layer has no markers.");
    }
}