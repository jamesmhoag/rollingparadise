# Chip list status

Every row of the workbook chip list (`docs/CHIP-LIST.tsv`) and where it stands. The same view is in the
Library under **Chip list**. Fill in what a **Needs detail** row asks for and it can be built. Statuses live in
`js/chiplist.js`.

## Needs detail (29)

| Row | Chip | What is missing |
| --- | --- | --- |
| 12 | Regen x¢ Chip | Need: what a "recoup instance" pays (how many ¢, from where) and how long the modifier lasts. What makes it? |
| 18 | Coin | Need: what it is for. Artifacts are not built yet, and the text asks the same question. |
| 20 | Sticky f¢ Chip | Need: which modifiers stick (Feather, Hardened, Power…?), how long, and what makes a Sticky chip. |
| 42 | Heli-Chipter | Need: what "reverses the play order of the stack" means here (pay from the bottom first?) and what makes it. |
| 43 | Cloud Chip | Need: what makes a Cloud, how long it stays, how often it shocks, and how much faster plants grow. |
| 48 | Hive Chip | Need: how many bees a Hive makes and how often, and what breaks it. Depends on Bumble Bee and Honey. |
| 49 | Bumble Bee Chip | Need: Hive rules first. Flowers exist, so pollinating is ready once bees are. |
| 58 | Battery Chip | Need: which chips count as electrical or electronic, and what energizing does to them. |
| 64 | Blizzard Chip | Need: its strength value and what brings it (a Calamity tilt?). Frozen chips exist for it to make. |
| 65 | Ghost Chip | Need: what it does besides being hard to target, and where it comes from. |
| 66 | Puddle Chip | Need: a water source first (Cloud, Sprinkler). |
| 67 | Ghost Ship Chip | Need: how it is destroyed (100 hits of what?) and the Treasure chip. |
| 72 | Treasure Chip | Need: how many Gold chips it holds, how it opens, and the curse chance. |
| 73 | Cursed Chip | Need: the negative effect while it is in a pile. |
| 77 | Repeater Chip | Need: which roll value repeats ("based on the count of chips below it") and how often. |
| 78 | Mimic Chip | Need: whose tricks are repeated (the owner's, or tricks aimed at the owner) and what makes it. |
| 80 | Forgetter Chip | Need: same as Repeater — which roll value is negated. |
| 81 | Tesla Chip | Need: which effects count as lightning (Zap, Shocking chips?) and how many targets it sends back to. |
| 82 | Absorbtion Chip | Need: which effects count as lightning, and how many it absorbs. |
| 83 | Sprinkler Chip | Need: watering rules (Puddle) and how much faster plants grow. |
| 84 | Uranium Chip | Need: what places it (it harms its own stack, so a trick or a tilt?). |
| 85 | Big Chip | Need: chips that cover 5 spaces are a new table rule. Which 5 (a plus shape?) and its value. |
| 86 | Little Chip | Need: its value and how many fit on a space. |
| 89 | Magic Hat Chip | Need: how a Hole moves ("movable hole") and who moves it. |
| 90 | B 52¢ Chip | Need: what launches it, and the size of the Boom it drops (52¢ of Debt?). |
| 91 | Heavy Chip | Need: what a "Burden" is. |
| 92 | Metal Chip | Need: what it deters and what its burden is. |
| 97 | Spy Chip | Need: the advantage it gives, and what it looks like to the opponent. |
| 98 | Doom Chip | Need: what places Doom chips on the opponent's stacks, and how much "instance debt" is. |

## Partly built (13)

| Row | Chip | In the game |
| --- | --- | --- |
| 11 | Hardened p¢ Chip | Built as a stack state, not a chip: Brace (Insurance, Technician) and the Crown chip Harden a stack. Need: should it become a chip on top? |
| 17 | Hole Chip | Built as a space state, not a chip: the Hazard tilt, Acid and the Mole make Holes. Need: should it be a movable chip (see Magic Hat)? |
| 25 | Opportunity 1¢ Chip | Opportunity chip: earned for unused rolls. Differs: the list says leftovers refund that turn's bets; the game pays a chip per leftover. Need: which? |
| 37 | Black Hole Chip | Built as a Calamity that takes a Bar space, not a chip. Need: what else places one? |
| 38 | UFO Chip | Built as a creature that visits the table (Creature tilt), not a chip with a worth. See the Bounty chips. |
| 39 | Mothership Chip | Built as a creature (from the 10¢ floors). |
| 40 | Fairy Chip | Built as a creature. |
| 41 | Unicorn Chip | Built as a creature (from the 5¢ floors). |
| 45 | Volcano Chip | Built as a Calamity: launches Burning chips for 4 turns. Missing: the lower max height after it goes dormant (how much lower?). |
| 46 | Dragon Chip | Built as a creature. |
| 63 | Tornado Chip | Built as a Calamity: stacks under 3 high are thrown about. Need: its "strength" value, if not 3. |
| 74 | Mole Chip | Built as a creature: digs a Hole. |
| 96 | Egg Chip | Egg chip: food (+2 Roll, −1 Draw for 2 turns). Missing: crack and hatch conditions and what hatches. |

## Built (55)

| Row | Chip | In the game |
| --- | --- | --- |
| 2 | Royal Paradise 1¢ chip | The 1¢ Royal Paradise chip. |
| 3 | Royal Paradise 2¢ chip | The 2¢ Royal Paradise chip, from floor 2. |
| 4 | Royal Paradise 5¢ chip | The 5¢ Royal Paradise chip, from floor 2. |
| 5 | Royal Paradise 10¢ chip | The 10¢ Royal Paradise chip, from floor 3. |
| 6 | Block Chip | Block chip: Insurance traits, Block, Settle/Fence bonuses, the Shield tilt. |
| 7 | Counter Chip | Counter chip: Block's bonus. |
| 8 | Resist Chip | Resist chip: made by Resist Cards (found in the dodgy corner; r 2 or 3). Sits at the base of a front Bar stack; fees under r¢ on it are deterred, like a Red chip keeps fire off. |
| 9 | Zap Chip | Zap chip: a shop chip (Uncommon). A fee of 3¢ or less on its stack shocks the attacker; a bigger fee shorts it out. |
| 10 | Feather p¢ Chip | Feather: the Float trick (Insurance, Rascal). |
| 13 | Transpara-Chip | Transpara-Chip: a shop chip (Rare). |
| 14 | Power Chip | Power chip: a shop chip (Uncommon), +1 to your roll effects each turn for 4 turns. |
| 15 | Control Chip | Control chip: a shop chip (Uncommon), −1 to your opponent's roll effects each turn for 4 turns. |
| 16 | Anchor Chip | Anchor chip: a shop chip (Uncommon). |
| 19 | Frozen f¢ Chip | Frozen chip: the Chill trick (Insurance). |
| 21 | Seed p¢ Chip | Seed chip: a shop chip (Uncommon). Sprouts into a Flower. |
| 22 | Tree Chip | Tree chip: a shop chip (Rare). Grows on an empty space, seeds the stacks around it, and falls into Wood when a fee hits it. |
| 23 | Flower Chip | Flower chip: grown from a Seed. |
| 24 | Petal Chip | Petal chip: bloomed by a Flower; blocks an entire fee. |
| 26 | Golded 2*p¢ Chip | Gold: the Gild trick. |
| 27 | Boosted Chip | Boosted chip: a shop chip (Rare). Every die you roll shows 1 more per Boosted chip in your position. |
| 28 | Cheapened Chip | Cheapened chip: a shop chip (Rare), read as the opposite of Boosted: your opponent's dice show 1 less per Cheapened chip in your position. |
| 29 | Harmony Chip | Harmony chip: a shop chip (Rare). |
| 30 | Debt -1¢ Chip | Debt: every Expense. |
| 31 | Burning -1¢ Chip | Burning: Scorch, the Dragon, Inferno, Volcano, Lava. |
| 32 | Corrupting -1¢ Chip | Corrupting: Infect. |
| 33 | Shocking -1¢ Chip | Shocking: Zap's bonus. |
| 34 | Poison -1¢  Chip | Poison: Envenom. |
| 35 | Boom -5¢ Chip | Boom: Rig. |
| 36 | Dynamite Chip | Dynamite: the Fuse trick (Expense, Technician). |
| 44 | Worm Hole Chip | Worm Hole: a Calamity (Challenge tilt). Opens on an empty Meter space; chips that land on it are pulled through to your opponent's side. |
| 47 | Ward Chip | Ward chip: a shop chip (Royal). |
| 50 | Honey Chip | Honey chip: food sold at the Chip Exchange (+1 Roll, +1 Bid for a turn). The Hive that makes it still needs detail. |
| 51 | Wood Chip | Wood chip: falls from a felled Tree; blocks two entire fees. |
| 52 | Chocolate Chip | Chocolate chip: food sold at the Chip Exchange (+1 Draw for 2 turns). |
| 53 | Fairy Bounty Chip | Bounty system: a creature hovering over a stack soaks fees that land there; at 25¢ of Debt the Fairy is driven off and drops this chip. Pays 25¢ and a found card. |
| 54 | Unicorn Bounty Chip | Bounty: at 250¢ of Debt. Pays 250¢ and a free die upgrade on your best die. |
| 55 | UFO Bounty Chip | Bounty: at 50¢ of Debt. Pays 50¢ and a d8. |
| 56 | Mothership Bounty Chip | Bounty: at 500¢ of Debt. Pays 500¢ and a d20. |
| 57 | Dragon Bounty Chip | Bounty: at 250¢ of Debt. Pays 250¢ and a Scorch trick. |
| 59 | Clay Chip | Clay chip: a shop chip (Uncommon). |
| 60 | Brick Chip | Brick chip: fire bakes Clay. |
| 61 | Acid Chip | Acid: Melt. |
| 62 | Upgrade Chip | Upgrade chip: a shop chip (Epic). On your Meter it upgrades every roll (Escalate, +1, Gamble, more +1 as you add chips); bid on a trick it plays that trick one upgrade higher. |
| 68 | Chip Chip | Chip Chip: food (+1 Steal for a turn, doubled when dipped). |
| 69 | Dip Chip | Dip chip: a shop chip on its own space; the next 3 Chip Chips you eat are dipped for double. |
| 70 | Dragon Roost Chip | Dragon Roost: one in two Spawner tilts is a Roost. It takes a Bar space and calls a Dragon every third turn, which nests and lays an egg. |
| 71 | Dragon Egg Chip | Dragon Egg: laid on a Roost. No Dragon comes while it sits there; play a trick totalling 10 or more and it hatches a Dragon onto your opponent. |
| 75 | Sun Chip | Sun chip: a shop chip (Rare). Flowers bloom twice as many Petals and Trees grow twice as fast. |
| 76 | Shadow Chip | Shadow chip: a shop chip (Uncommon). |
| 79 | Reducer Chip | Reducer chip: a shop chip (Uncommon). Each fee on its stack is 1¢ smaller. |
| 87 | Fibonacci Chip | Fibonacci chip: a shop chip (Rare). Two on one stack merge into the next number after the larger. |
| 88 | Prime Chip | Prime chip: a shop chip (Rare). Two on one stack merge into the next prime after the larger. |
| 93 | Fish "n Chip | Fish 'n Chip: food. +1 Conviction for every chip under it (n, up to 3) this turn. |
| 94 | Hamburger Chip | Hamburger chip: food. Plain: +2 Roll, −1 Bid. Bun-Hamburger-Bun, eaten from the top Bun: +1 Draw, Roll and Bid for 2 turns. |
| 95 | Bun Chip | Bun chip: food (+1 Conviction), and the top and bottom of a burger. |
