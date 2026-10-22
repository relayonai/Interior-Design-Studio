# Try the MVP

Once GitHub Pages is enabled, open the URL shown in repository **Settings → Pages** in Chrome or Edge. Do not use ChatGPT's file preview. Publishing the cloud development environment is separate from publishing the website.

## Original-flat example

- Switch Lower/Upper and 3D/Floor plan.
- Drag empty space to orbit and scroll to zoom. Try the zoom and camera-reset buttons.
- Add furniture from every library category. Select and drag a piece; edit width, depth, height, rotation, colour and X/Z position.
- Try Rotate 90°, Copy and Delete. Undo and Redo should restore changes.
- Change wall colour and timber tone.
- Export JSON, make changes, then import that JSON. Reload to check local browser saving.

## A different walkthrough

- Click **New from video**, choose MP4/MOV clips, and preview them.
- Set start/end seconds to skip the entrance or unwanted footage; click **Extract 8 frames** for each clip.
- Select a frame. Use it beside the model or create a new named project with your own area, level count and shape.
- This creates a blank shell, **not automatically detected rooms**. Add rooms on each level and adjust their names, positions, sizes and door sides while consulting the references.
- Change floor width/depth if needed; the displayed total area recalculates. The starting split is equal across levels and is an assumption.
- Add furniture on the new floors, save/export the project, and reload it. Videos and extracted images are session-only; project geometry and furniture persist.
- Open **New from video** again to choose another reference or reattach footage.
- Invalid video formats and out-of-bounds rooms should produce useful errors.

One project is active at a time. Export a backup before replacing it; Undo can also recover the previous project within the same session. Never treat browser-local storage as your only backup. No wall/furniture collision checking is implemented.

## Hosting status

GitHub Pages is enabled for `gh-pages` / (root). Its first site build succeeded, but the deployment runner was still queued at the last check. No owner approval was pending. Track the actual deployment here:

https://github.com/relayonai/Interior-Design-Studio/actions/runs/39823664841

GitHub reports the site URL as https://relayonai.github.io/Interior-Design-Studio/ . It returned 404 while deployment was queued; do not treat it as verified live until the job succeeds and the public browser tests pass. Publishing the cloud environment is a separate action.

For future configuration changes, repository Settings → Pages should use **Deploy from a branch**, branch **gh-pages**, folder **/ (root)**. The static site contains no uploaded videos or keys. The original approximate flat geometry is included.

## Local fallback

Check out `feat/video-assisted-planner` (not `gh-pages`, which is generated output), install Node.js 22.12+, then run `npm ci` and `npm run dev`. Open the printed address on that same computer. If 3D does not start, ensure the browser supports WebGL and graphics acceleration.
