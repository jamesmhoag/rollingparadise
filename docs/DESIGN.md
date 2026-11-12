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
- A turn has three planning phases, then the House plays it (see **The turn** below). Draws, rolls and bids left
  unused pay **as soon as their phase is passed**, as chips on the Meter at random spaces with room (lost if it is
  full): unused draws make **Power chips** (Conviction), unused rolls **Opportunity chips** (Cunning), unused bids a
  **Steal chip** (Charisma) that steals from the Stage in the House phase. All added Power is Power chips on the Meter,
  one per point (Stir, an Investment trait, a Boost or Press bonus too): the same Power chip Empower makes. Each adds
  +1 to your roll effects for the turn (in the Investment phase, or at once if it arrives during play) and lasts that
  turn; nothing spends it. Both sides' chips appear when the phase closes, so you see your opponent's build up. Each step pill says
  in its hover what passing it gives; once passed it shows ✓ (all used) or what it kept.
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
  what the next upgrade does to the roll total and the Trait. A phase tracker and the action feed stay on screen
  for the whole bout. The feed is a **table**: a row per phase, headed by the phase and a note on what it does, with
  what each side resolved in it in its own column (You, then your opponent). Things that cannot be put together take
  another row for that side; a line repeated shows once with a count; House lines that belong to neither side span
  both columns, and the House's call of a phase becomes the row header. The short view shows the last rows;
  **History** (at the end of the phase bar) opens the same list to the whole match, by turn, to scroll back through,
  with each phase's note; Esc or History again closes it. Hover an entry to light up the spaces it touched.

### The turn
Both Rollers go through the same three phases. A phase closes for both at once, and closing it ends that kind of
action for the turn.

| Phase | What you do | Required before it closes | Closing it means |
| --- | --- | --- | --- |
| 1 · Draw | Click tricks in the Book to show them on the Run, up to Trickery. | At least one draw. | No more draws this turn. |
| 2 · Roll | Two steps. **Pick**: dice from the Pouch, and top chips to flip, up to Proficiency; press Roll and all of them land in **the roll** together, showing their values. The throw stands. **Place**: put them on shown tricks; move them between tricks freely. | A throw, and every die in the roll that fits a shown trick on one. | No more rolling or moving dice. A die with nowhere to go **stays in the roll**, keeping its value, until a later turn's trick has room; it is never rerolled. |
| 3 · Bid | Click your stacks to pick up a **hand** of chips (click a stack again for the chip under its top one), up to your bids left (Ingenuity), then click a trick: the whole hand is bid on it at once, one bid per chip. Or click a trick (or the **+** ring on its
bid pile) first: then each stack you click bids its top chip straight onto that trick. A trick's bid chips stack in a
pile, like a stack on the table, with the BID ring riding on the top chip as a **+**; the roll breakdown sits beside
the pile. Click the pile to take its top chip back. Dice rolled this turn can still be moved between tricks. A trick that already has a bid can take another; its BID slot becomes a **+** after the chips already on it. | At least one bid. | The House collects the bids and plays the turn. |

- The button that closes a phase is named for what comes next: **Roll** (done drawing), **Roll n** (throw the
  picked dice), **Bid** (done rolling), **Play** (commit the turn). Dice placed this turn and bids stay editable until
  Play.
- **You see the other Roller's move in a phase only after you lock in yours.** The opponent makes its move for a
  phase when you lock it in, working from your table as it stood when the phase opened, so neither side sees the
  other's choice before making its own. The feed then posts what they did ("Low Ball rolls 3 + 4 onto Charge").
- Rolling is **one throw a turn**. Undo in the Roll phase takes dice off tricks and back into the roll, but never
  undoes the throw, so you cannot look at values and pick again. Undo in Draw or Bid takes back that phase only.
- **Click to undo**, until the phase is locked in: click a trick drawn this turn to put it back in the Book, a die on
  a trick to take it back into the roll, a chip bid this turn to take it back to the stack it came from, a picked
  die or chip to drop it from the throw, a stack in your hand to let it go.
