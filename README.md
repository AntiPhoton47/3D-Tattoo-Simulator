# Ink Atlas

Ink Atlas is a local-first 3D tattoo placement simulator. It combines a rigged anatomical body, colour artwork, pose-aware surface projection, measurement controls, project history and printable placement stencils in a static web app with no required account or backend.

> Ink Atlas is a planning tool, not a biometric scan or a substitute for an artist's stencil transfer. Confirm final scale, line weight, colour, joint creases and placement with a tattoo artist.

## Run locally

The fastest option is to open `index.html` directly. Both realistic body choices are embedded in local JavaScript payloads, so the core application also works from a `file://` URL.

For installable offline mode, double-click `start.command` on macOS, or run:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8765/`. A service worker caches the application shell after the first HTTP-served visit.

## What it includes

- Masculine and feminine high-resolution, rigged body bases with an optional non-explicit unclothed planning surface.
- Adjustable feminine breast volume with smooth, bounded geometry transitions.
- Fitted CC0 mesh tops plus procedural sportswear, streetwear, dress, footwear, socks, gloves, hats and eyewear layers with optional hidden-tattoo preview.
- Procedural hairstyles for either model and a combination of CC0 mesh and procedural facial-hair styles for the masculine model.
- Colour-preserving tattoo placement with seam-aware projected decal meshes.
- Bilateral shoulder abduction, forward/back movement, upper-arm rotation, elbow and knee controls with distortion analysis.
- Pose-space shoulder volume correction and dual-quaternion joint deformation.
- Smooth bounded measurement-driven body shaping and a continuous skin-tone control.
- Surface-focused orbit, zoom, pan and region camera presets.
- Precise coordinates, rotation, snapping, guides, mirroring, layers, groups and masks.
- Fresh, healed, aged and faded ink appearance plus adjustable ink density.
- A local procedural tattoo generator and an opt-in custom neural endpoint.
- Named local projects, undo/redo, version snapshots and JSON import/export.
- A4 stencil export and a printable artist handoff packet with calibrated dimensions.
- Optional photo-assisted calibration that keeps the reference image in memory only.
- Adaptive desktop/mobile rendering, installable offline support and visual-regression tests.

## Privacy

Placement, procedural generation, project history and uploaded artwork stay in browser storage. Optional calibration photos are previewed in memory and are never saved. The application makes no analytics or telemetry requests. A network request occurs only when a user selects the optional neural generator, supplies an HTTPS endpoint and starts generation. The optional bearer token is held in memory for that browser session and is not persisted. See [PRIVACY.md](PRIVACY.md).

## Model and artwork

The bundled bodies are `assets/male-base-mesh-base_male.glb` and `assets/female-base-mesh-base_female.glb`: 163-bone, MakeHuman-derived base meshes published by Innerscene under CC0. `model-data.js` and `female-model-data.js` contain matching payloads for direct-file use. A deliberately small, texture-free subset of official MakeHuman CC0 clothing, hat and facial-hair meshes is stored in `appearance-assets.js`; the remaining wardrobe, accessory and hairstyle choices are generated locally at runtime to keep mobile downloads light. The starter library contains only generic, project-authored SVG tattoo motifs.

Full source and license details are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [MODEL_LICENSE.md](MODEL_LICENSE.md).

## Development checks

No package installation is required to run the app. Release and browser checks use Node.js and Playwright:

```sh
npm ci
npm run check
npm run test:visual
```

The release check validates required files, parses JavaScript sources, verifies that both embedded and standalone model payloads agree, and scans release text for common private-path and secret patterns. The visual suite checks desktop, feminine styling, multi-axis posing and mobile layouts against committed baselines.

## Known limits

Measurement shaping is proportional rather than scan-derived. Pose deformation and curved-surface compensation are approximations of living skin. Distortion analysis is a planning signal, not a biomechanical or medical measurement. Imported GLB support is intentionally conservative and works best with MakeHuman- or MPFB-style rigged bodies.

## License

Application code and project-authored sample motifs are released under the [MIT License](LICENSE). The bundled model remains available under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
