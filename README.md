# Q_Spans

![AfterFX_JM1CcuLONZ](https://github.com/h3llolovely/Q_Spans/assets/101287022/8865453c-d654-43bd-85f6-03c5879fea09)
AE scriptUI panel

Sends a Composition's marker spans or a Selected layer's marker spans to the Render Queue and appends the marker span's comment text to the output filename.
Useful for queueing multiple parts of a single comp, without having to rename each output.

Known Issues:
- A non-span marker (A single marker w/ no duration) will break the script.
- Project file must be saved first.
  - Render path is set to a "_Renders" directory relative to the Projectfile location (i.e. ./_Renders/)
![explorer_zVg8a2zFVc](https://github.com/h3llolovely/Q_Spans/assets/101287022/8f49b2b2-c3f6-49f3-ace6-c36ef3a46882)
