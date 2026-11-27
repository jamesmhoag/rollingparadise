# Resources

Every file the game loads lives here, and `js/content/assets.js` lists them by id. Edit or replace a file and the game picks it up on the next load; no code changes.

| Folder | What | Listed in |
| --- | --- | --- |
| `assets/title/` | the title sign's drawn pieces, one SVG each (`tools/title-sign.py` cuts them into the tubes that light in turn) | `IMAGES` |
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

The lounge band's set is 24 original tunes written for the game, three for each corner of Vegas jazz: 1950s lounge swing, 1960s bossa nova, 1960s showroom big band, late-1950s ballads, 1970s jazz-funk, 1940s jump blues, 1980s smooth jazz and 1960s soul-jazz organ. `tools/jazz` composes them: `setlist.py` holds each style's charts, the set and who plays what, `story.py` writes the melodies (a head built from one motif no other tune shares, an improvised chorus, the voices trading, the head out) and `engine.py` writes the rhythm section and the playing itself.

Piano, vibraphone, guitar and Rhodes carry the melodies, since struck and plucked instruments sound real from samples; horns and reeds answer from further back and the organ only comps. The horns breathe (each note swells and eases off, with late, drifting vibrato and the odd fall-off), every player leans behind or ahead of the beat as their style does, and the in-between notes of a phrase are ghosted.

`tools/jazz/render.py` renders each tune with FluidSynth and the GeneralUser GS soundfont (S. Christian Collins, free for any music; FluidR3 is the fallback) as stems: the band, the horns, and the organ through a rotating-speaker effect. It puts them all in one small lounge (a convolution room), warms them, adds a little room tone, and writes 96 kbps MP3s. Edit a chart or the set list and re-render to change a track, or add a tune to `SET` in `setlist.py`.

### Bout music

At a table the band plays the floor's own loop instead, and the High Roller (and the Ascent's last climb) has another: Basement Boogie and Cellar Stomp (Boogey Basement), Haven Hustle and Haven Heat (Hustlers Haven), Suite Intrigue and Showroom Showdown (Rollers Suite), Royal Velvet and Royal Decree (Royal Paradise), The Climb and The House (the Ascent). Each is 16 bars written out by hand in `tools/jazz/loops.py` and rendered by it into `assets/music/loops/` as four layers: the groove, the tune, the drive (the full kit and the horns) and the peril (toms and a roll, climbing tremolo strings, a low pulse, brass stabs). The game plays all four together and fades the drive and then the peril in as either Roller runs low on Worth (`js/ui/music.js`), so the bout's music tightens with the bout. Each file holds the loop with half a second either side; `js/content/loops.js` gives the span to loop. Each loop's tempo is set so that 16 bars come to a whole number of the synth's blocks, which makes every layer repeat exactly.

### Chiptune versions

Every tune and every loop layer also comes as a chiptune version in `assets/music/chip/`: the same notes, swing, ritards and bends, played by `tools/jazz/chip.py` on 8-bit voices the way an old console's sound chip would. The tune is a pulse wave with a soft echo, its answer a thinner pulse, chords fast arpeggios, the bass a stepped triangle and the drums shaped noise; envelopes move in 60 Hz frames and 16 volume steps. The room, the breathing and the Leslie don't carry over. `tools/jazz/chiptune.py` renders them all. The ♪ button cycles the band, the chiptune band and off, and keeps your place in the tune when you switch.

