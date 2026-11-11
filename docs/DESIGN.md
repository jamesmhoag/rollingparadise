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
- A turn has three planning phases, then the House plays it (see **The turn** below). Unused draws, rolls and
  bids pay Power, Opportunity chips and chips stolen from the Stage.
- A trick has a Trait (bid, no dice), a Roll effect (bid plus dice, scaled by the total) and a Bonus (full dice of
  the right type, condition met, matching class only).
- Effects resolve in the workbook's order: Investments, Insurances, Expenses, Corrections.
- Bids go to the House. A bid worth more than 1¢ makes the trick linger that many extra turns: the Trait repeats
  each turn and the Roll effect lands on the last turn, larger for the wait.
- Fees go out as Debt on the target stacks, then the House settles them (see **Debt** below).
- Both Rollers' tricks in a phase are played together. Every value is read from the table as it stood when the
  phase was called, so nothing played in a phase changes another trick in the same phase.
- The Stage is shown as stacks of chips in front of the House. The winner takes the whole Stage.
- Targeting approaches (front, rear, flank, body, any, meter) and distributions (Hit, Swipe, Poke, Hook, Drop,
  Burst, Wave, Aura, Rain) with the workbook's minimum / increment / maximum space counts.
- 26 tricks across the four types, named from the trick lists.
- Flips: the top standard chip of a stack can be picked in the Roll phase alongside dice. It lands as 0 or its
  worth, counts as a die of any type, uses a roll, and returns to the Meter when the trick has played (or when the
  Roll phase closes, if it was left in the roll).
- The House runs the resolution with two arms, one per Roller: it collects the bids, calls each phase, points both
  arms at the two tricks being played and the spaces they land on at the same time, posts both calls to the feed,
  then calls Settle and rakes the paid chips to the Stage.
- Trick cards show their multiplier (quality plus +0.25 per upgrade) and the tooltip and Trick Trader spell out
  what the next upgrade does to the roll total and the Trait. A phase tracker and a four-line action
  feed stay on screen for the whole bout.

### The turn
Both Rollers go through the same three phases. A phase closes for both at once, and closing it ends that kind of
action for the turn.

| Phase | What you do | Required before it closes | Closing it means |
| --- | --- | --- | --- |
| 1 · Draw | Click tricks in the Book to show them on the Run, up to Trickery. | At least one draw. | No more draws this turn. |
| 2 · Roll | Pick dice from the Pouch, and top chips to flip, up to Proficiency. Press Roll: all of them land in **the roll** together, showing their values. Put them on shown tricks or leave them; move them between tricks freely. | At least one rolled die on a trick. | No more rolling or moving dice. Dice left in the roll go back to the Pouch (a flipped chip to the Meter). |
| 3 · Bid | Click a stack to pick up its top chip, then click a trick to bid it. Dice rolled this turn can still be moved between tricks. Repeat until out of bids (Ingenuity). A trick that already has a bid can take another; its BID slot becomes a **+** after the chips already on it. | At least one bid. | The House collects the bids and plays the turn. |

- The button that closes a phase is named for what comes next: **Roll** (done drawing), **Roll n** (throw the
  picked dice), **Bid** (done rolling), **Play** (commit the turn). Dice placed this turn and bids stay editable until
  Play.
- **You see the other Roller's move in a phase only after you lock in yours.** The opponent makes its move for a
  phase when you lock it in, working from your table as it stood when the phase opened, so neither side sees the
  other's choice before making its own. The feed then posts what they did ("Low Ball rolls 3 + 4 onto Charge").
- Rolling is **one throw a turn**. Undo in the Roll phase takes dice off tricks and back into the roll, but never
  undoes the throw, so you cannot look at values and pick again. Undo in Draw or Bid takes back that phase only.
- A requirement is waived when it cannot be met: an empty Book, no shown trick with room for a die, no die or
  flippable chip, or no chip you could bid without going broke. A bid can never spend your last chip.

### Debt
A fee is paid in whole chips, from the top of the stack it lands on. The rule, in the order the House applies it:

1. Block and Counter chips on top absorb 1¢ each.
2. The top chip is paid to the Stage if the Debt covers its whole value; repeat with the next chip.
3. What cannot cover the next chip stays on that stack as **Debt**: one red marker showing the exact amount, with
   a tag such as "3 of 5¢" (3¢ owed towards the 5¢ chip it sits on). It already counts against Worth, blocks
   bidding from that stack, and the chip is paid as soon as later fees bring the Debt up to its value.
