# From the workbook to the game

The design workbook ("Rolling Paradise Pair of Dice") has 33 tabs written over time, and several of them describe
the same system at different stages. This file records which reading the game uses, what was simplified, and what
is not built yet. Tab names are in **bold**.

## What is built

### Rollers (**Rollers**, **Position**)
- Three classes with the workbook's numbers: Trickery / Ingenuity / Proficiency (draws, bids, rolls per turn),
  Charisma / Cunning / Conviction (reward per unused draw, bid, roll), Balance / Versatility / Depth (stack
  height, Bet rows, Stake rows on a base of 3 / 2 / 3, five columns).
- Starting dice per class. Class deployment: Technician from the front, Hustler from the back, Rascal centred.

### The bout (**Bout**, **Plays**, **Effects**, **Tricks**, **Targeting**, **Game**)
- Goal: deplete the opponent's Worth before they deplete yours.
- A turn has four planning phases, then the House plays it (see **The turn** below). Draws, rolls and bids left
  unused are **held** when their phase is passed (nothing goes on the table yet), and the House **deploys** them in
  their own phase at what Charisma, Cunning or Conviction is worth then: unused rolls as **Power chips** with the
  Investments, unused bids as **Opportunity chips** with the Insurances (chips at random Bet spaces with room, lost if
  it is full), unused draws as a **Steal** from the Stage with the Expenses. All added Power is Power chips on the Bet,
  one per point (Stir, an Investment trait, a Boost or Press bonus too): the same Power chip Empower makes. Each adds
  +1 to your roll effects for the turn (in the Investment phase, or at once if it arrives during play) and lasts that
  turn; nothing spends it. Both sides' chips appear when the phase closes, so you see your opponent's build up. Each step pill says
  in its hover what passing it gives; once passed it shows ✓ (all used) or what it kept.
- A trick has a Roll effect and a Bonus; there are no Traits. It plays once **bid on**: its total is the value of the
  chips bid on it plus the dice put on it in the Bluff (any number, only on a trick bid on this turn, all one size:
  the first real die sets it; no size is required), plus
  Power and the like, times quality and print. A bid with no dice plays the effect at the bid's value. The Bonus
  reads the trick's first `count` dice when they are its own size (a flipped chip joins any size), its condition met,
  matching class only; the card shows them as pips in the Bonus line.
- Effects resolve in the workbook's order: Investments, Insurances, Expenses, Corrections.
- Bids go to the House. A trick **lingers** only by **stacking copies**: drawing a copy of a trick already shown (same
  trick and quality; any print or condition) puts it on top (Shift-click draws it apart, to aim elsewhere). One bid
  plays the stack: the top copy this turn, then a copy a turn with the same roll and target, each with its own print;
  each copy taps as it plays, and the last taps with the dice.
- Fees go out as Debt on the target stacks, then the House settles them (see **Debt** below).
- Both Rollers' tricks in a phase are played together, with one exception: when both Rollers' tricks in a phase reach
  the same space, the space's **owner** plays there first and that trick resolves before the other one (which may then
  find its chips gone and fizzle or land elsewhere). Power, Boost and the like are read as they stood when the phase
  was called.
- **Creatures are a third hand.** Each creature has a type (`CREATURES[kind].type`: UFO, Mothership, Dragon and Ghost
  Ship are Expenses, Fairy, Unicorn and Mole Corrections, the Ghost an Insurance) and acts in that House phase after
  both Rollers have played theirs, so a trick aimed at a creature or its stack lands first. New creatures arrive in
  the House's last phase and act from the next turn.
- The Stage is shown as stacks of chips in front of the House. The winner takes the whole Stage.
- Targeting approaches (front, rear, flank, body, any, meter) and distributions (Hit, Swipe, Poke, Hook, Drop,
  Burst, Wave, Aura, Rain) with the workbook's minimum / increment / maximum space counts.
- 26 tricks across the four types, named from the trick lists.
- Flips: the top standard chip of a stack can be picked in the Roll phase alongside dice. It lands as 0 or its
  worth, counts as a die of any type, uses a roll, and returns to the Bet when the trick has played (or when the
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
Both Rollers go through the same four phases: Draw, Roll, Bid and the Bluff. A phase closes for both at once, and
closing it ends that kind of action for the turn.

| Phase | What you do | Required before it closes | Closing it means |
| --- | --- | --- | --- |
| 1 · Draw | Click tricks in the Book to show them on the Run, up to Trickery. | At least one draw. | No more draws this turn. |
| 2 · Roll | **Pick** dice from the Pouch, and top chips to flip, up to Proficiency. Nothing is thrown yet: the button reads **Bid**, and its hover says how many dice will be rolled. | At least one pick. | The picked dice are **thrown as the Bid opens**, for both Rollers at once, so both bid seeing both rolls. |
| 3 · Bid | Click your stacks to pick up a **hand** of chips (click a stack again for the chip under its top one), up to your bids left (Ingenuity), then click a trick: the whole hand is bid on it at once, one bid per chip. Or click a trick (or the **+** ring on its
bid pile) first: then each stack you click bids its top chip straight onto that trick. A trick's bid chips stack in a
pile, like a stack on the table, with the BID ring riding on the top chip as a **+**; the roll breakdown sits beside
the pile. Click the pile to take its top chip back. Dice are not placed yet: the roll waits beside the Pouch. A trick that already has a bid can take another; its BID slot becomes a **+** after the chips already on it. | At least one bid. | The bids show; the Bluff opens. |
| 4 · Bluff | **Place** the rolled dice on tricks (the existing click-a-die, click-a-trick placement; move them freely), and confirm where bid tricks aim: each is aimed at its best target, and placing dice re-aims the ones you have not aimed by hand. | Every die in the roll that fits a shown trick on one. | The House plays the turn. A die with nowhere to go **stays in the roll**, keeping its value, until a later turn's trick has room. |

- The button that closes a phase is named for what comes next: **Roll** (done drawing), **Bid** (throw the picked
  dice and bid), **Bluff** (done bidding), **Play** (commit the turn). It also carries what passing keeps (`keeps 2¢
  steal`, `keeps +3 power`, `keeps +1 opp`) or `✓ all used`.
- **The opponent's roll shows during the Bid** (a "Their roll" row in their Run). Where they put their dice and aim
  shows only once the Bluff is over, as the House plays.
- **You see the other Roller's move in a phase only after you lock in yours.** The opponent makes its move for a
  phase when you lock it in, working from your table as it stood when the phase opened, so neither side sees the
  other's choice before making its own. The feed then posts what they did ("Low Ball rolls 3 + 4 onto Charge").
- Rolling is **one throw a turn**. Undo in the Roll phase drops the picks; once thrown, the values stand. Undo in the
  Bluff takes dice off tricks and back into the roll (and re-aims), never the throw. Undo in Draw or Bid takes back
  that phase only.
- **The hand.** What you pick up rides with the pointer and dims where it lies: dice from the Pouch (and top chips to
  flip: click a viable top chip, no button) up to your Roll, chips to bid, rolled dice to put on a trick. Click the
  roll to throw the handful (the same as pressing Bid), a trick to bid the chips or put the dice on it. What moves
  starts from the pointer and settles softly. Chips picked up to bid **stack** in the hand; each click on a trick
  bids one (the top), into the empty bid pile space on the card. While you hold chips, clicking a bid pile bids one
  more instead of taking one back. There is no other way to bid (no BID button). Nothing is picked for you in the
  Bluff, not even the first die. **Right-click lets go** of everything in the hand (with nothing in hand,
  right-click still switches verbose and concise hovers).
- **Click to undo**, until the phase is locked in: click a trick drawn this turn to put it back in the Book, a die on
  a trick to take it back into the roll, a chip bid this turn to take it back to the stack it came from, a picked
  die or chip to drop it from the throw, a stack in your hand to let it go.
- **A phase you cannot act in is skipped on its own**: nothing to draw (an empty Book, no draws), no room or nothing
  to roll, nothing to bid on or with, nothing to aim. The feed says so. A whole turn can pass this way, and the
  draws, rolls and bids left unused still pay their rewards.
- The limits are shown where they apply: the roll (`thrown 2/3` against Proficiency, and what is left in it), the steps (draws,
  rolls and bids left), and a stack (`4/6 high`, **full** when it is). The Run has no limit.
- A requirement is waived when it cannot be met: an empty Book, no shown trick with room for a die, no die or
  flippable chip, or no chip you could bid without going broke. A bid can never spend your last chip.

### Tapping, restoring and occupancy
Words: a space is **occupied** with at least one chip (**filled** means its stack is at full height; no rule checks
that yet). On the table a **column** is one depth line of the Bet or the Stake (`r` in the engine) and a **row** is a
lane (`c`). Columns vary with Versatility and Depth; rows are always 5.

- **Tapping.** A trick that finishes playing, and the dice on it, **tap**: they go to the tapped piles instead of the
  Book and the Pouch, and cannot be drawn or rolled until restored. Flipped chips still come back to the Bet.
- **Restore at the end of each turn.** One trick per occupied Bet column, one die per occupied Stake column. An empty
  Bet restores no tricks; an empty Stake no dice. Order: the one tapped longest first (stamped per action, so
  everything that taps together ties), then for tricks the phase the trick belongs to, worse quality, basic before
  exotic prints; for dice smaller before larger, plain before fancy; then the one you got first.
- **Live preview.** `restorePlan` is read after every action: tapped tricks show under the Book and tapped dice after
  the Pouch, ringed **RESTORES** when the end of the turn would bring them back as the board stands now. The Restore
  badge counts them.
- **Charisma, Cunning, Conviction are earned by occupying rows.** They have no class base. A chip in every row of
  the **Stake** earns +1 to the class's own (Hustler Charisma, Rascal Cunning, Technician Conviction); a chip in every
  row of the **Bet** earns +1 to all three. A zone counts on its own (its five rows can't be split between the Stake
  and the Bet). Both together: 2 / 1 / 1, the 2 on the class's primary C. **Focus** in both zones (each zone's rows all
  held by one of its columns) adds +1 more to the primary and +1 more to all three: 4 / 2 / 2. Focus in one zone alone
  earns nothing extra. Otherwise they are 0, plus whatever a jacket, food or a sip adds for as long as it lasts. Amounts in `TUNING.occupancy`. Read live, and again when the House deploys.
