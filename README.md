# Flat / Studio

A browser-based, video-assisted interior planner. Import walkthroughs from your device, extract reference frames, create editable floor/room geometry, and try furniture layouts. Includes an initial approximate model manually interpreted from the supplied flat videos.

**This version does not automatically reconstruct 3D geometry from video.** Video processing extracts reference images; the user supplies floor and room geometry. Automatic room/wall detection, camera-pose reconstruction and dimension estimation require a separate reconstruction pipeline. Total floor area alone does not determine room geometry.

## Run locally

Requires Node.js 22.12+ (validated with Node 24) and a modern browser with WebGL enabled.

```sh
npm ci
npm run dev
```

Open the address printed by Vite in a browser on the **same computer**. Vite uses port 5173. There is no backend, login, API key or server-side video upload. `npm run build` creates a static site in `dist`; `npm run preview` serves it. Imported footage stays in the browser, and public deployment does not publish source videos.

## Workflow for other videos

1. Click **New from video**; choose up to five MP4/MOV clips. Browser-local loading avoids the chat's 32 MB transfer limit. Codec support and available memory still limit which files work.
2. Preview each clip and choose a start/end time to exclude entrances or unwanted sections.
3. Extract eight evenly spaced frames from the selected range. Choose a frame and display it beside the model. Extraction can be cancelled; invalid or unsupported clips show an error.
4. Enter a project name, total internal floor area excluding balcony, level count (1–3), and starting aspect ratio. Create a blank editable rectangular shell. The initial area split is equal across floors and is explicitly an assumption.
5. Add rooms on each floor; edit their names, dimensions, positions and door openings. Change floor width/depth to correct the shell; total area is recalculated. Rooms must fit within the footprint but can overlap each other.
6. Add, drag, resize, rotate, recolour, duplicate and delete furniture. Switch floors and 3D/plan views. Change wall and timber finishes; undo/redo edits.
7. Export JSON as a backup. The active project saves locally in this browser; importing JSON restores geometry, source metadata and furniture. Videos and image frames are session-only and must be reattached after a reload. One project is active at a time; export before replacing it. Creating a new project can be undone.

No collision checking between furniture, walls, stairs or other pieces is implemented. Room edges are schematic, with one selectable door opening per rectangular room. Generic projects do not infer windows, stairs, balconies or irregular/void geometry; the supplied reference-flat example includes these as manually interpreted fixtures. Geometry needs on-site measurement before buying furniture.

## Supplied flat assumptions

The user confirmed **117 m² internal area excluding the balcony**. The reference flat assumes a 9 × 8 m lower floor (72 m²) and 9 × 5 m upper floor (45 m²), leaving a double-height void over the remaining lower footprint. This split is not measured. Room adjacency, stairs, windows, bathrooms, balcony and furniture are approximations. Walls are cut low for furnishing; wall thickness is visual, not a certified area calculation. Floors display separately at ground height. The reference flat's architecture is fixed; new video-assisted projects have editable rectangular rooms.

## Test

- `npm test`: saved-layout validation, project geometry and furniture boundaries.
- `npm run test:e2e`: browser interaction tests, including a generated H.264 video, trimming/frame extraction, project creation, room editing, furniture, persistence and bad-file handling. Requires `ffmpeg` and Chromium. The cloud defaults to `/usr/bin/chromium`; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for another executable path.
- `npm run package:offline`: builds a standalone `dist/offline/Flat-Studio.html` fallback. The cloud browser blocks direct `file:` navigation, so local-file opening is not verified here. Prefer HTTP hosting.

## Hosting: GitHub Pages

The production app is static; GitHub Pages is the selected hosting route. Vite uses relative asset URLs so the same build works under a repository subpath.

`npm run deploy:pages` builds and publishes **only** the production files to the `gh-pages` branch using existing Git authentication. It does not overwrite the source branch or force-push. It must be run from a Git checkout with push permission. The branch contains the app and the approximate initial flat model, but no videos, keys or browser-saved layouts.

In repository **Settings → Pages**, select **Deploy from a branch**, branch **gh-pages**, folder **/ (root)**, then save. If available, the GitHub API can configure this setting. Branch publication and website activation are distinct: verify the Pages build/deployment and public URL before claiming the site is live. Private repository Pages availability depends on the GitHub plan and organization policy. Pages is typically public even if source is private; use access-controlled hosting if that is unsuitable.

For development, use the source branch containing this code; `gh-pages` is generated output. To host elsewhere, deploy `dist` to any static host.

## Next reconstruction stage

The reusable project schema separates geometry from video references and rendering. A future reconstruction service should produce the same validated floors/rooms, retain camera poses and uncertainty, and offer correction before furnishing. It needs multi-view reconstruction and/or a vision model, processing capacity, and representative validation videos. No AI reconstruction endpoint or credentials are currently configured. The present frame-sampling workflow is not a substitute for that stage.

See [TESTING.md](TESTING.md) for an end-user feature checklist and the exact one-time Pages activation steps.
