# The Moath Macro - release channel

Binaries only. No source code lives in this repository.

- Download the latest portable build from **Releases**.
- `version.json` is the auto-update manifest the app polls at startup.

## Install

1. Download `TheMoathMacro-<version>-win64.zip` from Releases.
2. Extract anywhere writable (not Program Files).
3. Run `TheMoathMacro.exe`. The core daemon ships in the same folder.

Updates are checked against `version.json`; when a newer release exists the
app shows an Install button on the Updates card and swaps the binaries on
restart.
