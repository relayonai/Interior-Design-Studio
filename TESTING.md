# Test the footage-first app

Open https://relayonai.github.io/Interior-Design-Studio/ in Chrome or Edge. The initial view should say **Your flat. As it really is.**, with an empty private video player, not an invented flat model.

## Real footage

- Open the local clips in walkthrough order. Nothing is uploaded.
- Choose a clip; rename it if useful. Set start/end seconds to skip entry sections, then Play selected range.
- Pause at a doorway, name the observation and add a room checkpoint. Selecting the checkpoint returns to that actual video time. Checkpoints are not room coordinates or proof of adjacency.
- Capture this frame, or Build contact sheet to decode 12 frames from the trimmed clip. Choose a frame in the strip to inspect it.

## Actual-photo colour study

- In Still / design, click Mark a surface, then click at least 3 points around a visible wall/surface and Apply outline.
- Change colour and strength. Show original toggles the overlay off; Show changes restores it.
- Export this image saves the currently displayed photographic study. This is a manually masked 2D colour study, not a 3D renovation.
- Save on this device, reload, and confirm videos, checkpoints, photographs and masks restore. Clear saved footage removes the browser's saved session, not the original files; the current in-memory session remains until removed/closed.

## Genuine sparse 3D

- Open private 3D scan with a `scan.json` produced by the reconstruction script. Imported scan content remains private.
- Orbit the points. Select registered camera thumbnails to see the actual photograph from that camera and toggle back to the sparse scene.
- Change component: separate components must remain independent. No whole-flat arrangement or metric scale is inferred.
- To generate scans directly from the app on your own computer, follow scripts/reconstruction/README.md and use the local processor. The Reconstruct on this computer button appears only when served by that loopback service.

## Existing planner

Planning workspace is an explicitly unverified sketch. The original floor layout is not accurate and is no longer the default representation of your flat. Furniture and manual-plan editing remain available so existing saved work is preserved.

## Limits

This update visualizes actual source material and adds partial sparse reconstruction. It does not yet provide a complete photorealistic, measured, furniture-editable 3D flat. The public static site cannot run the Python reconstruction job. Real room placements still need reconstruction continuity and/or verified measurements; 117 m² alone is insufficient.
