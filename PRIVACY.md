# Privacy

Ink Atlas is local-first. It has no required account, analytics, telemetry, advertising SDK or hosted backend.

## Data kept in the browser

The application stores layouts, generated artwork, uploaded artwork, undo history, named projects, versions and UI settings in browser storage on the device. **Export** creates a JSON file under the user's control. Clearing site data removes the browser-stored copy unless it was exported.

Custom replacement GLB bodies are session-only and are not saved to browser storage.

An optional calibration photo can be selected while the calibration dialog is open. It is decoded only for an in-memory preview, is not persisted in browser storage, and is not included in project exports or artist packets.

Imported project files can restore custom artwork only when the image is embedded in the JSON as an image data URL. Remote image URLs in imported projects are ignored, so opening a project cannot silently contact an image host.

## Optional neural generator

The default procedural generator runs entirely in the browser. If a user explicitly selects **Neural image endpoint**, enters an HTTPS endpoint and presses Generate, Ink Atlas sends the prompt, selected style, palette and a transparency request to that endpoint. Any optional bearer token is kept in memory for the current page session and is not written to browser storage or included in exported layouts.

The operator of a user-selected endpoint may receive the request data and network metadata under that operator's privacy policy. Ink Atlas does not proxy or inspect that service.

## Local server

`start.command` serves the files only on `127.0.0.1`. It does not expose the app to other devices on the local network.
