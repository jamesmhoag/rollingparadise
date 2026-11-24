# Resources

Every file the game loads lives here, and `js/content/assets.js` lists them by id. Edit or replace a file and the game picks it up on the next load; no code changes.

| Folder | What | Listed in |
| --- | --- | --- |
| `assets/` | the title-screen logos (`logo-*.png`) | `IMAGES` |
| `assets/fonts/` | the two typefaces, as `.woff2`, with their licences | `FONTS`, and `css/fonts.css` |
| `assets/icons/` | pictures that replace a glyph: rooms, creatures, sky things, effect chips | `ICONS` |
| `assets/music/` | the lounge's music, played in turn on a loop (`.mp3`) | `MUSIC` |
| `assets/textures/` | images laid over a drawn surface, such as a table felt | `TEXTURES` |

## Adding an icon or a texture

1. Put the file in `assets/icons/` or `assets/textures/` (png, svg or webp; square for icons, tileable for textures).
2. In `js/content/assets.js`, set that id's `src` (icons) or value (textures) to the path, e.g. `"room:dice": { glyph: "🎲", src: "assets/icons/room-dice.svg" }`.

You can also set it in Build mode › Tables › ICONS / TEXTURES / IMAGES and export the change as usual.

An icon with no file shows its glyph, and a felt with no texture shows its own gradient, so nothing changes until you add a file.

## The check

`npm test` (tests/assets.mjs) fails when a listed file or a path in the code or CSS is missing, and lists files in this folder that nothing uses.

## Music

The lounge band's set is eight original tunes written for the game, one per corner of Vegas jazz: Neon Strip (1950s lounge swing), Velvet Rope (1960s bossa nova), High Roller (1960s showroom big band), Last Call (late-1950s ballad), Velour (1970s jazz-funk), Lucky Streak (1940s jump blues), Satin Dice (1980s smooth jazz) and Hammond Hour (1960s soul-jazz organ). `tools/jazz` composes them (`tunes.py` holds each chart, head and arrangement; `engine.py` writes the band around it) and `tools/jazz/render.py` renders them with FluidSynth and the FluidR3 General MIDI soundfont (MIT licence). Edit a tune sheet and re-render to change a track, or add a tune to the set and to `MUSIC` in `js/content/assets.js`.
