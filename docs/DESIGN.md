# From the workbook to the game

The design workbook ("Rolling Paradise Pair of Dice") has 33 tabs written over time, and several of them describe
the same system at different stages. This file records which reading the game uses, what was simplified, and what
is not built yet. Tab names are in **bold**.

## What is built

### Rollers (**Rollers**, **Position**)
- Three classes with the workbook's numbers: Trickery / Ingenuity / Proficiency (draws, bids, rolls per turn),
  Charisma / Cunning / Conviction (reward per unused bid, roll, draw), Balance / Versatility / Depth (stack
  height, Meter rows, Bar rows on a base of 3 / 2 / 3, five columns).
- Starting dice per class. Class deployment: Technician from the front, Hustler from the back, Rascal centred.

### The bout (**Bout**, **Plays**, **Effects**, **Tricks**, **Targeting**, **Game**)
- Goal: deplete the opponent's Worth before they deplete yours.
- A turn: draw tricks from the Book to the Run, roll dice out of the Pouch (each shows its value in the Rolled
  tray before it goes anywhere), place them on the shown tricks where they do the most, bid chips from your
  position to play them, then Play or Pass. A die placed this turn can be moved until its trick is bid; dice left
  in the tray go back to the Pouch. Unused draws, rolls and bids pay Power, Opportunity chips and chips
  stolen from the Stage.
- A trick has a Trait (bid, no dice), a Roll effect (bid plus dice, scaled by the total) and a Bonus (full dice of
  the right type, condition met, matching class only).
- Effects resolve in the workbook's order: Investments, Insurances, Expenses, Corrections.
- Bids go to the House. A bid worth more than 1¢ makes the trick linger that many extra turns: the Trait repeats
  each turn and the Roll effect lands on the last turn, larger for the wait.
- Fees go out as Debt chips (1, 2, 5, 10¢) on the target stacks. When every Expense of the phase is out, the House
  settles: Debt takes chips from the top while it covers their value, the paid chips go to the Stage, and the rest
  stays on the stack as Debt until a later fee or the end of the turn finishes the chip beneath it.
- Both Rollers' tricks in a phase are played together. Every value is read from the table as it stood when the
  phase was called, so nothing played in a phase changes another trick in the same phase.
- The Stage is shown as stacks of chips in front of the House. The winner takes the whole Stage.
- Targeting approaches (front, rear, flank, body, any, meter) and distributions (Hit, Swipe, Poke, Hook, Drop,
  Burst, Wave, Aura, Rain) with the workbook's minimum / increment / maximum space counts.
- 26 tricks across the four types, named from the trick lists.
- Flips: a standard chip can be flipped from the top of a stack onto a shown trick. It lands as 0 or its worth,
  counts as a die of any type, uses a roll, and returns to the Meter when the trick has played.
- The House runs the resolution with two arms, one per Roller: it collects the bids, calls each phase, points both
  arms at the two tricks being played and the spaces they land on at the same time, posts both calls to the feed,
  then calls Settle and rakes the paid chips to the Stage.
- Trick cards show their multiplier (quality plus +0.25 per upgrade) and the tooltip and Trick Trader spell out
  what the next upgrade does to the roll total and the Trait. A phase tracker and a four-line action
  feed stay on screen for the whole bout.

### Chips (**Chips**, **Shop**)
- Royale Paradise chips of 1, 2, 5 and 10¢, unlocked by floor as in the Chip Exchange table.
- Debt, Block, Counter, Opportunity, Gold, Burning, Acid, Shocking, Corrupting, Poison and Boom chips, and Holes.
  Three new Expenses leave the new hazards: Infect (Corrupting), Envenom (Poison) and Rig (Boom). The names are
  placeholders.
- Red, Blue and Yellow chips that extinguish, absorb and neutralize hazards on their stack.
- Creatures (UFO, Fairy, Dragon, Mole, and from the 5¢ and 10¢ floors Unicorn and Mothership), Familiars, Spawners
  and Calamities (Inferno, House Audit, Black Hole, Volcano, Tornado), used by the tilts.
- Dice are drawn as their solids (d4 triangle, d6 square, d8 diamond, d10 hexagon, d20 octagon) and chips as discs
  with an edge.

### Between bouts (**Shop**, **Lounge**, **Gamble**, **Commitment**, **Floor**, **Floors**)
- Four floors with three tables and a High Roller each. Unseen tables hide their Roller until you sit down.
- Each floor is a floor plan you walk around, laid out after the sketch on the **Floors** tab: stairs up behind
  the head table, game tables in the middle, shops along one wall, the House's book and the Lounge on the other,
  the way in at the bottom next to the dodgy corner (where you search for cards). Floors 1 and 2 mirror each
  other; floors 3 and 4 have their own layouts.
