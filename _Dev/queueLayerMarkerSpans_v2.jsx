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

queueLayerMarkerSpans();