4. If the stack runs out of chips, the rest (**overkill**) moves to the next stack behind it in the same **lane**:
   the line of stacks running from the Stage out to the edge of the table. Overkill never spreads to another lane.
   With no stack behind, it is wasted. A Hardened stack pays one chip per fee and nothing carries on.

Worked example (this is checked in `tests/phases.mjs`): a stack of 5, 5 and 1 (top) takes a 14¢ fee. The 1, 5 and 5
are paid (11¢); the stack is empty, so 3¢ carries to the stack behind, a 2, 2, 2. One 2 is paid and 1¢ stays there
as Debt ("1 of 2¢"). A later 1¢ fee on that stack makes it 2¢ and the next 2 is paid.

How this is shown:
- While aiming an Expense (or hovering a bid one), every stack it touches shows the forecast: gold **−n** paid,
  red **n owed** left as Debt, pink **n→** carried down the lane, **n wasted** overkill with nowhere to go. The
  forecast runs the House's own settle on a copy of the table, so it matches what happens unless the other
  Roller's tricks change the table first.
- Worth shows what is owed beside it; each indebted stack carries its "x of y¢" tag; the stack tooltip states the
  rule and how much more Debt takes its top chip.
- When the House settles, the feed lists the chips paid and where the rest went, for example "Low Ball pays 11¢
  (1 + 5 + 5) to the Stage: 3¢ overkill carries to the stack behind."

### Chips (**Chips**, **Shop**)
- Royale Paradise chips of 1, 2, 5 and 10¢, unlocked by floor as in the Chip Exchange table.
- Debt, Block, Counter, Opportunity, Gold, Burning, Acid, Shocking, Corrupting, Poison and Boom chips, and Holes.
  Three new Expenses leave the new hazards: Infect (Corrupting), Envenom (Poison) and Rig (Boom). The names are
  placeholders.
- Shop chips, sold at the Chip Exchange because no trick or table effect makes them. Each is worth 1¢, goes at the
  base of a stack, is not wagered, and comes back after a win if it survives. Their price comes from a tier
  (`CHIP_TIERS`: Common, Uncommon, Rare, Epic, Royal), which also sets the floor they are sold from:
  - resists: Red (Burning), Blue (Shocking), Yellow (Acid), and new Violet (Corrupting), Green (Poison), Black (Boom);
  - Bumper (each fee on its stack is 1¢ smaller), Anchor (creatures, Scatter, Tornado and Black Hole cannot take
    from its stack), Nest Egg (pays 15¢ if it survives a win), Mirror (2¢ of Debt back to the attacker per fee),
    Lucky (30% a turn to make an Opportunity chip), Crown (stack starts Hardened for 3 turns).
  The numbers each effect reads are in `SHOP_CHIPS[id].vars`.
- Two element hazards: Frozen (Cold; its stack cannot be bid or flipped, thaws in 2 turns or next to heat), left
  by Chill; Lava (Heat; melts the chip beneath and spills Burning next door, cools in 2 turns), left by Erupt
  (Technician). The Orange chip thaws Frozen; the Red chip now stops Lava too. The Fog chip hides its stack from
  the opponent's aim.
- Creatures (UFO, Fairy, Dragon, Mole, and from the 5¢ and 10¢ floors Unicorn and Mothership), Familiars, Spawners
  and Calamities (Inferno, House Audit, Black Hole, Volcano, Tornado), used by the tilts.
- Dice are drawn as their solids (d4 triangle, d6 square, d8 diamond, d10 hexagon, d20 octagon) and chips as discs
  with an edge.
- Upgrades are drawn on the upgraded thing: each die upgrade puts its own badge on the die (Accelerate +, Escalate
  ▲, Stabilize =); trick quality is the card's frame (Fine silver, Grand gold, Royal gold with a halo) and each
  upgrade adds a ▲ and a moving foil; a gilded chip turns gold.
- Each table has a felt (`FELTS`) that colours the bout table and the table on the floor plan. The High Roller
  plays on Royal, the doorman and the barfly on House, the Ascent on Paradise. Felts have no board effect yet.

### Hover detail
Right-click anywhere to switch every hover and the table prompts between verbose (rules spelled out) and concise
(just the facts); the choice is remembered. A card, jacket or drink lists each attribute it changes, your value
before and after, and what one point of it does. Dropping a card says what you lose. Hovering the METER or BAR label
of either Roller explains its size: depth (2 or 3 base rows + Versatility or Depth), width (5 lanes for everyone)
and stack height (3 + Balance), with where each bonus comes from.

