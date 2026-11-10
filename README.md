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

1. **Choose a Roller**: Hustler, Rascal or Technician. Each has different per-turn limits, rewards for holding
   back, and position shape.
2. **Intro bout** on house chips earns your 200¢ welcome stake.
3. **Each floor**: visit the Diesmith, Trick Trader, Chip Exchange, Lounge and Sports Book, then sit at a table.
4. **Commit**: tilt the bout, lay out your position, and wager everything you left off the table.
5. **Bout**: draw tricks, roll dice onto them, bid chips to play them. Both Rollers plan, then effects resolve.
6. **Settle**: take winnings and a die, two dice, or glean a trick. Close three tables (or win a Double Down) to
   face the High Roller and take the stairs.
7. **After floor 4**: the Penthouse, then the Paradise Ascent, a ladder of remnant builds with no shops or wagers.
8. **Exit through the Gift Shop** whenever you want to cut your losses. Jackets you buy there stay unlocked.

## Code

| Path | What it holds |
| --- | --- |
| `js/data.js` | All content: Rollers, tricks, dice, chips, tilts, floors, drinks, sports, jackets, cards |
| `js/bout.js` | The bout engine. Pure logic, no DOM. `resolve()` yields a step after every visible change |
| `js/ai.js` | The automated Roller, planning through the same API the player uses |
| `js/run.js` | Everything between bouts: floors, shops, wagers, settlement, the Ascent, saving |
| `js/ui/` | Screens. `core.js` has the transition helpers every screen uses |
| `tests/` | Headless simulations: whole runs, balance by floor, Ascent bouts |
| `docs/DESIGN.md` | How the design workbook was turned into rules, and what is not built yet |

```sh
npm test           # AI-played runs with state checks after every turn
npm run balance    # win rates and bout length by floor
```
