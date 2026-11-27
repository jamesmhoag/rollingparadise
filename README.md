# Rolling Paradise

Gamble your way to the top.

A roguelike dice-and-chips duelling game set in the Royal Paradise Hotel & Casino. Pick a Roller, win bouts by
depleting your opponent's Worth before they deplete yours, spend and wager your winnings between bouts, and climb
four floors to the Paradise Ascent.

## Play

The game is plain HTML, CSS and JavaScript modules. There is no build step.

```sh
npm start          # serves the folder at http://localhost:8080 (any static server works)
```

Browsers do not load JavaScript modules from `file://`, so open it through a server, or enable GitHub Pages for
the repository and play it there.

Hover anything — every chip, die, trick, number and button explains itself.

## The loop

1. **Choose a Roller**: Owl the Hustler, Fox the Rascal or Hog the Technician. Each has different per-turn limits, rewards for holding
   back, and position shape.
2. **Intro bout** on house chips earns your 200¢ welcome stake.
3. **Each floor**: walk the floor plan to the Diesmith, Trick Trader, Chip Exchange, Lounge and Sports Book, then
   sit at a table.
4. **Commit**: tilt the bout and lay out your position. Each table has a wager of its own to sit down; what you leave
   in your purse is yours even if you lose. A table is played once, win or lose.
5. **Bout**: each turn has three steps, taken by both Rollers together. **Draw** tricks onto your Run, **roll** dice
   (or flip chips) in one throw and put them on tricks, then **bid** chips to play them. You see each of your
   opponent's steps only after you lock in your own. Then the House calls each effect type and resolves every trick.
6. **Settle**: take winnings and a die, two dice, or glean a trick. Play your two tables (or win a Double Down) and
   the High Roller sits down: that one is all in, and they match you. Play them and the stairs open; beat them and
   you climb with their crown.
7. **After floor 4**: the Penthouse, then the Paradise Ascent, a ladder of remnant builds with no shops or wagers.
8. **Exit through the Gift Shop** whenever you want to cut your losses. Jackets you buy there stay unlocked.

## Build mode

**Build** on the main menu edits the game's content (classes, tricks, chips, dice, shops, floors, text) field by field.
Changes are live in your browser straight away, so you can play with them. **Export** downloads `overrides.js`: put it at
`js/content/overrides.js` (or run `npm run merge-content -- overrides.js` to merge it with changes made elsewhere) and
commit it to make the changes part of the game.

## Developer mode

**Developer mode** on the title screen puts a DEV button by your purse (set it to any amount, jump floors, seat the
High Roller) and adds Clear it and Lose it to every table, settled at once with the real settlement and prizes.

## Code

| Path | What it holds |
| --- | --- |
| `js/data.js` | All content: Rollers, tricks, dice, chips, tilts, floors, drinks, sports, jackets, cards |
| `js/content/` | Editable tables: dice materials, the Dice Shop, casts and dyes (`dice.js`); hover guidance (`guidance.js`) |
| `js/text/en.js` | Every line of game text, by key. `js/text.js` looks lines up (`t('floor.dice.sub', { n })`) |
| `js/bout.js` | The bout engine. Pure logic, no DOM. `resolve()` yields a step after every visible change |
| `js/ai.js` | The automated Roller, planning through the same API the player uses |
| `js/run.js` | Everything between bouts: floors, shops, wagers, settlement, the Ascent, saving |
| `js/ui/` | Screens. `core.js` has the transition helpers every screen uses; `dev.js` is developer mode; `gearmaker.js` the wallet and jacket maker |
| `js/content/finishes.js` | Finishes (the dice materials, cloths and hides) and how wallets and jackets look |
| `tests/` | Headless simulations: whole runs, balance by floor, Ascent bouts, the phased turn and Debt forecasts |
| `docs/DESIGN.md` | How the design workbook was turned into rules, and what is not built yet |
| `docs/OPEN-QUESTIONS.md` | What is still needed from the designer to build the remaining systems |
| `docs/ROUND-19.md` | The latest list of notes, with what was done for each |
| `assets/` | The neon sign, split into its pink, cyan and dice tubes so each can flicker on its own |

```sh
npm test           # every test: the rules on the tables as written, then whole runs on the shipped content
npm run balance    # win rates and bout length by floor
```