- Diesmith: forge (dice plus chips, with the workbook's costs and floor gates), sell, upgrade.
- Trick Trader: one trick per class plus one generic, restock, upgrade, sell, Membership Card after five
  purchases, Secret Shelf.
- Lounge: the drink list with sips; buy, or play the barfly for it once per floor.
- Sports Book: the seven sports, the odds table, one bet per game, settled while you are at the table.
- Commitment: Challenge and Cheat tilts with the tier costs, slot counts and multiplier steps from the table;
  position planner with spacing and stacking choices; everything left off the table is wagered.
- Wager ×1.5 at tables, ×3 at the High Roller, capped at ×3. Double Down doubles it up to ×6, keeps the last
  bout's Challenge tilts, drops Cheat tilts, and on a win opens the High Roller and grants a Suite Key Card.

### Winning, losing, leaving (**Winnings**, **Losings**, **Suite**, **Gift Shop**, **Gear**, **Paradise Ascent**)
- Win: surviving chips, your fees restored, the opponent's fees, the wager times its multiplier, a chip per
  Opportunity chip, Gold chips doubled. Then one prize: winnings and a die, two dice and no winnings, or glean a
  trick and no winnings.
- Lose: the position, the wager and two random dice. The run continues if you can raise chips (a winning ticket,
  or selling dice and tricks).
- Suite after a Double Down floor: dresser, wardrobe, bed. Penthouse after floor 4.
- Exit through the Gift Shop: jackets and wallets stay unlocked for future runs; the ATM banks chips if you found
  the Debit Card.
- Wallets (**Gear**): each has a slot count and a retention number. In the alley you roll two dice against that
  number; succeed and the wallet's cards are on the dresser for your next run.
- The purse limit: pass 999 trillion and the purse rips, ending the run in "crushing defeat".
- Paradise Ascent: five legend steps plus your own finished builds, stored in the browser and placed by net worth.

## Readings chosen where the workbook leaves it open

| Question | Reading used |
| --- | --- |
| Do Rollers act in turn or together? | Together. Both plan, then everything resolves by effect type. The opponent's Run is visible while you plan. |
| The nine turn phases (Opening, Deal, Drop, Decision, Dance, Bow) | Folded into draw, roll, bid and Play. There is no separate hand, and no Toss or Reroll in the Bow. |
| How a fee meets a chip | A fee removes chips from the top while it covers their value. What is left becomes Debt chips on the next chip, which is collected when Debt reaches its value. Overkill carries to the stack behind. |
| When tilt tiers are bought | Unlocked once per floor, then free to use for every bout on it. |
| How a bout ends if neither side breaks | "Last call" is an addition: from turn 9 every Expense is multiplied by a factor that grows each turn. At turn 40 the most Worth wins. |
| Debt (the **Debt** tab's five concepts) | "Knocked out by debt": reaching zero Worth loses the bout. |
| Dice upgrades | Three of the 22 listed: Accelerate, Escalate, Stabilize. |
| Which cards take a wallet slot | Benefit cards and the Royal Card do (Collectables C80: with no room for the Royal Card you drop one of your two starters). Membership, Suite Key, Punch and Paradise are passes and do not. Cards can be dropped from the kit at any time, except the Royal Card before floor 1. |
| Membership Card discount | "Also gives the discount": 10% off at the Trick Trader, not stacking with a Trader Discount Card. |
| Debt chip values | Debt comes in the chip denominations, so 7¢ owed shows as a 5 and a 2. |
| Which dice make the alley roll ("2dn") | Your two largest dice. Big dice are worth keeping for it. |
| Wallet prices | Stats come from the **Gear** tab and prices from the **Gift Shop** tab, matched in order where the names differ. |
| What a flip costs | One roll. The chip is not spent: it comes back to the Meter. |
| Opponent strength | Generated per floor from the class tables; quality and dice improve each floor. |

## Not built yet

- Artifacts and the jacket pocket limits.
- Gift, Identification, Collectable, Roller, High Roller and Ascended cards (Paradise and five Notes are built); cosmetics; the music player.
- Play-by-play sports. Games are settled by a weighted draw from the posted odds. No hedges.
- Themes per opponent, table felts beyond a name, encounter modifiers.
- Most of the 400-entry chip list, the **Effects** element table, Splitting, the Rest conditional.
- Online ladder. The Ascent uses generated legends and your own past builds on this device.
- Saving in the middle of a bout. A reload returns you to the floor before it.

What is needed to build these is listed in `docs/OPEN-QUESTIONS.md`.

## Balance

A first pass, checked by simulation (`npm run balance`). Bouts run about 4 turns in the intro and 7 to 14
afterwards. With the AI playing both sides and no shopping, a Technician clears floor 1 far more often than a
Rascal, whose Bar is the smallest. The numbers that drive this are in `FLOORS` in `js/data.js` and
`genOpponent` in `js/run.js`.