- There is no Fully Occupied Bet bonus any more: more columns held is still how more tricks and dice restore.
- **Meters on the position.** Under each zone of each position, by its label: a dot per row (lit when held, with what
  holding them all earns) and a bar per column (lit when held: each restores a trick on the Bet, a die on the Stake).
- **Stat display.** A step pill (and the opponent's pills) shows the stat as it stands this turn, in the
  temporary-change colour with ▲ or ▼ when food, drink or a Curse changes it. The hover splits it into
  class base (for Charisma, Cunning and Conviction: what the rows earn now), gear (jacket, cards, the run) and each temporary change with its source.

### Chip lifetimes (Gameplay tuner)
The tuner's **Chip lifetimes** set how long the chips the table makes stay (`TUNING.chipLife`): Opportunity, Bounty,
Block and Counter chips last **until paid away** (as before), **this turn** (gone at its end), or **the whole match**
(fees pass them by and they cannot be bid). Chips from the chip maker keep their own `lasts`. Whatever the lifetime,
every chip with a value counts toward Worth and is counted back when the match ends (made chips with a value included).

### Overload
A stack holds `3 + Balance` chips. When it is full:
- A trick that adds chips to the stack it aims at (Block on the Bet, the maker tricks, Foretell, Conjure, Hand Off)
  cannot aim at it: while aiming, full stacks are marked **FULL**.
- Chips that would land there anyway (a Block trick's chips spilling past a full Bet, the Shield tilt, Opportunity
  chips, a maker's spread onto a full neighbour) are **lost**: the trick plays, the feed says how many
  had no room, and nothing extra is added. This **Bet overflow** counts toward the pressure the House reads for its
  tilts.

### Debt
A fee is paid in whole chips, from the top of the stack it lands on. The rule, in the order the House applies it:

1. Block and Counter chips on top absorb 1¢ each.
2. The top chip is paid to the Stage if the Debt covers its whole value; repeat with the next chip.
3. What cannot cover the next chip stays on that stack as **Debt**: a red marker showing the exact amount, with
   a tag such as "3 of 5¢" (a 3¢ Debt chip on a 5¢ chip). It already counts against Worth and blocks bidding from
   that stack. Later fees are their own Debt chips: they do not add to it.
4. Nothing moves on to another stack: there is **no overkill**. A chip goes only where it is laid, by its own rules
   and the trick's (lump sum: one chip; other formations and spreads: several). What a stack cannot pay stays on its
   space, even once the stack is gone, and takes a chip it can cover as soon as one comes there. A space is worth its
   chips less what is owed on it, and never less than nothing. A Hardened stack pays one chip per fee.

Worked example (this is checked in `tests/phases.mjs`): a stack of 5, 5 and 1 (top) takes a 14¢ fee. The 1, 5 and 5
are paid (11¢); the stack is empty, and the 3¢ still owed stays on its space. The stack behind is untouched.

How this is shown:
- While aiming an Expense (or hovering a bid one), every stack it touches shows the forecast: gold **−n** paid,
  red **n owed** left as Debt. The
  forecast runs the House's own settle on a copy of the table, so it matches what happens unless the other
  Roller's tricks change the table first.
- Worth shows what is owed beside it; each indebted stack carries its "x of y¢" tag; the stack tooltip states the
  rule and how much more Debt takes its top chip.
- When the House settles, the feed lists the chips paid and where the rest went, for example "Low Ball pays 11¢
  (1 + 5 + 5) to the Stage: 3¢ stays as Debt."

### Chips (**Chips**, **Shop**)
The chip list from the workbook is kept in `docs/CHIP-LIST.tsv`; chips built from it name their row (`list`). The list
is additive: chips the game had that are not on it stay in the game.
The Library's **Chip list** tab shows all 97 rows with a status (built, partly built, needs detail) and, for
the ones that cannot be built yet, what is missing; `docs/CHIP-STATUS.md` is the same list as a document.
- **Resist chips**: a card with `resist` lays one at the base of a front Stake stack each bout and it deters fees
  under r¢ on it. The Resist Cards themselves are retired; this kind of feature is to come from High Roller
  business cards.
- **Food** (Chocolate, Chip Chip with Dip, Fish 'n Chip, Hamburger and Bun) is sold at the Chip Exchange and goes on
  top of a stack; Honey (from Bumble Bees) and Eggs (from a Roost) are food made in the match. In the **Drink phase** that closes each round you may sip your drink once and eat one
  food chip (double-click it on top of one of your stacks); both work from the next turn. Food
  raises Draw, Roll, Bid or the unused-action rewards for a turn or more; some pair a penalty with a bigger bonus
  (a plain Hamburger: +2 Roll, −1 Bid). Bun-Hamburger-Bun eaten from the top Bun is the whole burger. Food on top
  blocks bidding from that stack, and a fee knocks it off.
- **Effect chips made by tricks.** An effect that works over several turns is a chip on the table, put there by the
  trick at the space it aims at and doing its work in that trick's phase each turn until it wears off. You aim a maker
  at the area its chip belongs in: Investment makers at any Bet space with room (empty or not), Insurance and
  Correction makers at a stack they protect or clear; the chips are placed when it plays. These used
  to be sold at the Chip Exchange; an effect a trick can make is not sold. Each has its maker (Investment: Empower →
  Power, Throttle → Control, Load → Boosted, Shave → Cheapened, Tinker → Upgrade (on a Bet space), Charm → Lucky,
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
  500) it is driven off and drops a Bounty chip worth that much; what is left of the fee goes on to the stack beneath it and
  down the lane as usual. The chip can be bid but breaks if any fee reaches it; still on your table when the bout
  ends, win or lose, it pays its worth.
- **Zap** (electric: a fee of 3¢ or less shocks the attacker, a bigger one shorts it out), **Boosted** (+1 to every
  die you roll per chip) and **Cheapened** (−1 to every die your opponent rolls per chip), **Upgrade** (on the Bet:
  each one puts a random die upgrade, good or bad, on every roll for that roll only). Since round 15 these are made by
  tricks (Electrify, Load, Shave, Tinker), not sold.
- **Worm Hole** joins the Calamities (an empty Bet space that pulls chips through to the opponent's side). One in
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
- **Space size.** A position's columns are at most `SPACE` wide (46, in `js/ui/boutview.js`); a side with more
  columns shrinks them to fit (13 a side fits without touching the Pit), and its chips shrink with them, keeping the
  same share of a space.
- Dice are drawn as their solids (d4 triangle, d6 square, d8 diamond, d10 hexagon, d20 octagon) and chips as discs
  with an edge. A die's shape alone says its size; its colour and finish come from its material (`MATERIALS` in
  `js/content/dice.js` gives the colour, the `.m-*` skins in `css/style.css` the finish): Plastic matte, Glass clear,
  Metal brushed, Sparkling glittering gold, Glimmering pearly, Swirling marbled, Diamond prismatic, Bone flecked ivory.
  Cast dice show a drop for each dye on their lower left.
- Grab any die, anywhere (a match, the Library, the shops, the Diesmith), and drag to spin it: it lifts out as its real
  3D solid with every face's value on it (`js/ui/solid.js`, `js/ui/spin.js`). A spin is never a click and hides the
  hover. Thrown dice tumble as the same solids and land with the rolled face up.
- In a match the Book and the dice (the Roll and the Pouch) fold to thin spines outside the steps that use them, and
  the Run takes their width. A spine shows what is inside; click it, or press B or D, to peek.
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
After Bid comes the Bluff. The bids are shown to both Rollers (you see what they bid on, and they see yours). You put
the rolled dice on tricks here; every bid trick that needs a target is **aimed at its best one** (most impact, least waste, judged on the table as you
can see it). Tweak an aim by clicking the trick, or its marked target on the table (again to cycle when two share
it), then a new space. Aims stay hidden until the House plays them. The button after Bid reads **Bluff**, and in the Bluff it reads **Play**.

### Lit and spent
A trick bid on is **lit**: it is going to play, so its edge becomes a neon tube in its type's colour, struck on with
the signs' flicker (and a soft buzz), a brighter stretch chasing round it, its glow breathing; the dice on it glow in
the same colour. When the phase it played in is over it is **spent**: its tube flares and throws sparks (off the card
and each of its dice), buzzes out, and the card and its dice grey. They stay so until the House taps them, then slide
to the tapped piles: yours to under the Book and after the Pouch, your opponent's to their Book and Pouch. A stack's
played copy slides off the same way as the next copy lights on top. Nothing moves for reduced motion.

### The title sign
The sign is drawn from the design's own pieces (`assets/title/*.svg`: ROLLING, Paradise, the s, the palm, the two dice,
each with a `-glow` twin that gives its blur). `tools/title-sign.py` cuts them into tubes and writes
`js/content/titlesign.js`; `js/ui/titlesign.js` draws every tube as its dark glass with the lit tube over it.
It lights one way, a tube after another: ROLLING a letter at a time, one die then the other, Paradise a run of joined
script at a time (P, ar, a, di: outlines that touch are one tube and come on together), the s with the swash and the
palm's trunk as the one tube they are, the e, then the fronds in a sweep. A tube comes up once with a short warm-up;
nothing flickers on the way on. Lit, each tube breathes and now and then buzzes (a quick shiver of brightness) on its
own clock; the sign never blinks as a whole. Left idle for 40 seconds it fades down, last lit first,
and lights again.

### Negative value
Negative value is a chip parameter, set in the chip maker like any other. A chip that has it owes: it sits on its
space as a marker under its own name and colour and counts against that space's worth. **Debt** is one such chip
(just a name): the one an Expense lays, worth the fee. The chip does the work, never the trick. The trick only lays
it, in the formation and spread the trick names; that is the only way a chip gets anywhere.
- It is paid by the chips its **reach** covers (Debt: the chip under it, from the top down; another chip may reach the
  stacks around it, its lane, chips of a name...). A chip pays only whole, and only if it is worth no more than what
  is still owed: a bigger chip is never broken for change.
- It stays where it was laid until it is paid off, then it is gone.
- Each stands alone, worth what it was laid as: chips that owe do not add up on a stack. Only chips stuck together do
  (a made chip with the sticky trait, or a gummed stack): same-named ones become one chip worth their sum.
- A space is worth its chips less what is owed on it, never less than nothing.
- A made chip with a negative value is laid one chip an instance at its own value (lump sum: one chip), as any made
  chip is; Debt is worth the instance, as Royal Paradise chips are.
- Hazards are their own chips and do not owe by default: they hit (chips broken or lost, and a broken chip's value is
  lost with it). Only a hazard that says so lays Debt: today Shocking, Corrupting, Poison, Boom and Doom chips and
  the Audit calamity do.
One function pays every such chip (`reachPays`, bout.js); `tests/debt.mjs`.

### Reading a trick
A trick in the Book shows the chip it makes (or what stands for its effect: Debt for a fee, the hazard an element fee
leaves, the effect chip a maker places) beside its name, and its Bonus requirement as a gold ★ badge: how many dice of
which size. Book cards are a little taller for it. A card shows how its total is made under the number: the dice, `+n bid`, `+n pow` (Power), Vengeance, a Misprint's
changed value, `×` quality and foil, `×` last call and `×2` for a doubling bonus.
A Grand or Royal card shows its quality die (`d10:7`): red when it is a dud, glowing when it is hot. Its hover says the same in words. A stack
shows `⧉ ×n` by its name and the copies under it as a shadow. Tricks still lingering mark the spaces they will land
on, for both Rollers: blue outlines for yours, red for your opponent's, with the trick's name and copies left.

### Fees on nothing
A fee whose target is gone keeps its aim (the same lane, or the same space) and lands there as a ghost Debt chip that
comes to nothing when the House settles.

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
only stack with chips of the same size. Help lies in the Bet, harm in the Stake. Hover a space to read the effect
chips lying on it. (Holes, Black Holes, Volcanoes, Worm Holes and Roosts are already space chips; creatures fly.)

### Hover detail
A stack's hover reads top down: the **stack report** (height against its limit, worth, Debt, every chip in it), then
the **top chip**, then the chip **under the pointer**: move the pointer down the space to point at the chips below
the top one (the bottom of the space is the bottom of the stack); that chip lights up on the table. Each chip's
traits are listed as **properties** (key and value, two columns), and only in verbose hovers.

Right-click anywhere to switch every hover and the table prompts between verbose (rules spelled out) and concise
(just the facts); the choice is remembered. A card, jacket or drink lists each attribute it changes, your value
before and after, and what one point of it does. Dropping a card says what you lose. Hovering the BET or STAKE label
of either Roller explains its size: depth (2 or 3 base rows + Versatility or Depth), width (5 lanes for everyone)
and stack height (3 + Balance), with where each bonus comes from.

### Music
The lounge band (`tools/jazz`, rendered with FluidSynth and the GeneralUser GS General MIDI soundfont to
`assets/music`, listed in `js/content/music.js`) plays 24 original tunes: eight kinds of Vegas jazz (lounge swing,
bossa nova, showroom big band, ballad, jazz-funk, jump blues, smooth jazz, soul-jazz organ), three tunes each.
`setlist.py` gives each kind its charts, feel, rhythm section and the voices that lead and answer; `story.py`
composes each tune as a conversation between two voices built from one 2-bar motif:
- the motif is a rhythm cell and a contour, and no two tunes of a feel share a cell. A cell is not boxed into its
  two bars: it may start with a pickup in the bar before, or late, and may end pushed over the barline (a long note
  on an offbeat belongs to the chord it pushes into).
- the head: the lead states the motif, the second voice answers it (inverted, in its own register, from where the
  lead stopped), the lead sequences it up a step, and both close the phrase together in harmony; the answer has the
  last word, leading back to the top. The bridge develops a fragment of the motif, traded between the voices.
- the solos grow out of the tune: each opens by quoting the motif, develops it, runs lines over the changes (aimed
  at the chords' guide tones and reached by an enclosure or a half step, with an arpeggio now and then) as it climbs
  to a peak about two thirds through, louder and higher, and comes home on the motif's fragment.
- then the voices trade phrases, each picking up the tail of the last, building to a peak and settling. The big
  band instead ends its trading with a shout chorus: trumpets and trombones on the motif in four-part block harmony,
  the drums crashing each phrase in. Its section also kicks into every fourth bar of the head, set up by the drums.
- the out-head is played in harmony, and the coda lets the motif out slowly over the tonic, with a ritard.
The players listen to each other (`engine.py`): a comping chord or a bossa bass note on the "and" before a change
plays the chord it is pushing into; a swing head is played "in two" until the bridge, then the bass walks; a line is
one player's (a pickup cuts the note before it short) and in swing a quarter note inside a line is played short; and
the rhythm section's dynamics follow the story (back under the head, building through the solos, full for the shout
chorus, out on the last head).
Consonance is a rule, not luck: strong-beat notes are chord tones (no 4th over a major or dominant chord), passing
notes are scale steps leading to the next chord tone, a harmony voice sits a 3rd or 6th under the lead, the comping
drops any voice a half step under the melody or above it, and the walking bass steps off a half-step rub with a
held melody note. The dissonance left is chosen: suspensions held over a chord change that resolve down a step,
and dominant colour on the way home. Struck and plucked instruments (piano, vibraphone, guitar, Rhodes), which
sound real from samples, carry the melodies and solos; horns answer from further back in the room.
The mix (`render.py`) keeps the band's dynamics: a light compressor and one gain per tune to -20 LUFS, the drum kit
brightened, the rumble under the bass's lowest note filtered out. The player shuffles the set so no kind of jazz
follows itself, and shares the tune's key with the sound effects.

At a table the band plays the floor's bout loop (`tools/jazz/loops.py`, `js/content/loops.js`; each floor's tables
and its High Roller have their own): 16 bars written by hand, in six layers the game mixes live (`js/ui/music.js`):
- **base**, the groove, always;
- **theme** and **alt**, two tunes over the same changes on different instruments. Each time round the band plays
  one of them or neither (`TURNS`: theme, theme, alt, rest, theme, alt, alt, rest), handed over on the bar line, so a
  long bout does not hear one melody on repeat;
- **drive**, the full kit and the horn section (backgrounds that answer in the tunes' gaps, or hits), faded in as
  either Roller's Worth runs down;
- **peril**, when *you* are close to broke: toms, a heartbeat, brass stabs, and tremolo strings that climb a step a
  bar through each bar's chord;
- **surge**, when your *opponent* is: handclaps, tambourine, crashes and a brass riff. Losing and winning do not
  sound alike.
The layers are levelled against the groove so each is heard arriving. The lounge band fades out as a loop comes in
and eases back in after it has died away. The floors' tempos: tables 138, 172, 116, 100, 120; High Rollers 112, 176,
152, 108, 130.

### Sound
Every step of play is heard (`js/ui/sfx.js`). The sounds are real instruments: short samples rendered from the
FluidR3 soundfont by `tools/sfx/render.py` (`assets/sfx`: piano, Rhodes, nylon and jazz guitar, upright bass,
muted trumpet, flute, horn, strings, harp, and a jazz kit's brushes, ride, rim, wood blocks, castanets, claves,
shaker, tambourine, triangle and hand drums), pitched to the key **and the mode** the band is playing in
(`musicKey`, `musicMode`; each tune and loop lists its mode) so they sound as harmony inside the music: over a minor
tune a sound's 3rd, 6th and 7th are the minor ones, over a blues its 7th is flat. A gesture of several notes keeps
its shape in every key (a falling line always falls). The table itself is clay and wood: chips clack (castanets),
dice knock (wood blocks), cards slide. Everything passes a limiter, so a busy moment cannot clip.
- Your actions, stage by stage: a soft touch on a control (the table's own pieces have their own sounds instead); the
  pick-up (a guitar note); each step (a die set on a trick, an aim chosen on the harp); the result: a piano chord
  when a phase is locked in, the same low bass note twice with a wooden tick when something is refused (it does not
  resolve), a falling guitar pair for undo. Doing the same thing again straight away climbs a pentatonic scale, so
  four dice set down are a run. A bout opens on a brush and a soft chord; a new turn on the ride and a swish; the
  last turn adds the horn's call; a die of yours on its top face rings.
- What happens is heard at its size: a fee lands as a knock and the bass, with the kick under it from 3¢ and the
  room from 8¢; a shield taking it is a knock that goes nowhere; what could not be paid is written down as Debt on
  the low horn; a payout cascades a clack a chip; chips lost for want of room clatter away. A win is a piano and
  strings chord at a table, with the horn and chimes for a High Roller, and everything for the top of the Ascent;
  a loss is a falling muted trumpet.
- The opponent's moves are heard as they are shown, from the right of the stereo field (yours sit left).
- The House's plays have the voice of their type: Investments rise on the Rhodes, Insurances thud (bass, kick and
  brush), Expenses are called on the muted trumpet, Corrections strum across the nylon guitar; misses, bonuses,
  hazards (a warning on the horn) and creatures (a flute trill) have their own. An element trick is played on the
  instruments too: fire crackles (dry wood ticks over a slow brush), lava rolls (slow low drums), a shock buzzes up a
  half step, frost rings the triangle, acid fizzes (a quickening cabasa), Boom thumps, poison creeps (a low tritone
  on the muted trumpet), corruption is a low minor 2nd. Only a card's slide and a neon tube's sparks are noise.
- The board's own movements: made chips appear with a triangle and land with a clack, chips pushed across the
  table rustle.
- Away from the table: the purse clinks out or in at the size of the sum (shops, bets, tips to the band), the
  settlement is counted out chip by chip, the harp runs up the scale on the way to the next floor, and the band sees
  a run out.
`tests/sfx.mjs` checks that every sound the game asks for exists, that every sound and sample is used, and that
every element and type of trick has its own. The 🔊 button beside the music's ♪ turns them off.
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
- Trick Trader: one trick per class plus one generic (Excellent condition), restock, foil packs, sell (or trash a
  Poor trick), Membership Card after five purchases, Secret Shelf. Tricks are no longer upgraded.
- **Prices and stock, floor by floor** (`content/shops.js`, Build mode's **Shops** section): every shop has a stock
  for each thing it sells on each floor, in a run (chips, dice, shelf tricks, foil packs, drinks); what you buy is gone
  until the next floor. Prices are set per floor too (a multiplier, or the price itself), and any shop chip can set
  its own price and stock for a floor. The Shops section shows what each shop sells on each floor, at what price and
  how many. The **Casino door** page sets the door bout (your chips, the Doorman's) and the welcome stake: the
  starting worth for any Roller that does not set its own, and whether the Doorman's fees are added to it.
- **Cards** (`content/cards.js`, Build mode's **Cards** section) are kinds with numbers, and their rule is written
  from them: **discount** (a percent off at one shop), **punch** (a punch per purchase or per floor you buy there; a
  full card makes the next item, or a named one, free), **membership** (a shop's stock opens floors early, its
  members-only items appear (chips, drinks, the Trader's secret shelf), a percent off; earned by buying a number of
  things there on one floor), **Suite Keys** (one per floor, won with a Double Down, clipped to the lanyard like a
  pass), **notes**, **trading cards** and others. Each is printed from its `look`: two background colours, a
  pattern, a border, edge symbols, a big symbol, ink and font, the neon signs' options as print. The Dodgy Corner
  finds one card you don't hold by each card's weight (and a weight for nothing). The Paradise Card is gone (beating
  the last High Roller is the way into the Paradise Ascent) and so are the Resist Cards. The High Rollers' business
  cards (their traits) are listed in the Cards section too.
- Lounge: the drink list with sips; buy, or play the barfly for it once per floor.
- Sports Book: the seven sports, the odds table, one bet per game, settled while you are at the table.
- Commitment: Challenge and Cheat tilts switched on or off (each adds or takes its share of the multiplier, and on a
  win the same share of the opponent's worth is paid as a House bounty or taken as a House cut; some open on later
  floors); position planner with spacing and stacking choices; everything left off the table is
  wagered.
- **Tilts are played by the House.** A tilt that is on opens the bout once, then in each House phase from turn 2 the
  House may play it again. Its chance is `base + per × pressure`. A Roller's **pressure** is a weighted mix
  (`TILT_PRESSURE`) of the share of their starting chips paid to the House, the Bet overflow wasted on
  their side (as a share of their start), how full their Bet is, and the worth sitting in it (as a share of their
  start). Challenges read your pressure, Cheats your opponent's; each tilt chip's hover shows the breakdown. Pressure
  also sets the
  impact: more Holes, bigger creatures, more nests (and faster ones), a second Calamity; more Block chips, more
  Familiars, a bigger Intervention. Position is played at the start only. Each tilt that is on lies on the table
  as an effect chip showing the House's chance this turn.
- Wager ×1.5 at tables, ×3 at the High Roller, capped at ×3. Double Down doubles it up to ×6, keeps the last
  bout's Challenge tilts, drops Cheat tilts, and on a win opens the High Roller and grants a Suite Key Card.

### Text: rules from the data, flavour as a default
Words that state a rule or a number are written from the data, so changing a value changes what the game says about it:
a class's strengths (`classRule`: the actions it has most of, the position stat it leans on, where it deploys), a
Resist Card's r, a High Roller's trait, a trick's Bonus badge, wallet capacities. Lists of things are shown as the
things themselves (trick tags with their own hovers), never as a comma-separated string: the Class maker picks tricks
from a menu and sets dice by count, opponent hovers and previews show trick tags, the Book spine and ledger hovers too.
What the data cannot say is the colour: every class, trick type, trick, chip, shop chip, creature, weather, calamity,
tilt, felt, drink, jacket, wallet, card, pass, die material, die upgrade and opponent starts with a line of flavour in
`js/content/flavor.js` (table `FLAVOR`, editable in Build mode; the makers have a Flavour field), shown in italics in
its hover.

### Redistribution, Settle and Stir
- Chips an effect puts on the Bet go front to back, left to right, the same for every Roller: a class's deployment
  shapes only its own starting position, never the outcome of an effect.
- **Settle** aims at a space of your own position. In that column of that zone (Bet or Stake) it clears Debt and
  hazards up to the total, then gathers the column's chips into full stacks starting at the targeted space and
  filling outward from it, biggest chips nearest. Anchored stacks, Holes and big chips stay; what cannot fit goes to
  the Bet.
- **Stir** makes a Stir chip: a 3×3 flat chip (no stack height) that slips under the stacks where it lands. When made
  it hands out the roll it was made with, 1¢ at a time, round the value chips lying on it, and it is gone at the end
  of the turn. Any made-chip trick can set the chip's width, a flat thickness, and whether a wide chip slips under
  stacks (`roll.foot`, `roll.flat`, `roll.slip`, in the Trick maker); the chip maker's reach has *Chips inside it*.

### Trick quality and Bonuses (Trick maker)
- A trick has no "lasts N turns" setting (its made chips have their own life, from the chip). The *Linger* Bonus is
  gone; lingering is only ever by stacking copies.
- **Quality level**: left on *Auto*, a trick shows a level rated from its traits (`D.rateTrick`: the average of its
  Bonus dice, how far its deployment reaches, and how hard its Bonus condition is), Common to Royal. Set a level
  (`q`, 1-4) and every copy of it is dealt at least that quality.
- **Runs** is a Bonus condition: the Bonus dice show values in sequence (3-4-5), in any order.
- Every Build-mode option has a hover saying what it is for (`help.<label key>` in `js/text/en.js`, shown by `lab()`).

### Neon signs
Every seat at the table is a neon sign, and so is the House's (`js/ui/sign.js`, symbols in `js/ui/symbols.js`).
- **One light.** Every tube, lamp, symbol and crown is lit the same way: a halo in its glow colour, blurred along the
  tube's own path (a wavy tube glows wavy), the tube, and a hot core. Every motion moves that same light: a chase
  runs a brighter stretch of the tube round it, seamlessly (its dash is exactly the loop's length, so it leaves the
  end as it enters the start), and lamps light in turn at the same pace; a breath dims and lifts all of it; a swap
  fades the colours across; a twinkle flickers lamp by lamp and shimmers a tube's glow.
- **Frames.** Tubes: plain, wavy, zigzag, gradient. Light strips: striped, checkered, twisted strands (a real braid,
  each strand passing over and under, with a dark gap where it crosses). Lamps: dashes, dots, bulbs, or the edge
  symbol all the way round. A frame takes one to three colour pairs: one tube each for plain, wavy and zigzag; the
  colours of a gradient (more colours, not more tubes); the stripes, checks or strands of a strip; the lamps in turn.
- **Symbols** are drawn tubes, not font glyphs (signs, stars of four to eight points, stars in rings and rings in
  stars, shapes, suits, dice, a skull, skull and crossbones, a crown, a moon, a bolt, a note, a horseshoe, cherries,
  a seven, a flame, a cocktail; or any character, set as text). At the corners or along the top and bottom, the frame
  stops short of each symbol with rounded tube ends and starts again after it.
- **The name's symbol**: an optional large symbol after the name, its last letter just over it, with its own motion.
- **Edge symbols** go at the corners, along the top, along the bottom, or both.
- **The class line** sits under the end of the name (the symbol's slot), at its start, or centred (`clsAlign`).
- **Faces.** The name and the class line each wear any of the game's three faces (`nameFont`, `clsFont`): script
  (Yellowtail, the name's default), capitals (Didact Gothic, the class's default) or lined capitals (Monoton, drawn in
  parallel tubes like ROLLING on the title sign). Each face is scaled to sit in the same room, and the name is still
  fitted to the seat; a crown finds a capital's real ink the same way it finds a script letter's.
- **A seat's sign has a fixed slot at the table.** The frame's room (its nested tubes and any symbols along it) is
  reserved as padding, and the name is set smaller until everything (name, crown, symbol, business card, stats) fits,
  so no sign grows over the Book, the Run or the dice.
- **Crowns**: a High Roller wears its floor's crown, grander floor by floor, leaning well left and set down on the
  first letter's real ink (the letter is drawn in the name's font to find its top), its band just touching it. A crown
  is three parts, each in its own tube and glow colours, blending where they meet: the **band**, the **prongs** (tubes,
  each with a brighter light climbing it) and the **jewels** (bulbs: a halo, a glass of their colour and a white-hot
  heart, each twinkling and glinting on its own). Unset, a High Roller's crown takes its colours from their sign (band
  from the frame, prongs from the name, jewels from a second frame colour, the symbol or the class line), so each is
  their own; the roster editor can set each part, or all one colour. It sits in front: where it crosses the letter or
  the frame they are cut away round its tubes and bulbs (a mask, not a drawn outline), so they end just short of it.
  Clearing one puts that crown, in its colours, in your crown case; wear it from your suite (it shows on your sign for
  the run, and does nothing else). The name's symbol sits behind the letters: its tube stops short of them with a
  rounded end, as a real sign's tube passes behind another, and it is sized and placed to stay inside the frame.
- **One chase per frame.** A strip's flowing bands and a gradient's turning colours are their own chase; the plain
  chase light is not run over them.
- **Blinks**: the name, class line, frame, edge symbols, name symbol and crown can each blink, each in its own pattern.
- Signs saved before keep their look: double and triple tubes become two and three colour pairs, a rope a twist, the
  one blinking part its toggle, a symbol character its drawn symbol. The class line under a High Roller's name is its
  class (High Roller is its rank, in its hover).
Each sign is edited in Build mode's Roller and Opponent makers. Everything moves slowly and softly, and nothing moves
for players who ask their system for reduced motion.
### Classes, Rollers and Opponents
- A **Class** (`CLASSES`) is attributes: Trickery, Ingenuity, Proficiency (TIP), Balance, Versatility, Depth (BVD),
  the attribute it leans on (`primary`), its **primary C** (`rewards`: what holding every Stake row earns; no class
  has Charisma, Cunning or Conviction of its own), where it deploys from, and a colour. Build mode's Class maker.
- A **Roller** (`ROLLERS`, `js/content/rollers.js`) is a name, a Class and a starting inventory: its Book, its Pouch,
  its Worth (the ¢ it is staked with after the Doorman's bout), the wallet and jacket it walks in with (when you own
  them), and its own neon sign. The pick screen lists Rollers. `newRun` takes a Roller id (a class id still works:
  the first Roller of that class). Build mode's Roller maker.
- An **Opponent** (`ROSTER`) is a Roller across the table: an Opponent name, a Class (every one has one now; the
  maker has no *random class*), and a starting inventory: its own Book and Pouch when set (otherwise its class's
  Roller's Book plus tricks for the floor, and dice for the floor), purse, wallet, jacket, drink and chips; plus where
  it sits and how it plays. A **High Roller** adds its business card and its phases.
- **Business cards**: clearing a High Roller hands you its card (`run.bizCards`). You play by one at a time
  (`run.trait`, the first you win, changed from your inventory on the floor), with the same rule it played against you.

### Before a bout
- The pre-bout page sets your position and the opponent's side by side, with the wager and **Sit down** / **Get
  up** in a bar along the foot of the page, always in view.
- **Your position is painted by hand**, nothing else: it starts from the position you had last (your Roller's own,
  the first time) and you add to it or take from it. The rack beside the Stake holds every chip you can lay (your
  denominations, and the effect chips you own, with how many are left); click one to paint with it, click a space to
  set one down (hold to stack, sweep to cover more); right-click takes the top chip off. **Restore** puts back what
  you sat down with last bout (`run.plan.sat`), filled from the bottom of each stack up if your purse falls short;
  **Clear** takes everything off. There is no spacing, stacking or per-denomination count any more.
- Beside it, the **Stake and Bet meters** as at the table: which rows are held, whether the Stake is focused, and
  what that earns.
- **The opponent** as they will sit down: their neon sign (with a High Roller's crown), their jacket, drink and
  business card, their Stake drawn chip for chip, mirrored (hover a stack for what is in it), and their Book as cards.
- The same planner sits in your Coat Check panel on the floor, so you can set your position between tables too.

### Starting positions (the miniature Stake)
- One stake painter everywhere (before a bout, the Coat Check, and Build mode's Roller and Opponent makers): the
  position drawn as at the table (chips sized and centred in their spaces, stacks lifting as they grow), the rack of
  chips beside it (click one to paint with it), click to set a chip down (hold to stack, sweep to cover more), and
  the right button paints in reverse (click, hold or sweep to take top chips off). Under each zone, the table's own
  marks: rows held (with what they earn, focus included) and columns held (what a turn's end restores). Sized from
  the class, jacket and (for a High Roller) rank (`R.posDims`), so it resizes when any of them change. Chips laid where the position no longer reaches are kept in the
  data but left out at the table, and the editor says how many.
- A Roller's position (`ROLLERS[id].layout`) is the run's first plan. Before each bout the player changes it from
  there in the position planner. When the purse cannot cover all of it, it is built from the bottom up: every
  stack's first chip front to back, then every second chip, for as long as the next chip can be afforded
  (`R.fitLayout`). An opponent's (`ROSTER[id].layout`) is fitted to its own position the same way.

### Build mode hovers
- Every setting in Build mode has a hover saying what it is for: the makers' fields (`help.<key>` text), every field
  of every table (`content/fieldhelp.js`, looked up by table and path, with shared fields such as name, price and
  floor), every Gameplay tuner setting (`help.tuner.*`), every text key (where its words show and how its {marks}
  work) and the Guidance entries' parts. The Guidance side of each says how to try a change out (the Test table, the
  makers' previews, the Shops section). `tests/fieldhelp.mjs` fails on any table field or tuner setting without one.

### Build mode lists are linked, not typed
- No Build-mode field takes a comma-separated list any more. A list of things the game defines (tricks, materials,
  dyes, chips, weather, immunities, face effects, floors) is edited by picking each item from that table, by name,
  with ✕ to take one off; an item that no longer exists is marked. Colour lists use colour pickers, number lists
  number boxes, and free lists (tags) one box per item, offered the values already in use.
- The test table's dice are a count per die; an opponent's precise Stake layout is painted with a brush, and each
  space shows its chips by name.
- The opponent names dealt at the tables and the High Rollers of each floor (`OPPONENTS`, `BOSSES`) are no longer
  typed lists: they are rebuilt from the roster, so a renamed or new opponent is dealt under its own name.

### High Roller traits (business cards)
Business Cards no longer raise your attributes (old saves drop them; the starter wallet gets the discount cards).
Instead every High Roller hands you a business card at the table: a **trait** (`BOSS_TRAITS` in
`js/content/bosstraits.js`, set per High Roller in the Opponent maker) that bends one rule their way. Each has a
rule `k` with its numbers (`vars`), a title and a line of flavour; the rule's words are written from `k` and `vars`.
Rules: `pitback` (n of its own chips climb back out of its Pit each turn), `fireproof` (its stacks start Burning;
fire and acid take nothing from them), `hardened` (front stacks start Hardened for some turns), `wet` (stacks start
soaked), `interest` (a 1¢ chip on its Bet each turn per so many ¢ of Worth, capped), `resist` (fees n¢ smaller),
`tempo` (+1 Draw, Roll and Bid every few turns). A High Roller's sign is larger, with the card beside it.

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
- Wallets (**Gear**): each has a slot count, one pass slot and a retention number. In the alley you roll two dice
  against that number; succeed and the wallet's cards and pass are yours in your next run.
- The purse limit: pass 999 trillion and the purse rips, ending the run in "crushing defeat".
- Paradise Ascent: five legend steps plus your own finished builds, stored in the browser and placed by net worth.

### Tricks as collectables (round 17)
- **Condition** sets only the sale price: Gem Mint 200%, Mint 100%, Excellent 75%, Good 50%, Poor cannot be sold
  (the Trader trashes it). Wear starts at 100 for Mint and drops 1 each time a trick goes into play; each condition's
  percentage is also its wear threshold (Excellent from 75, Good from 50, Poor below). Your first Book is Good (wear
  74), the shelf Excellent (99), foil packs Mint (100). Gem Mint comes only out of packs (8% a trick) and is Mint
  until it first plays. A Poor trick plays forever at full strength.
- **Rarity**: Basic; **Foil**, the same trick a tier stronger (it plays with the quality above its own; an
  Upgrade chip bid on a trick does the same, and they add up); Holo and Prism are gone (old saves load them as Foil).
  **Misprint**: one value printed wrong, and it plays as printed. The kinds of fault are a table (`MISPRINTS` in
  data.js), each naming the value it changes, how it rolls, how it changes the rules and which part of the card
  shows wrong: its Bonus dice a size off (`die`), one Bonus die more or fewer (`count`), its effect value off
  (`trait`), most of them for the better. More kinds (a colour, an aim, a bid) slot in the same way, so any trick
  can come out misprinted in any of them. **Reprint**: a trick brought back to print, marked with an ankh and a white
  aura, playing an older rule (the roll effect plays once per die). Only tricks marked `reprint` in the Trick maker
  come out as Reprints; a trick taken out of the game is marked `retired` (dealt nowhere, still held and played,
  still reprintable), never deleted.
- **Quality** (Common, Fine, Grand, Royal: shown as I, II, III, IV wherever the trick is) is unlocked by floor and sets the multiplier. Common and Fine roll only
  their own small dice and are reliable. Grand and Royal roll a quality die when drawn (d10, d20): a dud (1; 1–2)
  plays at Common strength that turn; a hot roll (10; 19–20) sets off the Bonus whatever the dice. Drawing a trick
  again the same turn keeps its roll.
- **Foil packs** replace upgrades at the Trick Trader: five tricks of the set's quality, all Mint, one of them a
  rarer print (Misprint, Reprint or Foil); the others are Basic, one in five Foil. Common, Fine, Grand and
  Royal sets open on floors 1 to 4, at 200¢ × quality × floor (above what the five sell for at Mint). The pack's
  tricks go into your Book and are listed under the shelf.
- **A trick has three states**, the same everywhere (trickcard.js): the **list item** (its type's colour, its chip,
  its name in script, its numeral and print mark, its Bonus dice in their pattern), the **full card** (its hover and
  previews: name and numeral, chip and flavour, then Trick (what it aims at), Roll and Bonus, and a strip of its
  numbers with marks) and the **played card** at the table (its name strip, the bid ring and the dice area). The
  Bonus dice are laid out by the trick's `pattern` (rows of up to four, at most nine dice, lined up left, centre or
  right; set in the Trick maker, which previews all three states and the three prints). Prints show on all three:
  Foil a metallic rainbow that glints now and then, a Misprint's ink off at an angle (cyan, magenta and yellow) with
  the true value ghosted behind the wrong one, a Reprint its ankh and white aura.
- Passes are not cards. Every wallet holds **its own number of passes** (`passes` on each wallet in `WALLETS`, tuned
  in Build mode's tables; 1 to start), each in a pass slot that cards never use. A full wallet gives up its lowest
  pass for a new one, so a one-pass wallet behaves as before. Kept passes come into the next run together, and the
  elevator offers each of their floors. The **Casino Pass** is won from the Doorman
  (it replaces the Royal Card); reaching a floor puts that floor's pass in the slot in place of the last.
- Once you are in, a pass is not needed again unless you leave: continuing a saved run from the title needs the pass
  for your floor or a higher one. Without it **the Bouncer** stops you: a bout at the door with nothing staked;
  beat him and you are back in at the Boogey Basement with all your run's things (lose, and try again).
- The pass stays with the wallet. Keep the wallet in the alley and its pass comes into your next run: after the
  Doorman you may take the elevator to its floor (the floor checks are bypassed) or start in the Basement. Lose the
  wallet and the pass goes with it.

## Readings chosen where the workbook leaves it open

| Question | Reading used |
| --- | --- |
| Do Rollers act in turn or together? | Together, phase by phase (Draw, Roll, Bid). Each sees the other's move in a phase only once both have made it. Then everything resolves by effect type. |
| The nine turn phases (Opening, Deal, Drop, Decision, Dance, Bow) | Folded into Draw, Roll, Bid and the House's play. There is no separate hand, and no Toss or Reroll in the Bow. |
| How many throws a turn? | One. Everything you will roll is picked first and lands together. |
| How a fee meets a chip | See **Debt** above: whole chips from the top, the remainder stays as Debt where it was laid. |
| How strong a tilt is | Set by the bout, not bought: tiers and slot counts are gone; a tilt is on or off. |
| How a bout ends if neither side breaks | "Last call" is an addition: from turn 9 every Expense is multiplied by a factor that grows each turn. At turn 40 the most Worth wins. |
| Debt (the **Debt** tab's five concepts) | "Knocked out by debt": reaching zero Worth loses the bout. |
| Dice upgrades | All 22 from the workbook. They are permanent, including faces that change with use (Rig, Enchant, Encase); only Upgrade chip effects are for one roll. Readings: "fill" moves value into the target (Divide: 1 from every face; Gift: half the highest; Devour: all of the lowest), Boost/Bonk ±2, Rig/Enchant/Encase change with use and reset each bout, Gamble ×2 and Curse ×3 on a random face each roll. Numbers in `DIE_VARS`. |
| Which cards take a wallet slot | Benefit cards do. Memberships, Suite Keys and punch cards clip to the lanyard and do not. Passes are not cards: each wallet holds one in its own slot (round 17; the Royal Card is now the Casino Pass). Cards can be dropped from the kit at any time, except the Royal Card before floor 1. |
| Membership Card discount | "Also gives the discount": its own percent off at its shop, not stacking with a Discount Card there (the best counts). |
| Debt chip values | One Debt marker per stack showing the exact amount owed (it used to be split into 5, 2 and 1¢ chips, which read like money). |
| Which dice make the alley roll ("2dn") | Your two largest dice. Big dice are worth keeping for it. |
| Wallet prices | Stats come from the **Gear** tab and prices from the **Gift Shop** tab, matched in order where the names differ. |
| What a flip costs | One roll. The chip is not spent: it comes back to the Bet. |
| Which chips the shop sells | Those no trick, bonus or table effect makes. Chips a trick makes (Gold, Block, Counter, the hazards) are not sold. |
| What a shop chip costs | Its tier's price; the tier is how strong it is meant to feel until it has been tuned. |
| Opponent strength | Generated per floor from the class tables; quality and dice improve each floor. |
| Which chips leave the shop | Those whose effect is an Investment, Insurance, Expense or Correction effect over time (they modify a roll or effect, mitigate fees, or correct the table). The electronics, plants, food, weather, Big and Little chips, resists and Uranium stay: they are things, not effects. |
| An overloaded stack or Bet | Like overkill: the trick plays, what has no room is lost, and a trick that adds chips cannot aim at a full stack. |
| A phase you cannot act in | Skipped on its own, with a line in the feed; unused actions still pay. |
| Dice left in the roll | Each Bluff at least one die from the roll goes on a trick (when one fits); the rest stay in the roll with their values, turn after turn, to pick from later, like tricks waiting on the Run. No effect rerolls yet. |

## Not built yet

- Artifacts and the jacket pocket limits.
- Gift, Identification, Collectable, Roller, High Roller and Ascended cards (Paradise and five Notes are built); cosmetics; the music player.
- Play-by-play sports. Games are settled by a weighted draw from the posted odds. No hedges.
- Themes per opponent, felt board effects, encounter modifiers.
- Most of the 400-entry chip list, the **Effects** element table, Splitting, the Rest conditional.
- Online ladder. The Ascent uses generated legends and your own past builds on this device.
- Saving in the middle of a bout. A reload returns you to the floor before it.

What is needed to build these is listed in `docs/OPEN-QUESTIONS.md`.

## Dice models

Every die is one 3D model (`js/ui/dice3d.js`, three.js r169 vendored under `js/vendor/three/`, loaded only in the
browser): a rounded solid made as the hull of spheres at the corners, with each type rounded its own amount and each
material scaling that (diamond sharpest, bone softest). Pips and numbers are always sunk into the face, through a
height map turned into a normal map, with a frosted recess and an ink fill. Materials are physical: plastic is
clear-coated and glossy, bone has an ivory sheen, metal reflects a lit room (a soft box, a window and pink, cyan and
gold neon), glass and glimmering transmit with depth and a mirrored inner shell, swirling is clear resin with
coloured ribbons inside, diamond has the index of real diamond with dispersion and iridescence, and sparkling is
metal flake under a clear coat. A d4 is read at its top point: each face has a number at each corner, pointing to
it, and the roll is the number at the point standing up (the same on all three faces there). The same model is drawn everywhere: still dice (Pouch, tray, Run, spines, cards) are
rendered once per type, material, faces and value and cached as images; tossed dice are drawn live each frame. Without
WebGL the older flat dice show.

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
Rascal, whose Stake is the smallest. The numbers that drive this are in `FLOORS` in `js/data.js` and
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
and a Stake filled to a worth target. Worth is the only dial, so difficulty can only be tuned by worth, and a floor
feels like one wall. Ways to give opponents their own parameters and abilities, roughly in build order:

1. **Temperaments.** A profile per opponent that sets its AI knobs (the audit's `draw`, `roll`, `bid` plans): a
   *Saver* banks actions, a *Spender* bids every bid, a *Grinder* rolls everything. Same worth, different fights, and
   a reason for the table 2 / table 3 choice.
2. **Shaped positions.** Let worth buy shape instead of only chips: a low-worth opponent on a deep Stake, a rich one
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


## Round 19: wagers, the Pit, pushing and shoving, bids on anything, and the tools round them

Built from the designer's list of 42 notes (kept, with what was done for each, in `docs/ROUND-19.md`).

### The floor
- **A table has a wager of its own** (`FLOORS[floor].wager`, one a table; unset, a quarter of its Roller's worth). You
  put it up to sit down and the multiplier pays on it. The rest of your purse goes into your Stake as far as you
  choose; what you leave in the purse is yours whatever happens. A loss takes the position and the wager, no more.
- **A table is played once.** Win or lose it closes; playing table 2 or 3 closes the other. The High Roller sits down
  once both of your tables are played, and the stairs open once the High Roller has been played. Beat them and you
  climb with their crown (the Suite, the Penthouse and the Ascent are the winner's); lose and you can still walk up
  from the floor plan, but not from floor 4.
- **The High Roller is played all in:** everything you leave off the table is wagered, and they match it
  (`bossMatch`: a win pays it back plus that many times it).
- **Shown the door:** with a game still open that you cannot afford, the floor says so (sell a die or a trick first,
  or leave through the Gift Shop).
- Every one of these is a tuner (Gameplay tuner, Wagers): `minStake`, `rematch`, `bossNeedsWins`, `bossToClimb`,
  `bossAllIn`, `bossMatch`, `forcedExit`.
- **Developer mode** (title screen; stays on in the browser): a DEV button by the purse sets it to any amount, jumps
  floors and seats the High Roller; every table gets Clear it (with a number of ¢ lost on the way) and Lose it,
  settled at once with the tilts and Double Down set. It calls the game's own `settle`, so the settlement, the prize
  pick and what opens next are the real ones.

### Bids
- **Any chip with a value is a bid**, zero and negative included: a stack's Debt marker is its top chip to bid (worth
  minus its value; bidding it clears the debt), and a made chip whose value is set to 0 is a bid (a value left unset
  is not). A bid still has to be made each turn; a trick bid below nothing does nothing.
- **Bid on a tapped trick to bring it back.** It uses a bid and passes the phase. The trick returns at this turn's
  restore, on top of what the Bet columns restore. It takes the trick's quality level in chip value (I 1 to IV 4, a
  Foil a level more): any chip brings it back, and the difference stays on the trick as a **base effect** for its
  next play (+1 for a 2¢ chip on a quality I trick; a smaller chip, zero or Debt, brings it back weaker). A trick the
  restore is already bringing back cannot be bid on. The base effect is spent when the trick plays.
- **Stacks:** a stacked trick's card answers to its Run entry (the bug that stopped bids on a stack and could lock a
  bout). The ⧉ mark takes the top copy off to play on its own.
- With every bid placed, clicking a rolled die shows the bids and opens the Bluff with that die in hand.

### The Pit
A grid between the positions: `TUNING.pit.cols` columns of stacks on each Roller's side (a space a row), each up to
`stackMax` high. A lost chip lands in the column by the middle first, on a row with room, then the column behind.
Down the middle is a bottomless pit: with a side full, what it loses falls in and is **gone for good** (it leaves the
Stage total: a win does not restore it, nobody is paid it, Gather and Steal cannot reach it). Chips leave the Pit only
through tricks and chips, as before.

### Pushing and shoving
- A **slide** moves a stack one space along the felt and pushes the line of stacks in its way. Nothing is pushed off
  the back, or off the top or bottom rows (such a slide does not happen). The front is the Pit: a stack pushed off it
  falls in, lost as a fee is. A **lift** sets the top chip (or the stack) on the next stack; a **slip** puts it under.
  Neither makes a stack taller than its height. Anchored stacks, Holes, big chips and Trees hold their ground.
- **Movement and Regen are chip driven.** A made chip's Move action takes how (hop, slide, lift, slip), a direction,
  steps (a number, as far as it goes, or a space per 4 rolled) and whether it may spill into the Pit; a chip's reach
  can be its row or its column. Retreat, Advance, Lift and Sink lay Squeeze, Draw Back, Rise and Drop chips (one a
  point of the roll, spreading from the target); Renew lays a Mend chip that brings your lost chips back out of your
  Pit for two turns. Shove, Tug, Hoist and Tuck are new tricks built the same way.
- A made chip now works on the side it lies on (a chip a trick lays across the table used to be looked for on its
  maker's side, so it never fired).

### Tricks, cards and passes
- **A trick has one quality** (set in the Trick maker, or rated from what it does for the dice it asks). There are no
  tiered copies: shelves and packs pick tricks by quality, opponents play each at its own. A Foil is a print.
- The trick card is one size in each of its states (every card as tall as the longest trick; the Trick maker flags a
  wordy one), with no strip of tags, no print rule, and no mark on a Misprint.
- **Everything collected is a card or a pass.** The lanyard is gone: punch cards and memberships take card slots. A
  **Suite Key is a pass**: it takes a pass slot (a free one, or that of a pass for a floor below), and is cut for a
  room, the floor's number and two digits, which is its name. No slot: it stays at the desk and the Suite stays shut.
- A punch card shows its punches as holes through the card.

### At the table
- The name plate is one fixed sign with the name and class; Worth, the Pit, bids, tapped pieces and the steps are the
  Roller's field beside it (the pots and ledger no longer sit between the Stakes: the Pit has that space).
- Any trick under the pointer shows where its chips will land, with how many once the roll is known.
- The end of a match plays one thing at a time: the call, the loser's sign sparking out, cracking and going dark, the
  winner's lap, then the readout.
- Dice: pips and numbers are painted white on see-through materials; dice at rest are redrawn in turn so their
  materials stay live; every die grows a little under the pointer. Nothing is loaded at the title: the first time you
  leave it (a run, the Library, Build), its menu gives way to a bar while every die in every material, every
  material's shaders and every wallet's and jacket's body are made ready (`?curtain=0` skips the wait). A die at rest
  is drawn straight onto its own canvas, with no picture read back from the renderer. A die can be given a pet name when it is cast or from the Coat Check.
- Music: what the band is doing is also kept in the browser, so a band switched off stays off on the title screen,
  in Build mode, in a new run and on returning to the tab. Hearting a tune can have a price.

### Build mode
- **Gear maker:** wallets and jackets: names, what they do, and a look (a finish, colour, trim or lining, clasp or
  collar, stitching or buttons, an emblem, glint and sparkle), drawn as you change it, within bounds.
- **Finishes** (`content/finishes.js`): the eight dice materials and eight cloths and hides, for a sign's name, class
  line and backing, a card's backing and lettering, wallets and jackets. A symbol and a crown take a finish's colour,
  glint and sparkle.
- **Organise:** any class, Roller, opponent, trick, chip, card, wallet or jacket can be moved up and down its list and
  deleted. A deletion is a change (`'CLASSES.x': null`), exported with the rest, so the entry does not come back on a
  merge or because the game's own tables still list it. Something still used is not deleted.
- **Tilts:** each has its own first turn, a ramp (chance added a turn), a cap, and where what it lays lands.
- A crown's fit (tilt, along, height, size) is set in the suite when you put it on.
- Rule tests run on the tables as written (`RP_CONTENT=stock`); the whole-game tests run again on the shipped content.

### Readings chosen in round 19
- A bid on a tapped trick **always** brings it back; a chip under its quality level costs the difference as a
  negative base effect rather than failing.
- A Suite Key **needs** a pass slot; with none free it is not kept and the Suite does not open.
- All in against the High Roller ignores `TUNING.wager.boss`: the match (`bossMatch`) sets the multiplier.
- Table wagers ship as 5/10/15, 30/45/60, 150/225/300 and 600/900/1200 by floor: placeholders to tune.
- A die with no pet name shows none: it goes by what it is.

## Round 20: one of everything

**Nothing is coded twice.** `tests/dupes.mjs` fails on any stretch of code that appears twice in `js/`. The shared
pieces: `ui/form.js` (every Build-mode input, the draft-bound form, the id prompt), `ui/chippaint.js` with
`stackedit.js` (the one chip painter: Add, Insert below the chip pointed at, Change, Remove; on your Stake, Build
mode's positions and the test table), `ui/finish.js` (the one finish picker, the material pictures), `ui/thing.js`
(the body of anything held), `ui/sign.js nameSign` (the one name sign), `core.js carry` (press and carry),
`core.js fitText` and `giveWay`. `tests/syntax.mjs` parses every source file.

**The title sign** is drawn from the design's own pieces (`assets/title`, cut into tubes by `tools/title-sign.py`)
and lights a tube at a time with no flicker (see The title sign).

**Every trick effect is a chip's work.** A trick is an Expense charging a fee, or it lays chips. Each Insurance,
Investment and Correction lays its own chip (`content/chipmaker.js`, action `fx`); the chip plays the effect
(`bout.js FX`) with the roll it was made with. A trick lays it under the stack it aims at (or on your Bet) and it is
gone at the end of the turn; laid by anything else (another chip, a tilt, the painter) it plays the same effect on
the space it sits on. Makers lay their effect chips the same way (`roll: { chip, n, life }`). A tilt can be given
chips to lay (`TILTS.*.chips`, `count`, `countPer`, `own`).

**Materials.** One table (`content/finishes.js`), one renderer (`dice3d.js`): the dice's eight, card stock, and the
cloths, hides, skins and fur, each a physical material with its grain as relief. `swatch()` pictures a material as a
slab in the dice's room and light; a finish lays that picture on letters, backings, cards, wallets and jackets, and
paints symbols, crowns and emblems with it. Each material says how thick a thing of it is and how it breaks.

**Things you hold** (`ui/thing.js`): a card, a pass, a key, a business card, a wallet, a jacket is a face, a back and
the edge between, as thick as its material. Under the pointer it leans toward you; press and drag and it comes up
for a close look, to be turned over (`ui/spin.js`, the look a die gets).
- Cards, passes and keys are printed by one drawing (`parts.js printFace`, `printBack`) from a look; the back has its
  own colours, pattern, border, symbol and the lines it shows (name, rule, flavour, serial, a note). Passes have a
  look as cards do, set in the Cards section.
- A business card is a card (kind `business`), one for every High Roller, carrying their name sign. It takes a wallet
  slot; while it is in your wallet you play by their trait, and every business card you hold counts. A High Roller whose card you hold does not sit down again that run.
- A wallet is a billfold, a clasped pouch or a clip: a padded body with a slot along the top for cash (your purse
  shows as notes in it). A billfold and a pouch lie shut; under the pointer, or clicked to keep them so, the cover
  swings open or the flap lifts, and what you carry is inside (the same elements drawn anywhere else). A clip holds a
  folded wad with everything in plain sight. No slot marks.
- **One material, everywhere.** A material is defined once (`material()` in `ui/dice3d.js`) and a wallet or a jacket
  is a body made of it, rendered in the same room and light as a die of it (`ui/gear3d.js`): any material a die can be,
  gear can be, and tuning a material tunes it on everything. A part is only a shape, and two tools give every part
  its form. `sewn()` makes outlines into one padded surface: each panel swells toward its middle and meets the next
  in a seam, with rows of stitching beside the seams and round what is sewn on top (one panel alone is a pillow).
  `folding()` folds a sheet along lines. A wallet is one sheet of what it is made of: a billfold folded in half, a
  pouch folded up from the bottom with its flap down over the front, a clip a strip bent back on itself round the
  wad (joined at the bend); opening one unfolds it. A jacket is one garment: fronts, sleeves, cuffs and hem band sewn
  into one surface, front and back, with collar, pockets and fastenings sewn on. At rest the piece is a picture of
  its body, a little turned; it is drawn live while a wallet opens, while a jacket turns toward the pointer, and when
  either is turned in the hand. What a wallet holds stays the real cards and passes, lying in the pockets of the
  picture. Jackets show no numbers. Without WebGL the drawn pieces (`ui/gear.js`) stand in; both are cut from the
  same shapes (`JACKET_CUT`).
- A **swirling** die is cool clear glass with brush strokes of coloured glass through it (flattened bands that
  wander and twist, deepest along their middle and paling to their edges, filling well over half the inside), under
  a low index so the stroke is seen where it is from every side. A **glimmering** die is clear glass with a light at
  its heart: a glow thinning away round it, rays reaching out, sparks through the glass, under a film of shifting
  colour. A **d4** carries its three numbers a face larger and lighter than the other dice, cut narrow, and kept on
  the flat of the face. Rolled dice sit in the tray larger than dice in the Pouch, four to a row.
- **Every body is closed and can be folded.** A part is two faces and a rounded rim, all of points close together,
  each face running right out to its rim. A wallet's sheet is thin at its edge, where outside and lining are sewn
  together, and swells from there. Inside it is lined, with a long hemmed pocket for the cash behind three hemmed
  card slots a leaf; a pouch has a pleated gusset at each side.
- **Drinks** are bodies too (`drinkLook`, content/finishes.js: vessel, what it is made of, rim, liquid, head, fizz,
  ice, straw, garnish, glow). `turned()` spins a profile into a vessel and the drink that fills it to the sips left.
  Two liquids join the materials: `liquid` (you see through it; it takes its colour with depth) and `cream` (you do
  not). The renderer shows nothing clear through a clear body, so a clear vessel is drawn as a sheer film over what
  it holds, and ice and fizz inside a clear drink are solid to the eye.
- Right click lets go of anything held up close (as Esc does).
- Still a flat picture of the same material, not a body of it: cards and passes, sign letters, symbols and crowns.
- A jacket has a style (blazer, bomber, long coat, parka) and parts (body, sleeves, trim, collar, closure, pockets,
  emblem), each with its own material and colour.

**At the table.** Press and carry does what clicks do, and says where: a trick onto the Run or onto a copy of
itself, the top copy off a stack, a chip onto a trick, a die onto a trick, a trick onto its target. A die grows
where it stands (it used to leap across the table under the pointer). A defeated sign fails a part at a time, by
material. A sign's lettering is set and fitted in the room its edging leaves.
