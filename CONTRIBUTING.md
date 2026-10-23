# Contributing

Contributions that improve placement accuracy, accessibility, mobile behavior, performance or documentation are welcome.

1. Create a focused branch from `main`.
2. Run `npm run check`.
3. Exercise the changed interaction on desktop and a narrow mobile viewport.
4. Describe the user-visible change, test coverage and any projection or pose limitations in the pull request.

Do not commit private reference artwork, biometric data, API keys, bearer tokens, local filesystem paths or generated browser profiles. Only add assets whose redistribution terms are documented in `THIRD_PARTY_NOTICES.md`.

Changes to model deformation or tattoo projection should preserve saved-layout compatibility where practical and should include a concrete visual test case near a joint or UV seam.
