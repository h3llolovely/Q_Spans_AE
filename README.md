# Q Spans

![QSP_00](https://github.com/user-attachments/assets/cf6e41de-6d01-4b40-a0ce-14fabb1e4555)

Sends either Composition marker spans or a selected layer's marker spans to the Render Queue and appends the marker comment to the filename.
Useful for queueing multiple parts of a single comp, without having to rename each output.

Simplified AE scriplet versions [available here](https://github.com/h3llolovely/AE_Scriptlets/tree/main/Render). For use with kBar, MoBar, AEBar, etc...

---------------

**AE scriptUI panel**
- Dec 2023 Original script by Matt Volp @TackStudio www.tackstudio.co
- Dec 2023 Jason Schwarz www.hellolovely.tv

**Q_Spans.jsx**  
1.0 - Initial release - Dec 2023  
1.1 - Verify marker spans and ignore non-span markers, better error handling - FEB 2024  
2.0 - minor changes - SEPT 2024  
3.0 - Added undo groups, improved error handling, added skipped non-span marker report upon completion. - MAR 2026  

**Q_Spans_Plus.jsx**  
1.0.0 - Major rewrite. - Mar 2026

New Features:
----------
- Output Module dropdown populated from AE's prefs file. (with render queue item fallback)
- Refresh button for the dropdown.
- Browse button with OS-native folder picker defaulting to project location.
- Paste/type a path (absolute/relative) directly into the Output Folder field.
- Styled rounded-corner buttons with hover/press states and custom colors.
- Unnamed marker dialog with OK/Skip and Cancel All. (with queued item's rollback)
- Help button with full usage description.

Screenshots:
---------------
The palette:
![QSP_00](https://github.com/user-attachments/assets/e12d9778-aded-4c00-83e6-06ce96134c89)  

Output Module tootip:
![QSP_01_OutputMod_TT2](https://github.com/user-attachments/assets/b4006aa4-17c8-4a4f-aee6-a68a5fcde675)  

Output Module tootip:
![QSP_02_OutputMod_TT1](https://github.com/user-attachments/assets/66986a5b-7596-4676-9d23-85b2dae92076)  

Output Folder tootip:
![QSP_03_OutputFolder_TT1](https://github.com/user-attachments/assets/e7eae197-137d-4925-a064-29c10253d4ed)  

Output Folder tootip:
![QSP_04_OutputFolder_TT2](https://github.com/user-attachments/assets/a1a68163-d369-462a-9236-39ed25d17269)  

Unnamed marker dialogue:
![QSP_05_Unnamed](https://github.com/user-attachments/assets/6f9733e2-1b4d-4688-9cf3-5480c9e566e6)  

Skipped marker report:
![QSP_06_CompSkipped](https://github.com/user-attachments/assets/8ddce357-2ee8-47cf-ab4f-ce3456425047)  

Comp spans queued:
![QSP_07_CompQueue](https://github.com/user-attachments/assets/139c7ea3-908e-41ce-93d4-5a3216dc1821)  

Layer spans queued:
![QSP_08_LayerQueue](https://github.com/user-attachments/assets/530e0185-e9af-4080-8f35-3606552f85d1)  

Help:
![QSP_09_Help](https://github.com/user-attachments/assets/5299b021-9edc-40d4-8edd-71daac38c032)  

Known Issues:
---------------
- Project file must be saved first.
- Native OS Output Folder picker defaults to projectfile's location, but Windows dialogue ignores this and starts at the Desktop. Not tested on Mac OS.
- Output Modules may fail to load from ```%AppData%\Roaming\Adobe\After Effects\<version>\Adobe After Effects <version> Prefs-indep-output.txt``` 
