# Security policy

## Reporting a vulnerability

Please use the repository's private **Security advisories** feature to report a vulnerability. Avoid posting secrets, tokens or sensitive artwork in a public issue.

## Security model

Ink Atlas is a static, local-first web application. It does not require a server-side component or an API key. User artwork and project data are handled in the browser.

The optional neural generator can send a request only after a user selects that mode, supplies an HTTPS endpoint and starts generation. Treat custom endpoints as third-party services. Use scoped, short-lived tokens where possible and never reuse a high-value credential.

Imported JSON, SVG, raster images and GLB files should still be treated as untrusted input. The app constrains supported formats and sizes, but browsers and decoders can have their own vulnerabilities; keep the browser current.
