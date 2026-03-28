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

queueLayerMarkerSpans();