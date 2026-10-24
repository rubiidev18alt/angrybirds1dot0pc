# PC base key files (reconstructed from archive.org listing)

This is a curated extraction from the 13-chunk "View Contents" listing for `AngryBirds.zip`. It is **not** a complete 512-file manifest; it records the structure needed to plan the port. The full listing remains available on archive.org, and the actual ZIP has not been downloaded into this workspace.

## Root

| File | Size (B) | Timestamp |
| --- | ---: | --- |
| `AngryBirds.exe` | 1,232,128 | 2011-01-04 18:03 |
| `AppUpWrapper.dll` | 2,642,944 | 2011-01-05 23:50 |
| `config.lua` | 358 | 2011-01-06 09:48 |

## Audio — music

| File | Size (B) |
| --- | ---: |
| `data/audio/music/ambient_city.mp3` | 978,023 |
| `data/audio/music/ambient_construction.mp3` | 903,417 |
| `data/audio/music/ambient_green_jungleish.mp3` | 1,645,086 |
| `data/audio/music/ambient_red_savannah.mp3` | 776,776 |
| `data/audio/music/ambient_white_dryforest.mp3` | 667,688 |
| `data/audio/music/birds_boss.mp3` | 150,464 |
| `data/audio/music/birds_intro.mp3` | 366,131 |
| `data/audio/music/birds_outro.mp3` | 299,048 |
| `data/audio/music/funky_theme.mp3` | 1,791,790 |
| `data/audio/music/game_complete.mp3` | 290,171 |
| `data/audio/music/level_complete.mp3` | 70,742 |
| `data/audio/music/title_theme.mp3` | 1,640,597 |

## Fonts

| File | Size (B) |
| --- | ---: |
| `data/fonts/pc_build/FONT_BASIC.dat` | 1,965 |
| `data/fonts/pc_build/FONT_BASIC_IPAD.png` | 55,638 |
| `data/fonts/pc_build/FONT_BIG_NUMBERS.dat` | 435 |
| `data/fonts/pc_build/FONT_BIG_NUMBERS_IPAD.png` | 40,048 |
| `data/fonts/pc_build/FONT_INGAME_SCORE.dat` | 323 |
| `data/fonts/pc_build/FONT_INGAME_SCORE.png` | 22,107 |
| `data/fonts/pc_build/FONT_LS_SMALL.dat` | 204 |
| `data/fonts/pc_build/FONT_LS_SMALL_IPAD.png` | 4,331 |
| `data/fonts/pc_build/FONT_MENU.dat` | 1,160 |
| `data/fonts/pc_build/FONT_MENU_IPAD.png` | 97,442 |
| `data/fonts/pc_build/FONT_SCORE.dat` | 1,168 |
| `data/fonts/pc_build/FONT_SCORE.png` | 64,801 |

## Images (selected)

| File | Size (B) |
| --- | ---: |
| `data/images/pc_build/BACKGROUNDS_GE_1.png` | 314,483 |
| `data/images/pc_build/BACKGROUNDS_LS_1.png` | 445,111 |
| `data/images/pc_build/BACKGROUNDS_MAIN_1.png` | 212,209 |
| `data/images/pc_build/BUTTONS_SHEET_1.png` | 491,742 |
| `data/images/pc_build/CURSORS_SHEET_1.png` | 5,241 |
| `data/images/pc_build/CUTSCENES_BACKGROUNDS_1.png` | 3,100,956 |
| `data/images/pc_build/CUTSCENES_ELEMENTS_1.png` | 723,486 |
| `data/images/pc_build/GOLDEN_EGGS_SHEET_1.png` | 680,719 |
| `data/images/pc_build/INGAME_BIRDS_1.png` | 623,957 |
| `data/images/pc_build/INGAME_BLOCKS_2.png` | 1,196,972 |
| `data/images/pc_build/LEVELSELECTION_SHEET_1.png` | 501,500 |
| `data/images/pc_build/MENU_ELEMENTS_1.png` | 394,482 |
| `data/images/pc_build/SPLASHES_SHEET_1.png` | 4,067,653 |
| `data/images/pc_build/TUTORIALS_SHEET_1.png` | 173,337 |

## Scripts

| File | Size (B) |
| --- | ---: |
| `data/scripts/animations.lua` | 2,630 |
| `data/scripts/blocks.lua` | 57,858 |
| `data/scripts/gamelogic.lua` | 466,948 |
| `data/scripts/loadlist.lua` | 2,413 |
| `data/scripts/particles.lua` | 3,895 |
| `data/scripts/starLimits.lua` | 7,744 |

## Level packs observed

`goldeneggs1`, `pack1` … `pack11`. Examples:

- `data/levels/goldeneggs1/LevelGE_1.lua` — 15,358 B
- `data/levels/pack1/Level1.lua` — 3,044 B
- `data/levels/pack2/Level20.lua` — 5,765 B
- `data/levels/pack3/Level18.lua` — 4,709 B
- `data/levels/pack4/LevelP2_64.lua` — 9,463 B
- `data/levels/pack5/LevelP2_67.lua` — 13,110 B
- `data/levels/pack6/LevelP3_134.lua` — 6,360 B
- `data/levels/pack7/LevelP3_159.lua` — 8,054 B
- `data/levels/pack8/LevelP3_149.lua` — 9,982 B
- `data/levels/pack9/LevelP4_421.lua` — 3,618 B
- `data/levels/pack10/LevelP4_442.lua` — 10,439 B
- `data/levels/pack11/LevelP4_463.lua` — 10,843 B

The supplied IPA contains its own `Level*.lua` files directly under `Payload/AngryBirds.app/data/`, with different sizes and numbering. Reconciling these two level sets is a core part of the port.
