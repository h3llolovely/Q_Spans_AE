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

queueCompMarkerSpans();