- **A phase you cannot act in is skipped on its own**: nothing to draw (an empty Book, no draws), no room or nothing
  to roll, nothing to bid on or with, nothing to aim. The feed says so. A whole turn can pass this way, and the
  draws, rolls and bids left unused still pay their rewards.
- The limits are shown where they apply: a trick's dice (`1/2` beside its slots: a trick holds at most its dice
  count, all of one type), the roll (`thrown 2/3` against Proficiency, and what is left in it), the steps (draws,
  rolls and bids left), and a stack (`4/6 high`, **full** when it is). The Run has no limit.
- A requirement is waived when it cannot be met: an empty Book, no shown trick with room for a die, no die or
  flippable chip, or no chip you could bid without going broke. A bid can never spend your last chip.

### Overload
A stack holds `3 + Balance` chips. When it is full:
- A trick that adds chips to the stack it aims at (Block on the Meter, the maker tricks, Foretell, Conjure, Hand Off)
  cannot aim at it: while aiming, full stacks are marked **FULL**.
- Chips that would land there anyway (a Block trick's chips spilling past a full Meter, the Shield tilt, Opportunity
  chips, a maker's spread onto a full neighbour) are **lost, like overkill**: the trick plays, the feed says how many
  had no room, and nothing extra is added. This **Meter overflow** counts with wasted overkill toward the pressure the
  House reads for its tilts.

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
The chip list from the workbook is kept in `docs/CHIP-LIST.tsv`; chips built from it name their row (`list`). The list
is additive: chips the game had that are not on it stay in the game.
The Library's **Chip list** tab shows all 97 rows with a status (built, partly built, needs detail) and, for
the ones that cannot be built yet, what is missing; `docs/CHIP-STATUS.md` is the same list as a document.
- **Resist chips** come from Resist Cards (found in the dodgy corner, r 2 or 3): one sits at the base of a front
  Bar stack each bout and deters fees under r¢ on it — debt resistance, the way a Red chip resists fire.
- **Food** (Chocolate, Chip Chip with Dip, Fish 'n Chip, Hamburger and Bun) is sold at the Chip Exchange and goes on
  top of a stack; Honey (from Bumble Bees) and Eggs (from a Roost) are food made in the match. In the **Drink phase** that closes each round you may sip your drink once and eat one
  food chip (double-click it on top of one of your stacks); both work from the next turn. Food
  raises Draw, Roll, Bid or the unused-action rewards for a turn or more; some pair a penalty with a bigger bonus
  (a plain Hamburger: +2 Roll, −1 Bid). Bun-Hamburger-Bun eaten from the top Bun is the whole burger. Food on top
  blocks bidding from that stack, and a fee knocks it off.
- **Effect chips made by tricks.** An effect that works over several turns is a chip on the table, put there by the
  trick at the space it aims at and doing its work in that trick's phase each turn until it wears off. You aim a maker
  at the area its chip belongs in: Investment makers at any Meter space with room (empty or not), Insurance and
  Correction makers at a stack they protect or clear; the chips are placed when it plays. These used
  to be sold at the Chip Exchange; an effect a trick can make is not sold. Each has its maker (Investment: Empower →
  Power, Throttle → Control, Load → Boosted, Shave → Cheapened, Tinker → Upgrade (on a Meter space), Charm → Lucky,
  Stow → Nest Egg, Echo → Mimic (on top); Insurance: Cushion → Reducer, Ward Off → Ward, Recoil → Rebound, Electrify →
  Zap, Moor → Anchor, Veil → Transpara, Shade → Shadow; Correction: Attune → Harmony). How many and for how long come
  from the roll total (`make` on the trick in `js/data.js`). Power, Control and Lucky act in the Investment phase,
  Harmony in the Correction phase; the defensive ones when a fee or a move reaches them; Boosted, Cheapened and Upgrade
  when dice are rolled; Mimic after each phase's tricks. An effect chip takes stack height, has no worth and cannot be
  bid; a fee that reaches it, or empties its stack, knocks it off; it never leaves the table with you. The Crown chip
  is retired: Brace makes Hardened chips. Shop chips an old save already owns still go on the table.
- **Made in the match, never sold**: Hives come from the Familiar tilt (one play in three sets a Hive on an empty
  space), Honey only from Bumble Bees pollinating Flowers, Dragon Eggs from a Dragon on its Roost (the Spawner tilt).
- **Bounties**: a creature hovering over a stack soaks the fees that land there, and your Expenses can aim at
  creatures on either side. Once its Debt reaches its bounty (Fairy 25, UFO 50, Unicorn and Dragon 250, Mothership
  500) it is driven off and drops a Bounty chip worth that much; overkill past it goes on to the stack beneath and
  down the lane as usual. The chip can be bid but breaks if any fee reaches it; still on your table when the bout
  ends, win or lose, it pays its worth.
- **Zap** (electric: a fee of 3¢ or less shocks the attacker, a bigger one shorts it out), **Boosted** (+1 to every
  die you roll per chip) and **Cheapened** (−1 to every die your opponent rolls per chip), **Upgrade** (on the Meter:
  each one puts a random die upgrade, good or bad, on every roll for that roll only). Since round 15 these are made by
  tricks (Electrify, Load, Shave, Tinker), not sold.
- **Worm Hole** joins the Calamities (an empty Meter space that pulls chips through to the opponent's side). One in
  two **Spawner** tilts is a **Dragon Roost**: it calls a Dragon every third turn, which nests and lays an egg; while
  the egg sits there no Dragon comes, and a trick totalling 10 or more hatches it onto your opponent.
- Also from the list, sold at the Chip Exchange: **Tree** (Rare; planted on an empty space, grows a chip a turn,
  seeds Flowers around it at full height, and a fee fells it into **Wood** chips that block two fees each), **Sun**
  (Rare; Flowers bloom twice as many Petals, Trees grow twice as fast), **Fibonacci** and **Prime** (Rare; go on top,
  two on each other merge into the next number in the sequence after the larger; the growth is paid on a win).
- Royal Paradise chips (the basic value chips) of 1, 2, 5 and 10¢, unlocked by floor as in the Chip Exchange table.
- Debt, Block, Counter, Opportunity, Gold, Burning, Acid, Shocking, Corrupting, Poison and Boom chips, and Holes.
  Three Expenses leave the newer hazards: Infect (Corrupting), Envenom (Poison) and Rig (Boom). The trick names are
  placeholders.
- Element hazards (not on the list, kept): **Frost** (Cold; its stack cannot be bid or flipped; thaws in 2 turns or
  next to heat), left by Frost; **Lava** (Heat; melts the chip beneath and spills Burning next door; cools in 2
  turns), left by Erupt (Technician). The Orange chip thaws Frost; the Red chip also stops Lava.
- From the chip list, made at the table:
  - **Frozen**: Chill (Insurance) freezes up to the roll total of a stack's chips into one chip worth their sum. It
    cannot be bid or flipped, and cannot be burned, corrupted, shocked or turned into another chip.
  - **Feather**: Float (Insurance, Rascal) feathers the top chip of a stack for a few turns; a fee larger than the
    stack's worth misses it.
  - **Flower** and **Petal**: a Seed on a stack of two or more sprouts into a Flower, which blooms a Petal a turn
    on the stacks around it (one per chip it is rooted in, up to 8).
  - **Clay** and **Brick**: Clay blocks 2 fees and breaks; fire bakes it into Brick with twice the hits.
  - Petals, Flowers, Clay and Brick are **fee instance** defence: on top of a stack, each blocks one entire fee
    when it lands, however big. Block and Counter chips are **fee cost** defence: each takes 1¢ of a fee.
  - **Dynamite**: Fuse (Expense, Technician) lights a stack of sticks on an empty space near its target. One burns
    down each turn; then every chip on the stacks around it is destroyed. Cleansing removes it.
- Shop chips, sold at the Chip Exchange because no trick, tilt or table effect makes them. Each is worth 1¢ (Clay: 0),
  is not wagered, and comes back after a win if it survives. Most go at the base of a stack; Seed and Clay go on
  top. Their price comes from a tier (`CHIP_TIERS`: Common, Uncommon, Rare, Epic, Royal), which also sets the floor
  they are sold from:
  - resists: Red (Burning), Blue (Shocking), Yellow (Acid), Violet (Corrupting), Green (Poison), Black (Boom);
  - from the chip list: Seed, Clay, Tree, Sun, Heli-Chipter, Battery, the electronics (Repeater, Forgetter, Tesla,
    Absorption, Sprinkler), Uranium, Big and Little chips, Spy, Fibonacci and Prime, and food (Chocolate, Chip Chip,
    Dip, Fish 'n Chip, Hamburger, Bun);
  - not on the list, kept: Orange (thaws Frost);
  - moved off the shelf in round 15: Reducer, Anchor, Transpara, Harmony, Power, Control, Ward, Shadow, Nest Egg,
    Rebound, Lucky, Zap, Boosted, Cheapened, Upgrade and Mimic are made by tricks (see **Effect chips made by
    tricks**); Hive, Honey and Egg are made in the match; Crown is retired. `sold: false` and `from` on each in
    `SHOP_CHIPS` say so.
  The numbers each effect reads are in `SHOP_CHIPS[id].vars`. Old saves carry Bumper, Mirror and Fog over to
  Reducer, Rebound and Transpara, and the old Orange chip to the new one.
- Creatures (UFO, Fairy, Dragon, Mole, and from the 5¢ and 10¢ floors Unicorn and Mothership), Familiars, Spawners
  and Calamities (Inferno, House Audit, Black Hole, Volcano, Tornado), used by the tilts.
- Dice are drawn as their solids (d4 triangle, d6 square, d8 diamond, d10 hexagon, d20 octagon) and chips as discs
  with an edge.
- Upgrades are drawn on the upgraded thing: each die upgrade puts its own badge on the die (Accelerate +, Escalate
  ▲, Stabilize =); trick quality is the card's frame (Fine silver, Grand gold, Royal gold with a halo) and each
  upgrade adds a ▲ and a moving foil; a gilded chip turns gold.
- Each table has a felt (`FELTS`) that colours the bout table and the table on the floor plan. The High Roller
  plays on Royal, the doorman and the barfly on House, the Ascent on Paradise. Felts have no board effect yet.

### Arrangements and the newer tricks (**Trick Attributes**, kept in `docs/TRICK-ATTRIBUTES.tsv`)
Corrections that move chips around a position. Forward is toward the Stage, along a lane; up and down are across
lanes. Each acts on the lanes (or rows, for Lift and Sink) its spread covers, and on the whole position with its
bonus. Anchored stacks, Holes, Black Holes, Volcanoes and Dynamite stay put; Debt and hazards stay on their space,
or follow the chips to the nearest stack in the lane, so moving chips never sheds Debt.

| Trick | Class | Moves |
| --- | --- | --- |
| Retreat | Rascal | every chip forward (the workbook's Retreat: "push all chips up to the front") |
| Advance | Hustler | every chip back (the workbook's Advance: "pull all chips back") |
| Lift / Sink | any | whole stacks along a row to the top / bottom lane, closing gaps |
| Bulwark | Technician | defensive: shields (Block, Counter, Petal, Clay) to the front, on top; value behind |
| Stack Up / Stash | any | by value: biggest at the front (small fees only leave Debt) / biggest at the back |
| Expose | Rascal | aggressive, on the opponent: their biggest chips to their front |
| Rout | Technician | aggressive, on the opponent: their shields to the back |

From the attribute sheet's ideas: **Ambush** (Expense, Hustler) is *Swift* and plays with the Investments, before
this turn's Insurance is up; **Vengeance** (Expense) adds every ¢ you paid in fees last turn; **Saturate**
(Investment, Rascal) boosts your other effects and subdues the opponent's boosts (and drains their Power on a match).

### Dice and upgrades
A die has faces, 1 to n to start. The Diesmith sells the workbook's 22 upgrades (from floor 1; Emphasize, Rig,
Enchant, Encase, Rebalance, Gamble, Mirror and Reflect from floor 2; Curse from floor 3). Most change the faces when
bought, on a target face you pick, and the panel previews the faces each one leaves. Temper, Escalate, Gamble and
Curse change how the die rolls. Up to 2 per die; the roll-time ones cannot be taken twice. A die's hover shows its
faces and each upgrade's badge; the rules are in `js/dice.js`.

### The Bluff (fourth phase)
After Bid comes the Bluff. The bids are shown to both Rollers (you see what they bid on, and they see yours); then
every bid trick that needs a target is **aimed at its best one** (most impact, least waste, judged on the table as you
can see it). Tweak an aim by clicking the trick, or its marked target on the table (again to cycle when two share
it), then a new space. Aims stay hidden until the House plays them. The button after Bid reads **Bluff**, and in the Bluff it reads **Play**.

### Reading a trick
A card shows how its total is made under the number: the dice, `+n linger` from the bid (turns × dice), `+n pow`
(Power), Vengeance, `×` quality, `×` last call and `×2` for a doubling bonus. Its hover says the same in words. Once
the bid is paid to the House, the card keeps `paid 1+1¢ · n to go`. Tricks still lingering mark the spaces they
will land on, for both Rollers: blue outlines for yours, red for your opponent's, with the trick's name and turns
left.

### Fees on nothing, and overkill
A fee spreads its overkill as it lands: what a stack cannot pay goes straight on to the stacks behind it in the
lane, so the table shows where every ¢ is headed before the House settles. A fee whose target is gone keeps its
aim (the same lane, or the same space) and lands there as a ghost Debt chip that comes to nothing when the House
settles; overkill with no stack behind shows the same way on the next empty space.

While a phase is on, the parts of the table you cannot use (the Book outside Draw, the Pouch outside Roll, everything
while the House plays) look inactive but keep their numbers and hovers.

### The Drink phase
Each round ends with a Drink phase after the House has played: sip once, eat once, then Next turn. What you take
works from the next turn. If you have nothing to sip or eat, the table moves straight on.

### Effect chips
Every effect, investment and tilt at work on a Roller lies on their table as a flat chip under the stacks: Power,
Boost, Press or Pierce, Bend, Parlay, Enfeeble, Resist, Evade, Reflect, drink and food bonuses, Familiars,
Interventions, the Position tilt, Nests, the Inferno, House Audit and Tornado, and Last call; and since round 15
Subdued (an opponent's Saturate), Enfeebled next turn (Rattle's bonus), and Resist and Evade next turn (Endure's and
Hop's bonuses), so an effect that carries over shows before it lands. Effects that last several turns on a stack are
real chips in the stacks instead (see **Effect chips made by tricks**). A chip's size is the
area it covers, in spaces squared: 1×1 for one thing, 2×2 for every roll effect, 3×3 for the whole position. Chips
only stack with chips of the same size. Help lies in the Meter, harm in the Bar. Hover a space to read the effect
chips lying on it. (Holes, Black Holes, Volcanoes, Worm Holes and Roosts are already space chips; creatures fly.)

### Hover detail
A stack's hover reads top down: the **stack report** (height against its limit, worth, Debt, every chip in it), then
the **top chip**, then the chip **under the pointer**: move the pointer down the space to point at the chips below
the top one (the bottom of the space is the bottom of the stack); that chip lights up on the table. Each chip's
traits are listed as **properties** (key and value, two columns), and only in verbose hovers.

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
- Commitment: Challenge and Cheat tilts switched on or off (each adds or takes its share of the multiplier, and on a
  win the same share of the opponent's worth is paid as a House bounty or taken as a House cut; some open on later
  floors); position planner with spacing and stacking choices; everything left off the table is
  wagered.
- **Tilts are played by the House.** A tilt that is on opens the bout once, then in each House phase from turn 2 the
  House may play it again. Its chance is `base + per × pressure`. A Roller's **pressure** is a weighted mix
  (`TILT_PRESSURE`) of the share of their starting chips paid to the House, the overkill and Meter overflow wasted on
  their side (as a share of their start), how full their Meter is, and the worth sitting in it (as a share of their
  start). Challenges read your pressure, Cheats your opponent's; each tilt chip's hover shows the breakdown. Pressure
  also sets the
  impact: more Holes, bigger creatures, more nests (and faster ones), a second Calamity; more Block chips, more
  Familiars, a bigger Intervention. Position is played at the start only. Each tilt that is on lies on the table
  as an effect chip showing the House's chance this turn.
- Wager ×1.5 at tables, ×3 at the High Roller, capped at ×3. Double Down doubles it up to ×6, keeps the last
  bout's Challenge tilts, drops Cheat tilts, and on a win opens the High Roller and grants a Suite Key Card.

### Winning, losing, leaving (**Winnings**, **Losings**, **Suite**, **Gift Shop**, **Gear**, **Paradise Ascent**)
- Win: surviving chips, your fees restored, the opponent's fees, the wager times its multiplier, the multiplier
  on your deployed shop chips (staked at their shop price), the tilt bounty or cut, a chip per Opportunity chip, Gold
  chips doubled. All of that is kept. Then one prize on top: bonus money (a quarter of the
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
| How strong a tilt is | Set by the bout, not bought: tiers and slot counts are gone; a tilt is on or off. |
| How a bout ends if neither side breaks | "Last call" is an addition: from turn 9 every Expense is multiplied by a factor that grows each turn. At turn 40 the most Worth wins. |
| Debt (the **Debt** tab's five concepts) | "Knocked out by debt": reaching zero Worth loses the bout. |
| Dice upgrades | All 22 from the workbook. They are permanent, including faces that change with use (Rig, Enchant, Encase); only Upgrade chip effects are for one roll. Readings: "fill" moves value into the target (Divide: 1 from every face; Gift: half the highest; Devour: all of the lowest), Boost/Bonk ±2, Rig/Enchant/Encase change with use and reset each bout, Gamble ×2 and Curse ×3 on a random face each roll. Numbers in `DIE_VARS`. |
| Which cards take a wallet slot | Benefit cards and the Royal Card do (Collectables C80: with no room for the Royal Card you drop one of your two starters). Membership, Suite Key, Punch and Paradise are passes and do not. Cards can be dropped from the kit at any time, except the Royal Card before floor 1. |
| Membership Card discount | "Also gives the discount": 10% off at the Trick Trader, not stacking with a Trader Discount Card. |
| Debt chip values | One Debt marker per stack showing the exact amount owed (it used to be split into 5, 2 and 1¢ chips, which read like money). |
| Which dice make the alley roll ("2dn") | Your two largest dice. Big dice are worth keeping for it. |
| Wallet prices | Stats come from the **Gear** tab and prices from the **Gift Shop** tab, matched in order where the names differ. |
| What a flip costs | One roll. The chip is not spent: it comes back to the Meter. |
| Which chips the shop sells | Those no trick, bonus or table effect makes. Chips a trick makes (Gold, Block, Counter, the hazards) are not sold. |
| What a shop chip costs | Its tier's price; the tier is how strong it is meant to feel until it has been tuned. |
| Opponent strength | Generated per floor from the class tables; quality and dice improve each floor. |
| Which chips leave the shop | Those whose effect is an Investment, Insurance, Expense or Correction effect over time (they modify a roll or effect, mitigate fees, or correct the table). The electronics, plants, food, weather, Big and Little chips, resists and Uranium stay: they are things, not effects. |
| An overloaded stack or Meter | Like overkill: the trick plays, what has no room is lost, and a trick that adds chips cannot aim at a full stack. |
| A phase you cannot act in | Skipped on its own, with a line in the feed; unused actions still pay. |
| Dice left in the roll | They must be used: every die that fits a shown trick has to go on one before Roll closes. One that fits nowhere stays in the roll with its value until a trick has room. No effect rerolls yet. |

## Not built yet

- Artifacts and the jacket pocket limits.
- Gift, Identification, Collectable, Roller, High Roller and Ascended cards (Paradise and five Notes are built); cosmetics; the music player.
- Play-by-play sports. Games are settled by a weighted draw from the posted odds. No hedges.
- Themes per opponent, felt board effects, encounter modifiers.
- Most of the 400-entry chip list, the **Effects** element table, Splitting, the Rest conditional.
- Online ladder. The Ascent uses generated legends and your own past builds on this device.
- Saving in the middle of a bout. A reload returns you to the floor before it.

What is needed to build these is listed in `docs/OPEN-QUESTIONS.md`.

## Basic chips

Fifteen value chips: 1, 2, 5, 10, 25 (floor 1 to 3), 50, 100, 250 (floor 4) and 500 to 50,000 (the Paradise
Ascent). Up to 500¢ they are Royal Paradise chips named by value; from 1000¢ the metal and gem chips go by name
(Silver, Ruby, Emerald, Sapphire, Amber, Diamond) with a short face (1K … 50K). The automatic chip mix and the
opponents keep to chips of 10¢ and under unless the worth will not fit in the position, and then use the smallest
bigger chip that fits.

## Round 13: chips over, under and above the table

- **Layers.** A space holds a stack (chips that take height), chips lying over it (Debt, hazards, Hardened, Sticky:
  no height, always on top), Little chips (no height, only Littles go on them), creatures and bees in the flying
  layer, and orbital chips (weather, vehicles) above them. A Big chip or Volcano covers a 2×2 block: the top-left
  space holds the stack, the other three link to it.
- **Hit instances.** Instance shields (Petal, Flower, Clay, Brick, Wood, Tree, Hive, Little, Egg) and creatures take
  whole fees, one hit each. A creature's last hit drives it off; the rest of that fee spills onto the stack beneath.
  Bounties pay 5¢ a hit. The Ghost has no hits; the Ghost Ship has 100 and drops Treasure.
- **Water.** Rain and Sprinklers make Puddles (empty spaces, not playable until they dry a turn later) and wet
  stacks (no burning, electricity passes on, freezing in the cold and in a Blizzard, faster plants). A flooded
  Hole floats Wood.
- **Electricity.** Lightning is the Zap trick's shock, a Zap chip's strike, Shocking chips and a Cloud's bolt.
  Absorption soaks it, a Tesla grabs a strike a turn and sends it back, a Battery gives every electrical or
  electronic chip above it one more instance.
- **Electronics** read the count of chips under them: a Repeater replays your tricks whose dice total that, a
  Forgetter negates your opponent's. A Mimic replays a random trick of each type.
- **Weather** comes with the felt: Oceanic, Frosty and Earthen bring a Cloud, Molten the Sun, Lunar and Galactic
  the Moon, Polar an occasional Blizzard; Frosty and Polar are cold. Calamities add the Tornado (2d6 strength), the
  Blizzard, the B-52 (52¢ Boom chips) and Volcano chips.

## Balance

A first pass, checked by simulation (`npm run balance`). Bouts run about 4 turns in the intro and 7 to 14
afterwards. With the AI playing both sides and no shopping, a Technician clears floor 1 far more often than a
Rascal, whose Bar is the smallest. The numbers that drive this are in `FLOORS` in `js/data.js` and
`genOpponent` in `js/run.js`.

### Tuning pass 1 (from the balance audit)
The audit (`tests/audit/`, report in the project doc "Rolling Paradise balance audit") found floor 2 a wall for
every class and most purchases a net loss, because the purse is both health and wager. Changes:

- **Floor 2 opponents** 80 / 95 / 110, High Roller 160 (were 110 / 135 / 160, 240). This is a stopgap: see
  *Enemy variation* below for the mechanical fix it should make way for.
- **Spending pays back.** Trick upgrades `50 × (1 + q × (up + 1))` (was 100 ×), die upgrades `60 × floor × (1 + n)`
  (was 100 ×), restocks `100 × (floor + restocks)` (was 200 ×), forges d6 60 / d8 120 / d10 800 / d20 2,500 (were
  100 / 200 / 2,000 / 5,000), shop chip tiers Uncommon 80 / Rare 300 / Epic 1,500 (were 120 / 600 / 3,000). Drinks
  scale by floor (×0.2, ×0.4, ×0.7, ×1) instead of jumping five-fold at floor 2. Shop chips you deploy are **staked
  at their shop price**: a win pays the multiplier on that stake (`SHOP_CHIP_STAKE`), the survivors come back, a
  loss takes them.
- **Tilts carry their own reward.** The wager is only what does not fit on the table, and through floor 2 the purse
  fits on the table, so the multiplier paid almost nothing: Challenges were pure risk and Cheats pure help. Each tilt
  now also pays (Challenge) or takes (Cheat) `mult × opponent worth` on a win (`TILT_WORTH_SHARE`). Values: Hazard
  0.25, Creature 0.35, Spawner 0.4, Calamity 0.5; Shield 0.25, Familiar 0.1, Position 0.15, Intervention 0.3. The
  aim is a near-symmetric curve: a Challenge you can cover (a Cheat, or chips bought before the bout) nets a gain; a
  Cheat that your build does not use costs a little.
- **Level 0 jackets are cut for one class**, so the drawback lands on that class's strongest Coin stat (2 → 1) and
  never zeroes a 1: Long → Technician (−Conviction), Leather → Hustler (−Charisma), Bomber → Rascal (−Cunning).
  Leather on Rascal (Charisma 1 → 0) was the worst result in the audit.
- The board stays 5 columns at base. Shrinking it widens the class gap; that question waits on this pass.

### Enemy variation (the real fix for the floor 2 wall)
Every opponent on a floor is the same recipe: a random class, the floor's dice pool, its class tricks plus a few,
and a Bar filled to a worth target. Worth is the only dial, so difficulty can only be tuned by worth, and a floor
feels like one wall. Ways to give opponents their own parameters and abilities, roughly in build order:

1. **Temperaments.** A profile per opponent that sets its AI knobs (the audit's `draw`, `roll`, `bid` plans): a
   *Saver* banks actions, a *Spender* bids every bid, a *Grinder* rolls everything. Same worth, different fights, and
   a reason for the table 2 / table 3 choice.
2. **Shaped positions.** Let worth buy shape instead of only chips: a low-worth opponent on a deep Bar, a rich one
   on a shallow one. `genOpponent` already builds `dims`; add a per-opponent BVD roll on top of the class.
3. **Opponent gear.** Opponents wear a jacket, drink, and carry a few shop chips (Clay, Little, an element chip),
   read from the same tables the player shops from. This makes the shop chips' counters matter from both sides.
4. **Signature tricks and named regulars.** The names in `OPPONENTS` are a cast: give each a signature trick or chip
   (a Phishing Email taxes, a Piggy Bank saves Nest Eggs), so learning them is part of play.
5. **Opponent tilts.** The House could tilt the opponent's side too (a Familiar for them, Hazards for them),
   visible at the table before you sit down.
6. **Friendly creatures.** Cheats currently remove risk (Shield, Familiar) but there is no creature that works for
   you. A friendly creature Cheat would mirror the Creature Challenge, so the two can be balanced against each other.

With (1) to (3) in, floor 2 worth can go back up toward the old curve, and difficulty comes from who you sit
down with rather than how much they hold.

