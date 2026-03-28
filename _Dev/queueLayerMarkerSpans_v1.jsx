function queueLayerMarkerSpans() {
    // Selected Composition
    var comp = app.project.activeItem;
    // Selected Layer
	var spanLayer = comp.selectedLayers;
    // Project file path
    var projPath = app.project.file.path.fsname;

	alert(projPath);

	if (spanLayer instanceof CompItem) {
		var layerMarkers = spanLayer.marker;
		var item, output;
		for (var i = 1; i <= layerMarkers.numKeys; i++) {
			item = app.project.renderQueue.items.add(comp);
			item.timeSpanStart = layerMarkers.keyTime(i);
			item.timeSpanDuration = layerMarkers.keyValue(i).duration;
			output = item.outputModules[1];
			output.file = File(projPath + "./_Renders/" + comp.name + "_" + layerMarkers.keyValue(i).comment);
		}
	}
}

queueLayerMarkerSpans();