# PC base metadata (AngryBirdsPC-1.0.0)

Source item: <https://archive.org/details/AngryBirdsPC-1.0.0>  
Direct file (requested by user): <https://archive.org/download/AngryBirdsPC-1.0.0/AngryBirds.zip>

> **Download status:** The coding sandbox cannot fetch this ZIP directly. `curl` to `archive.org` and its storage subdomains fails with TLS/connection errors. The archive.org metadata and the ZIP's internal "View Contents" listing are reachable through the page-fetch tool, but the 36.7 MB binary payload is not. The rights holder needs to upload `AngryBirds.zip` to the repo (or attach it) for the actual port build to proceed.

## Item metadata

| Field | Value |
| --- | --- |
| Title | Angry Birds PC v1.0.0 |
| Creator | Rovio |
| Publication date | 2011-01 |
| Added to archive | 2020-03-02 |
| Uploader | seaweedmedley@gmail.com / WumboSpasm |
| Item size | 36.7M (38,435,396 bytes for the ZIP) |
| ZIP file count | 512 entries |
| ZIP MD5 | `a09a2676faf4bc4a3bb33fd224a60ccd` |
| ZIP CRC32 | `ce477725` |
| ZIP SHA-1 | `e4034e41adbcfa158831c57c6badbb2ca8edf5de` |
| Description | "Version 1.0.0 of the Angry Birds PC port. Does not contain the original installer." |
| Source cited | https://www.cybermania.ws/games/angry-birds-1-0-0/ |
| Collections | `ipaarchive`, `phonesoftware` |
| Curation note | "checked for malware" (2020-03-02) |

### User-review warnings observed on the item page

The item has conflicting user reviews, including:

- reports that the `.exe` triggers antivirus detections,
- a report that `msvcr100.dll` is missing,
- a report of a texture-size error (`2048x2048` vs `1024x1024`),
- a posted activation code, suggesting the build may include AppUp/DRM activation behavior.

Because of these reports, **do not execute** `AngryBirds.exe` or `AppUpWrapper.dll` until provenance, hash, and safety are independently verified. This repository has not run either binary.

## Top-level ZIP structure (from archive.org "View Contents")

The listing is paginated into 13 chunks by the page-fetch tool. Representative structure:

```text
AngryBirds.exe                         1,232,128 B
AppUpWrapper.dll                       2,642,944 B
config.lua                                   358 B
data/
  audio/
    music/     *.mp3
    sfx/       *.wav, *.mp3
  fonts/
    pc_build/  *.dat, *.png
  images/
    pc_build/  *.dat, *.png
  levels/
    goldeneggs1/  LevelGE_*.lua
    pack1/        Level*.lua
    pack2/        Level*.lua
    ...
    pack11/       LevelP4_*.lua
  localization/ TEXTS_BASIC.dat
  scripts/
    animations.lua
    blocks.lua
    gamelogic.lua
    loadlist.lua
    particles.lua
    starLimits.lua
```

### Recovered `config.lua`

Fetched from the archive's per-file view:

```lua
product = "Angry Birds"
publisher = "Rovio"
name = "Angry Birds"
width = 1024
height = 768
orientation = 0
datapath = "data"
imagePath = "images/pc_build"
fontPath = "fonts/pc_build"
audioPath = "audio"
localizationPath = "localization"
levelPath = "levels"
scriptPath = "scripts"
deviceModel = "windows"
fullscreen = true
showCursor = false
```

### Notable script sizes in the PC base

| File | Size (B) |
| --- | ---: |
| `data/scripts/animations.lua` | 2,630 |
| `data/scripts/blocks.lua` | 57,858 |
| `data/scripts/gamelogic.lua` | 466,948 |
| `data/scripts/loadlist.lua` | 2,413 |
| `data/scripts/particles.lua` | 3,895 |
| `data/scripts/starLimits.lua` | 7,744 |
| `data/localization/TEXTS_BASIC.dat` | 69,831 |

By comparison, the supplied IPA contains `animations.lua` at 2,630 B but `blocks.lua` at 24,305 B and `gamelogic.lua` at 129,287 B. The PC base is therefore **not** a byte-identical copy of the IPA payload; it is a distinct Windows build with expanded/compiled scripts and many more level packs.

## Implications for a "100% accurate" iOS 1.0 → PC port

1. The PC base is already a Windows build, but it is not the same as iOS 1.0. A truly accurate iOS 1.0 port would require replacing or converting the PC base's scripts, levels, fonts, and textures to match the IPA.
2. The IPA uses PVR textures; the PC base uses PNG sprite sheets. Texture conversion is required for visual parity.
3. The PC base contains far more level packs than the IPA. Level parity must be explicitly scoped.
4. `AngryBirds.exe` and `AppUpWrapper.dll` are proprietary binaries. They cannot be reconstructed from the archive metadata alone and must come from an authorized copy.
5. Without the actual ZIP and written redistribution rights, no release artifact can be created.

## Next action

Upload `AngryBirds.zip` to this repository (the same way the IPA was uploaded to `master`), or attach it in chat, and provide the written license/permission document. Then `tools/port_assets.py` can generate a real reconciliation plan and, once rights are confirmed, rebuild the PC package.
