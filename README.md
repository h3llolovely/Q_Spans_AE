# Q_Spans
Sends a Composition's marker spans or a Selected layer's marker spans to the Render Queue and appends the marker span's comment text to the output filename.
Useful for queueing multiple parts of a single comp, without having to rename each output.

Known Issue:
A non-span marker (A single marker w/ no duration) will break the script.
