# Cursor display demo

## Scope

The page contains one real Writemark editor.
The editor uses the local distribution bundle.
The page uses the public cursor display API.
The page submits changed samples through the merge API.
The page does not share text or connect participants.

Two initial markers use valid Markdown source offsets.
The page calls them cursor samples.
The page does not invent people, network activity, or cursor movement.
The samples disable expiry because the user controls their lifetime.

## Controls

The user can select, name, color, add, remove, and place a cursor sample.
The place control uses the last actual editor selection.
The tracking control moves only the selected sample when the actual editor selection changes.
The other samples keep their positions during that movement.
Canonical text edits use the editor's normal cursor mapping.

The names control keeps labels visible when space permits.
The sample list always shows each full name.
The older update control submits a real stale sequence and reports the API result.
The source position controls expose anchor and head offsets in a closed details section.
The Live and Source controls change the actual editor mode.
Cursor controls do not change document text, revision, or undo history.

## Appearance

The page uses warm paper colors, dark text, and a restrained green accent.
The document has the main space.
The compact side panel contains the cursor controls.
A narrow viewport places the side panel below the document.
Native controls have labels and visible focus outlines.
The page respects the reduced motion preference.
The page does not load external fonts, assets, or scripts.

## Build and checks

Run `npm run build:cursors` to build the local demo asset.
Run `npm run check:cursors` to check the demo source and generated asset.
The build checks strict TypeScript before it writes the asset.
The demo tests use `tests/cursor-demo.spec.js`.
