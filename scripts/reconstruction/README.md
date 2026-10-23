# Private reconstruction processor

This is actual CPU structure-from-motion using COLMAP via pycolmap: feature extraction, geometrically verified frame matching, camera-pose recovery, triangulation and bundle adjustment. It exports coloured sparse points and registered camera photographs. It does **not** produce a finished textured mesh, Gaussian splat, floor plan, room segmentation, metric scale or furniture-removal model.

Tested on Linux x86-64, Python 3.12, 3 CPU threads, without a GPU. Other platforms have not been validated. Install ffmpeg and Node.js 22.12+ too. Depending on available pycolmap wheels, other Python/platform combinations may require a native build.

## Integrated local app

From the repository source checkout:

```sh
npm ci
npm run build
python3 -m venv .venv-sfm
.venv-sfm/bin/pip install -r scripts/reconstruction/requirements.txt
.venv-sfm/bin/python scripts/reconstruction/serve.py
```

Open the local address printed by that command on the **same computer**. Import videos, trim the selected ranges, and use **Reconstruct on this computer**. The processor copies clips into its private local data directory, runs a CPU job, then the app opens the resulting scan automatically. Start with a single room and a short, slow walkthrough. Maximum 5 clips / 5 minutes selected footage per job and 1 GB per clip. Several minutes of processing is normal; no exact runtime is guaranteed.

The server binds only to `127.0.0.1`, checks Host/Origin, and does not grant cross-origin access. It is not a production public upload server. Do not expose it through a public tunnel. Source clips, frames and scans are not sent to GitHub Pages or external AI services. Job files remain in the processing directory printed at startup (`--data-dir` overrides it), even after cancellation. Remove that directory yourself when no longer needed. Browser **Clear saved footage** clears IndexedDB only, not processor job files. Server job status is in-memory, so interrupted jobs cannot be resumed through the UI after a restart; finished scan files remain available on disk for manual import.

## Command-line batch processing

Create a manifest **outside the checkout**, using your own paths and trim ranges:

```json
[{"path":"/your/private/walkthrough.mov","start":12,"end":90}]
```

Then run:

```sh
.venv-sfm/bin/python scripts/reconstruction/reconstruct.py --manifest /private/input.json --output /private/output --fps 3 --features 6144 --overlap 12 --init-angle 8
```

Import the resulting `scan.json` through **Open private 3D scan** on either the public or local app. This is a local file read, not an upload. Camera images embedded in the JSON are private too. Do not commit or publish it.

Each connected reconstruction is shown separately. Disconnected components cannot establish relative room locations, so they are never silently joined into a fabricated layout. Scale is arbitrary; 117 m² of total area cannot set metric scale on a partial scan. The viewer approximately aligns its display to average recovered camera-up, which is not a measured gravity reference.

The output directory caches frames and features. It records extraction settings; use a new output directory if the manifest, frame rate or feature count changes. `--exhaustive` is an optional, more expensive matching strategy. The default sequential matcher cannot close arbitrary loops across disconnected clips. The pipeline assumes a single camera/intrinsics across clips; mixed devices/lenses need separate runs or a future per-camera configuration.

## Evidence from supplied footage

At 1 frame/s across 291 selected frames from four clips, reconstruction fragmented into small components. At 3 frames/s on the 101-second living/kitchen clip (303 source frames), the largest component recovered 70 cameras and 21,543 points with mean reprojection error about 0.70 pixels. There were 8 separate components. These results demonstrate partial reconstruction, **not an accurate whole-flat model**. Derived data remains outside the repository.

For the next photorealistic stage, dense multi-view stereo or Gaussian-splat training needs a supported processing backend and suitable compute. Reliable whole-flat layout also needs coverage through transitions, consistent lens settings, and preferably measured dimensions/scan data. No dense reconstruction or cloud inference service is configured in this version.
