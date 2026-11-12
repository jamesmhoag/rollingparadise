# Chip list status

Every row of the workbook chip list (`docs/CHIP-LIST.tsv`) and where it stands. The same view is in the
Library under **Chip list**, with each chip's traits (see **Traits**). Statuses live in `js/chiplist.js`
(generated from the sheet). Row 18, the Coin, is left out: it is an Artifact, for later.

## Needs detail (2)

| Row | Chip | What is missing |
| --- | --- | --- |
| 91 | Heavy Chip | Skipped for now (by request). Need: what a "Burden" is. |
| 92 | Metal Chip | Skipped for now (by request). Need: what it deters and what its burden is. |

## Built (105)

| Row | Chip | How it is in the game |
| --- | --- | --- |
| 2 | Royal Paradise 1¢ chip | The 1¢ Royal Paradise chip. |
| 3 | Royal Paradise 2¢ chip | The 2¢ Royal Paradise chip, from floor 2. |
| 4 | Royal Paradise 5¢ chip | The 5¢ Royal Paradise chip, from floor 2. |
| 5 | Royal Paradise 10¢ chip | The 10¢ Royal Paradise chip, from floor 3. |
| 6 | Block Chip | Block chip: Insurance traits, Block, Settle/Fence bonuses, the Shield tilt. |
| 7 | Counter Chip | Counter chip: Block's bonus. |
| 8 | Resist Chip | Resist chip: made by Resist Cards (found in the dodgy corner; r 2 or 3). Sits at the base of a front Bar stack; fees under r¢ on it are deterred, like a Red chip keeps fire off. |
| 9 | Zap Chip | Zap chip: made at the table by Electrify (Insurance, Technician). A fee of 3¢ or less on its stack shocks the attacker; a bigger fee shorts it out. |
| 10 | Feather p¢ Chip | Feather: the Float trick (Insurance, Rascal). |
| 11 | Hardened p¢ Chip | Hardened chip: lies over its stack (no worth, no height) for its turns, so each fee takes one chip. Made by Brace (Insurance) and the Crown chip. A piercing fee destroys it, a Cloud's rain washes it off; your own cleansing keeps it. |
| 12 | Regen x¢ Chip | Regen: the Renew trick (Insurance) gives value chips Regen for a few turns. A Regen chip paid to the Stage is restored to its position straight away, without its Regen. |
| 13 | Transpara-Chip | Transpara-Chip: made at the table by Veil (Insurance, Rascal). The opponent cannot aim at its stack. |
| 14 | Power Chip | Power chip: made at the table by Empower (Investment). In each Investment phase, +1 to your roll effects per chip, while it lasts. |
| 15 | Control Chip | Control chip: made at the table by Throttle (Investment, Rascal). In each Investment phase, −1 to your opponent's roll effects per chip, while it lasts. |
| 16 | Anchor Chip | Anchor chip: made at the table by Moor (Insurance, Hustler). Creatures, Scatter, the Tornado and the Black Hole cannot take from its stack. |
| 17 | Hole Chip | Hole: the Hazard tilt, Acid and the Mole make them. A Hole does not move (the Magic Hat is the movable one); a Puddle fills one so Wood can float in it. |
| 19 | Frozen f¢ Chip | Frozen chip: the Chill trick (Insurance). |
| 20 | Sticky f¢ Chip | Sticky chip: the Gum Up trick (Correction) sticks it on an opponent's stack. The first timed buff or debuff there stops counting down; its value is the stack's height. |
| 21 | Seed p¢ Chip | Seed chip: a shop chip (Uncommon). Sprouts into a Flower. |
| 22 | Tree Chip | Tree chip: a shop chip (Rare). Grows on an empty space, seeds the stacks around it, and falls into Wood when a fee hits it. |
| 23 | Flower Chip | Flower chip: grown from a Seed. |
| 24 | Petal Chip | Petal chip: bloomed by a Flower; blocks an entire fee. |
| 25 | Opportunity 1¢ Chip | Opportunity chip: earned for unused rolls, accumulated, bid and moved like any chip. One left at the end counts as value in your position (no refund). |
| 26 | Golded 2*p¢ Chip | Gold: the Gild trick. |
| 27 | Boosted Chip | Boosted chip: made at the table by Load (Investment, Hustler). Every die you roll shows 1 more per Boosted chip in your position. |
| 28 | Cheapened Chip | Cheapened chip: made at the table by Shave (Investment, Technician): your opponent's dice show 1 less per Cheapened chip in your position. |
| 29 | Harmony Chip | Harmony chip: made at the table by Attune (Correction). In each Correction phase it clears a hazard or 1¢ of Debt nearby. |
| 30 | Debt -1¢ Chip | Debt: every Expense. |
| 31 | Burning -1¢ Chip | Burning: Scorch, the Dragon, Inferno, Volcano, Lava. |
| 32 | Corrupting -1¢ Chip | Corrupting: Infect. |
| 33 | Shocking -1¢ Chip | Shocking: Zap's bonus. |
| 34 | Poison -1¢  Chip | Poison: Envenom. |
| 35 | Boom -5¢ Chip | Boom: Rig. |
| 36 | Dynamite Chip | Dynamite: the Fuse trick (Expense, Technician). |
| 37 | Black Hole Chip | Black Hole: a Calamity, a hole in space on a Bar space. Anything put on it is gone; each turn, and whenever a Correction moves chips, it consumes the bottom chip of a stack next to it. |
| 38 | UFO Chip | UFO creature: flying, 1 hit instance, stays a turn. Abducts a chip; a hit drives it off for a 5¢ Bounty. |
| 39 | Mothership Chip | Mothership creature: flying, 10 hit instances (50¢ Bounty). |
| 40 | Fairy Chip | Fairy creature: flying, 1 hit instance (5¢ Bounty). |
| 41 | Unicorn Chip | Unicorn creature: 1 hit instance (5¢ Bounty). |
| 42 | Heli-Chipter | Heli-Chipter: a shop chip (Rare) on top of a stack. The stack is flying and plays from the bottom: bids take the bottom chip and fees pay from the bottom up. |
| 43 | Cloud Chip | Cloud: orbital weather that comes with Oceanic, Frosty and Earthen tables. It drifts, rains (Puddles, wet stacks, fire and frost washed off, plants grow faster) and throws lightning one turn in four. |
| 44 | Worm Hole Chip | Worm Hole: a Calamity (Challenge tilt). Opens on an empty Meter space; chips that land on it are pulled through to your opponent's side. |
| 45 | Volcano Chip | Volcano chips: the Volcano Calamity is a full stack, two spaces by two where there is room, that nothing can be placed on. Dormant after 4 turns, the spaces come back one stack height lower. |
| 46 | Dragon Chip | Dragon creature: flying, 50 hit instances (250¢ Bounty). Breathes fire. |
| 47 | Ward Chip | Ward chip: made at the table by Ward Off (Insurance). When the House settles, it cancels the largest fee charged to your position. |
| 48 | Hive Chip | Hive chip: set on an empty space by the Familiar tilt (one play in three). Every second turn each Hive chip in the stack sends out a Bumble Bee (up to 6). Each Hive chip takes a whole fee, like a Petal. |
| 49 | Bumble Bee Chip | Bumble Bee: a familiar from a Hive. It stings creatures over your table (one hit each turn) and pollinates your Flowers into Honey chips. |
| 50 | Honey Chip | Honey chip: food (+1 Roll, +1 Bid for a turn), made only in the match, by Bumble Bees pollinating Flowers. |
| 51 | Wood Chip | Wood chip: falls from a felled Tree; blocks two entire fees. |
| 52 | Chocolate Chip | Chocolate chip: food sold at the Chip Exchange (+1 Draw for 2 turns). |
| 53 | Fairy Bounty Chip | Bounty system: creatures have hit instances; each fee instance on one takes a hit, the last drives it off and it drops a Bounty chip worth 5¢ a hit. The Fairy has 1 hit: 5¢. |
| 54 | Unicorn Bounty Chip | Bounty: the Unicorn has 1 hit. Pays 5¢. |
| 55 | UFO Bounty Chip | Bounty: the UFO has 1 hit. Pays 5¢. |
| 56 | Mothership Bounty Chip | Bounty: the Mothership has 10 hits. Pays 50¢. |
| 57 | Dragon Bounty Chip | Bounty: the Dragon has 50 hits. Pays 250¢. |
| 58 | Battery Chip | Battery chip: a shop chip (Rare). Electrical and electronic chips above it in its stack get one more instance a turn (Zap, Repeater, Forgetter, Tesla, Absorption, Sprinkler); a Shocking chip on its stack hits one more stack. |
| 59 | Clay Chip | Clay chip: a shop chip (Uncommon). |
| 60 | Brick Chip | Brick chip: fire bakes Clay. |
| 61 | Acid Chip | Acid: Melt. |
| 62 | Upgrade Chip | Upgrade chip: made at the table by Tinker (Investment), on a Meter space. Each one puts a random die upgrade on every roll, for that roll only (a risk). |
| 63 | Tornado Chip | Tornado chip: the Tornado Calamity moves over your position with a strength of 2d6; a stack under it shorter than that is thrown about. |
| 64 | Blizzard Chip | Blizzard: orbital weather as big as the table, from Polar tables (now and then) and the Blizzard Calamity (every fourth turn). It lasts a turn, then freezes every stack shorter than its strength (2d6), wet chips and Puddles. |
| 65 | Ghost Chip | Ghost creature: fear. No trick can aim at its row (only spreads reach it), it cannot be damaged, and no overkill passes into or through its row. Bad for both Rollers. |
| 66 | Puddle Chip | Puddle: water on an empty space (a Cloud's rain, a Sprinkler) makes one; nothing can be played on it until it dries after a turn without water. Wet stacks cannot burn, pass electricity on, freeze in the cold and grow plants faster. |
| 67 | Ghost Ship Chip | Ghost Ship creature: a vehicle with 100 hit instances. Sails across empty spaces to a Gold-topped stack and steals the Gold; sunk, it drops a Treasure chip with all it stole. |
| 68 | Chip Chip | Chip Chip: food (+1 Steal for a turn, doubled when dipped). |
| 69 | Dip Chip | Dip chip: a shop chip on its own space; the next 3 Chip Chips you eat are dipped for double. |
| 70 | Dragon Roost Chip | Dragon Roost: one in two Spawner tilts. It takes a Bar space and calls a Dragon every third turn while no egg sits on it; the Dragon lays an egg chip on it. |
| 71 | Dragon Egg Chip | Dragon Egg: 5 hit instances. Hatches after 5 hatch steps: one a turn, two on a Roost (3 turns), one more next to heat. Broken first, it never hatches. A trick totalling 10 or more hatches the eggs on your Roost at your opponent. |
| 72 | Treasure Chip | Treasure chip: dropped by a sunk Ghost Ship. 50 to 100 Gold plus what it stole; one in ten carries a Cursed chip. |
| 73 | Cursed Chip | Cursed chip: looks like a Gold chip. While it is in your pile, each turn one of Draw, Roll or Bid is 1 lower (never below 1). |
| 74 | Mole Chip | Mole creature: 1 hit instance (5¢ Bounty). Digs a Hole and sits in it. |
| 75 | Sun Chip | Sun chip: a shop chip (Rare) that goes up into your sky as orbital weather, and the weather of Molten tables. Flowers and Trees grow twice as fast, Puddles dry, eggs hatch faster. |
| 76 | Shadow Chip | Shadow chip: made at the table by Shade (Insurance). Its stack cannot be aimed at behind a taller stack. |
| 77 | Repeater Chip | Repeater chip: a shop chip (Epic), electronic. On top of a stack with n chips under it, your tricks whose dice total n play again (once more per Battery). |
| 78 | Mimic Chip | Mimic chip: made at the table by Echo (Investment, Rascal), on top of a stack. While it is on top, one of your tricks of each type, at random, plays again in that phase. |
| 79 | Reducer Chip | Reducer chip: made at the table by Cushion (Insurance). Each fee on its stack is 1¢ smaller per chip, while it lasts. |
| 80 | Forgetter Chip | Forgetter chip: a shop chip (Epic), electronic. On top of a stack with n chips under it, the first of your opponent's tricks each turn whose dice total n is negated (one more per Battery). |
| 81 | Tesla Chip | Tesla chip: a shop chip (Epic), electronic. Zap, Shocking chips and Cloud lightning count as lightning; once a turn it grabs a strike on your position and sends 2 back (one more per Battery). |
| 82 | Absorbtion Chip | Absorption chip: a shop chip (Rare), electronic. Absorbs 2 lightning instances a turn on its stack and the stacks around it (one more per Battery); an absorbed Shocking chip cannot repeat. |
| 83 | Sprinkler Chip | Sprinkler chip: a shop chip (Uncommon), electronic. Each turn it shoots water at the farthest space: a Puddle or a wet stack. |
| 84 | Uranium Chip | Uranium chip: a shop chip (Rare). Each turn it mutates a chip next to it into a random chip. The Hand Off trick (Correction) moves it onto your opponent. |
| 85 | Big Chip | Big chip: a shop chip (Epic). Two spaces by two (the list says 5; the clarification says 4), worth 4 basic chips of the table: 4¢, 8¢, 20¢ or 40¢. Big chips stack only on Big chips; anything goes on top. |
| 86 | Little Chip | Little chip: a shop chip (Common). Tiny: no worth, no height, one hit instance. Only Little chips go on top of it. |
| 87 | Fibonacci Chip | Fibonacci chip: a shop chip (Rare). Two on one stack merge into the next number after the larger. |
| 88 | Prime Chip | Prime chip: a shop chip (Rare). Two on one stack merge into the next prime after the larger. |
| 89 | Magic Hat Chip | Magic Hat: a movable hole that always sits at the bottom of its stack and swallows the chip on it each turn. The Conjure trick plants it on your opponent; one in three Hazard tilts is a Hat under one of your own stacks. |
| 90 | B 52¢ Chip | B-52: orbital vehicle from the B-52 Calamity. Flies one space along a row each turn, dropping a 52¢ Boom chip. |
| 93 | Fish "n Chip | Fish 'n Chip: food. +1 Conviction for every chip under it (n, up to 3) this turn. |
| 94 | Hamburger Chip | Hamburger chip: food. Plain: +2 Roll, −1 Bid. Bun-Hamburger-Bun, eaten from the top Bun: +1 Draw, Roll and Bid for 2 turns. |
| 95 | Bun Chip | Bun chip: food (+1 Conviction), and the top and bottom of a burger. |
| 96 | Egg Chip | Egg chip: laid by a Dragon on its Roost (the Spawner tilt). Edible (+2 Roll, −1 Draw for 2 turns), or a Dragon egg: 5 hit instances, hatches a Dragon after 5 hatch steps unless eaten or broken. |
| 97 | Spy Chip | Spy chip: a shop chip (Rare) that looks like a 1¢ chip to your opponent. On top of your stack, your opponent plays each phase first and you see it, aims included, before you commit. |
| 98 | Doom Chip | Doom chip: the Foretell trick (Correction) plants them on your opponent's front stacks; they see 1¢ chips. Once all their stacks are topped with Doom, each Doom chip charges 1¢ a turn (instance debt). |
| 99 | Green Chip | Royal Paradise 25¢ chip: a basic value chip worth 25¢, dealt from floor 3. |
| 100 | Purple Chip | Royal Paradise 50¢ chip: a basic value chip worth 50¢, dealt from floor 4. |
| 101 | Orange Chip | Royal Paradise 100¢ chip: a basic value chip worth 100¢, dealt from floor 4. |
| 102 | Black Chip | Royal Paradise 250¢ chip: a basic value chip worth 250¢, dealt from floor 4. |
| 103 | White Chip | Royal Paradise 500¢ chip: a basic value chip worth 500¢, dealt from the Paradise Ascent (the list gives 5000¢; read as 500¢, between Black and Silver). |
| 104 | Silver Chip | Silver Chip: a basic value chip worth 1,000¢, dealt from the Paradise Ascent. |
| 105 | Ruby Chip | Ruby Chip: a basic value chip worth 2,500¢, dealt from the Paradise Ascent. |
| 106 | Emerald Chip | Emerald Chip: a basic value chip worth 5,000¢, dealt from the Paradise Ascent. |
| 107 | Saphire Chip | Sapphire Chip: a basic value chip worth 10,000¢, dealt from the Paradise Ascent (spelled Sapphire in the game). |
| 108 | Amber Chip | Amber Chip: a basic value chip worth 25,000¢, dealt from the Paradise Ascent. |
| 109 | Diamond Chip | Diamond Chip: a basic value chip worth 50,000¢, dealt from the Paradise Ascent. |
