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

## Hosting activation

The build is already on `gh-pages`. A repository owner must enable Pages because the GitHub integration rejected that API operation:

1. Open https://github.com/relayonai/Interior-Design-Studio/settings/pages
2. Under Build and deployment, choose **Deploy from a branch**.
3. Choose **gh-pages** and **/ (root)**, then **Save**.
4. Wait for the Pages build/deployment to complete and use the website URL GitHub displays.

The expected URL is https://relayonai.github.io/Interior-Design-Studio/ but it must be checked after activation before being described as live. The static site contains no uploaded videos or keys. The original approximate flat geometry is included.

## Local fallback

Check out `feat/video-assisted-planner` (not `gh-pages`, which is generated output), install Node.js 22.12+, then run `npm ci` and `npm run dev`. Open the printed address on that same computer. If 3D does not start, ensure the browser supports WebGL and graphics acceleration.