### The Library
Opens from the title screen, the HUD on the floor and the commitment screen, and the bout table. Tabs for chips,
tricks, dice, cards, drinks, wallets, jackets and felts show each piece as it is drawn in the game, with its
numbers, where it comes from, and its upgrades (an empty Upgrades section where none exist yet). During a run,
what you own, carry or wear is marked.

### Between bouts (**Shop**, **Lounge**, **Gamble**, **Commitment**, **Floor**, **Floors**)
- Four floors with three tables and a High Roller each. The path is fixed: table 1 first (the lowest table on the
  plan), then a choice between tables 2 and 3, which sit side by side. Beating one closes the other, and opens the
  High Roller. Tables 2 and 3 show their Rollers once table 1 is closed, so the choice is an informed one. A won
  Double Down still opens the High Roller early.
- The stairs you came in by (the front door on floor 1) save the run and go back to the main menu, where Continue
  picks it up. There is one run at a time: starting a new run asks first, then ends the saved one.
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
  Opportunity chip, Gold chips doubled. All of that is kept. Then one prize on top: bonus money (a quarter of the
  opponent's starting worth, `PRIZES.bonus`) and one of their dice, two of their dice, or one of their tricks.
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
| Do Rollers act in turn or together? | Together, phase by phase (Draw, Roll, Bid). Each sees the other's move in a phase only once both have made it. Then everything resolves by effect type. |
| The nine turn phases (Opening, Deal, Drop, Decision, Dance, Bow) | Folded into Draw, Roll, Bid and the House's play. There is no separate hand, and no Toss or Reroll in the Bow. |
| How many throws a turn? | One. Everything you will roll is picked first and lands together. |
| How a fee meets a chip | See **Debt** above: whole chips from the top, the remainder stays as Debt, overkill goes down the lane only. |
| When tilt tiers are bought | Unlocked once per floor, then free to use for every bout on it. |
| How a bout ends if neither side breaks | "Last call" is an addition: from turn 9 every Expense is multiplied by a factor that grows each turn. At turn 40 the most Worth wins. |
| Debt (the **Debt** tab's five concepts) | "Knocked out by debt": reaching zero Worth loses the bout. |
| Dice upgrades | Three of the 22 listed: Accelerate, Escalate, Stabilize. |
| Which cards take a wallet slot | Benefit cards and the Royal Card do (Collectables C80: with no room for the Royal Card you drop one of your two starters). Membership, Suite Key, Punch and Paradise are passes and do not. Cards can be dropped from the kit at any time, except the Royal Card before floor 1. |
| Membership Card discount | "Also gives the discount": 10% off at the Trick Trader, not stacking with a Trader Discount Card. |
| Debt chip values | One Debt marker per stack showing the exact amount owed (it used to be split into 5, 2 and 1¢ chips, which read like money). |
| Which dice make the alley roll ("2dn") | Your two largest dice. Big dice are worth keeping for it. |
| Wallet prices | Stats come from the **Gear** tab and prices from the **Gift Shop** tab, matched in order where the names differ. |
| What a flip costs | One roll. The chip is not spent: it comes back to the Meter. |
| Which chips the shop sells | Those no trick, bonus or table effect makes. Chips a trick makes (Gold, Block, Counter, the hazards) are not sold. |
| What a shop chip costs | Its tier's price; the tier is how strong it is meant to feel until it has been tuned. |
| Opponent strength | Generated per floor from the class tables; quality and dice improve each floor. |

## Not built yet

- Artifacts and the jacket pocket limits.
- Gift, Identification, Collectable, Roller, High Roller and Ascended cards (Paradise and five Notes are built); cosmetics; the music player.
- Play-by-play sports. Games are settled by a weighted draw from the posted odds. No hedges.
- Themes per opponent, felt board effects, encounter modifiers.
- Most of the 400-entry chip list, the **Effects** element table, Splitting, the Rest conditional.
- Online ladder. The Ascent uses generated legends and your own past builds on this device.
- Saving in the middle of a bout. A reload returns you to the floor before it.

What is needed to build these is listed in `docs/OPEN-QUESTIONS.md`.

## Balance

A first pass, checked by simulation (`npm run balance`). Bouts run about 4 turns in the intro and 7 to 14
afterwards. With the AI playing both sides and no shopping, a Technician clears floor 1 far more often than a
Rascal, whose Bar is the smallest. The numbers that drive this are in `FLOORS` in `js/data.js` and
`genOpponent` in `js/run.js`.
