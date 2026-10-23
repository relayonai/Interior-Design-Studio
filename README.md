# Flat / Studio — footage first

A private-by-default walkthrough viewer, photographic design workspace and sparse-reconstruction viewer. The app now opens on **actual footage**, not the old inaccurate floor-plan example.

## Use the website

https://relayonai.github.io/Interior-Design-Studio/

1. **Open your videos**. Local MP4/MOV clips are displayed at their original proportions; no footage is uploaded to the site.
2. Set start/end ranges to exclude entrance footage. Preview playback and build a contact sheet or capture full-resolution individual frames.
3. Add **room checkpoints** at real video timestamps. Names and levels are your observations, not inferred room coordinates.
4. In **Still / design**, mark a visible surface using a polygon and try a colour directly on the photograph. Compare with the original and export the image. This is manual 2D compositing, not AI furniture replacement or a reconstructed wall.
5. **Save on this device** stores clips, frames, masks, checkpoints and an imported scan in browser IndexedDB. A reload restores them. Browser quotas/restrictions can prevent storage; error messages distinguish this from current-session viewing. This is private local storage, not a cloud backup.
6. **Open private 3D scan** reads a photogrammetry `scan.json` from your computer. Inspect coloured sparse points, recovered camera views and separate components. No model file leaves your device.

No accounts, external fonts, tracking or remote AI keys are needed. Browser-supported codecs and device memory still limit video handling. Mobile file preview apps may block JavaScript/WebGL; use the actual HTTPS website in a modern browser. Clear saved footage removes only this app's browser media, not original source files or local processor output.

## Actual video-to-3D processing

An optional local CPU processor now connects video → feature matching → camera recovery → sparse point cloud → viewer. It keeps processing on the same computer. Follow [the reconstruction setup](scripts/reconstruction/README.md). The public static website cannot execute pycolmap jobs: simply choosing a video there does not automatically create a scan.

Actual supplied-footage tests recovered 70 cameras and 21,543 points in the largest of 8 disconnected components from a denser living/kitchen sequence. This is **partial sparse reconstruction, not a whole-flat photorealistic mesh**. Disconnected sections are not aligned or assigned invented room locations. Scan units are arbitrary.

Dense reconstruction, Gaussian splatting, semantic room layout extraction, automatic furniture removal and accurate whole-flat geometry are not implemented. The next reconstruction stage requires suitable processing capacity plus validation against measured geometry. Total internal area alone does not recover a room arrangement.

## Planning workspace

The previous furniture planner remains available behind **Planning workspace — Unverified** to preserve saved work. Its original flat example has known inaccurate room placements. It is explicitly marked as rejected/unverified and is **not your flat's floor plan**. The 72 / 45 m² floor split was an assumption, not a result of reconstruction. Do not use it for room placement or furniture-fit decisions.

Generic planning projects still allow manually entered rectangular floors/rooms, furniture editing and JSON export/import. This manual geometry is separate from the footage and sparse scan. Furniture collisions are not enforced. No new accurate floor plan is claimed.

## Develop / test

Node.js 22.12+ (validated with Node 24):

```sh
npm ci
npm run dev
```

Use the printed local address on the same computer. `npm run build` creates `dist`. `npm run preview` serves it. Source is on branch `feat/video-assisted-planner`; `gh-pages` contains generated deployment output.

- `npm test`: layout/project and scan validation tests.
- `npm run build && npm run test:e2e`: browser checks, including private media persistence, actual frame decoding, surface masks/export, checkpoints, scan components, planning regression, mobile layout and production subpaths. Requires ffmpeg and Chromium (`PLAYWRIGHT_CHROMIUM_EXECUTABLE` overrides `/usr/bin/chromium`).
- `python3 -m unittest discover -s tests -p 'test_private_server.py'`: local processor request-boundary, private-file and job-validation tests.
- `npm run package:offline`: self-contained HTML fallback. Direct local-file opening remains unverified because the cloud browser blocks file navigation; HTTP hosting is preferred.
- `FLAT_STUDIO_TEST_URL` sets a hosted base URL (trailing slash) for browser tests. The cloud browser's HTTPS trust differs from curl; never disable certificate checks to make live tests pass.

## Deploy

`npm run deploy:pages` builds and pushes only static files to `gh-pages` without force-pushing source. GitHub Pages is enabled on `gh-pages` / (root). Verify its deployment and actual HTTPS assets before claiming an update is live. Real source videos, photos, scans, local job outputs and private browser data must never be committed or bundled. Generated scan files are ignored as an additional safeguard.
