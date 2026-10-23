# Ink Atlas

Ink Atlas is a local-first 3D tattoo placement simulator. It combines a rigged anatomical body, colour artwork, pose-aware surface projection, measurement controls, project history and printable placement stencils in a static web app with no required account or backend.

> Ink Atlas is a planning tool, not a biometric scan or a substitute for an artist's stencil transfer. Confirm final scale, line weight, colour, joint creases and placement with a tattoo artist.

## Run locally

The fastest option is to open `index.html` directly. The realistic body is embedded in `model-data.js`, so the core application also works from a `file://` URL.

For installable offline mode, double-click `start.command` on macOS, or run:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8765/`. A service worker caches the application shell after the first HTTP-served visit.

## What it includes

- Colour-preserving tattoo placement on a high-resolution, rigged body.
- Bilateral shoulder, elbow and knee pose controls with distortion analysis.
- Smooth measurement-driven body shaping and a continuous skin-tone control.
- Surface-focused orbit, zoom, pan and region camera presets.
- Precise coordinates, rotation, snapping, guides, mirroring, layers, groups and masks.
- Fresh, healed, aged and faded ink appearance controls.
- A local procedural tattoo generator and an opt-in custom neural endpoint.
- Named local projects, undo/redo, version snapshots and JSON import/export.
- A4 stencil export with calibrated dimensions and a 10 cm verification bar.
- Responsive desktop and mobile layouts plus installable offline support.

## Privacy

Placement, procedural generation, project history and uploaded artwork stay in browser storage. The application makes no analytics or telemetry requests. A network request occurs only when a user selects the optional neural generator, supplies an HTTPS endpoint and starts generation. The optional bearer token is held in memory for that browser session and is not persisted. See [PRIVACY.md](PRIVACY.md).

## Model and artwork

The bundled model is `assets/male-base-mesh-base_male.glb`: a 163-bone, MakeHuman-derived base mesh published by Innerscene under CC0. `model-data.js` contains the same model data for direct-file use. The starter library contains only generic, project-authored SVG tattoo motifs; no private reference images are bundled.

Full source and license details are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [MODEL_LICENSE.md](MODEL_LICENSE.md).

## Development checks

No package installation is required for the app. The repository check uses Node.js only:

```sh
npm run check
```

The check validates required files, parses JavaScript sources, verifies that the embedded and standalone model payloads agree, and scans release text for common private-path and secret patterns.

## Known limits

Measurement shaping is proportional rather than scan-derived. Pose deformation and curved-surface compensation are approximations of living skin. Distortion analysis is a planning signal, not a biomechanical or medical measurement. Imported GLB support is intentionally conservative and works best with MakeHuman- or MPFB-style rigged bodies.

## License

Application code and project-authored sample motifs are released under the [MIT License](LICENSE). The bundled model remains available under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
