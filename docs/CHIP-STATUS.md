# Chip list status

Every row of the workbook chip list (`docs/CHIP-LIST.tsv`) and where it stands. The same view is in the
Library under **Chip list**. Fill in what a **Needs detail** row asks for and it can be built. Statuses live in
`js/chiplist.js`.

## Needs detail (50)

| Row | Chip | What is missing |
| --- | --- | --- |
| 8 | Resist Chip | Need: what makes it, and which fees it deters. It sits on an empty space as its own stack, so does it guard the stacks around it, its lane, or the whole position? And what sets r? |
| 9 | Zap Chip | Need: the rule in plain terms. The values are s and f¢ and the text is cut off ("is broken if fee exceeds…"). Is it a shield that shocks the attacker, or a hazard? |
| 12 | Regen x¢ Chip | Need: what a "recoup instance" pays (how many ¢, from where) and how long the modifier lasts. What makes it? |
| 18 | Coin | Need: what it is for. Artifacts are not built yet, and the text asks the same question. |
| 20 | Sticky f¢ Chip | Need: which modifiers stick (Feather, Hardened, Power…?), how long, and what makes a Sticky chip. |
| 27 | Boosted Chip | Need: is it +1 to every die, or to each roll total? What makes it (the Power chip may already cover it)? |
| 28 | Cheapened Chip | Need: the text repeats Boosted ("for each Boosted chip"). Is it −1 to the opponent's dice for each Cheapened chip? What makes it? |
| 42 | Heli-Chipter | Need: what "reverses the play order of the stack" means here (pay from the bottom first?) and what makes it. |
| 43 | Cloud Chip | Need: what makes a Cloud, how long it stays, how often it shocks, and how much faster plants grow. |
| 44 | Worm Hole Chip | Need: what makes it, and whose empty space the chips land on (yours or your opponent's). |
| 48 | Hive Chip | Need: how many bees a Hive makes and how often, and what breaks it. Depends on Bumble Bee and Honey. |
| 49 | Bumble Bee Chip | Need: Hive rules first. Flowers exist, so pollinating is ready once bees are. |
| 50 | Honey Chip | Need: the "Delicious" bonus (which attributes, how much, for how long) and how a chip is eaten. |
| 52 | Chocolate Chip | Need: the "Delicious" bonus and how a chip is eaten; what converts a chip into Chocolate. |
| 53 | Fairy Bounty Chip | Need: how a creature is "forced into debt" (creatures have no Worth here) and what the Unique Prize is. |
| 54 | Unicorn Bounty Chip | Same as the Fairy Bounty chip. |
| 55 | UFO Bounty Chip | Same as the Fairy Bounty chip. |
| 56 | Mothership Bounty Chip | Same as the Fairy Bounty chip. |
| 57 | Dragon Bounty Chip | Same as the Fairy Bounty chip. |
| 58 | Battery Chip | Need: which chips count as electrical or electronic, and what energizing does to them. |
| 62 | Upgrade Chip | Need: everything — the row has no type or text. |
| 64 | Blizzard Chip | Need: its strength value and what brings it (a Calamity tilt?). Frozen chips exist for it to make. |
| 65 | Ghost Chip | Need: what it does besides being hard to target, and where it comes from. |
| 66 | Puddle Chip | Need: a water source first (Cloud, Sprinkler). |
| 67 | Ghost Ship Chip | Need: how it is destroyed (100 hits of what?) and the Treasure chip. |
| 68 | Chip Chip | Need: the "Delicious" bonus, the value a dip adds, and how many dips a Dip chip holds. |
| 69 | Dip Chip | Same as the Chip Chip. |
| 70 | Dragon Roost Chip | Need: what places a Roost. The Dragon exists. |
| 71 | Dragon Egg Chip | Need: whose tricks hatch it ("the Owner") and where the Dragon goes once hatched. |
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
| 93 | Fish "n Chip | Need: the "n values" rule and the Delicious bonus. |
| 94 | Hamburger Chip | Need: the Delicious bonus once covered by Buns. |
| 95 | Bun Chip | Same as the Hamburger chip. |
| 96 | Egg Chip | Need: the crack and hatch conditions and what hatches. |
| 97 | Spy Chip | Need: the advantage it gives, and what it looks like to the opponent. |
| 98 | Doom Chip | Need: what places Doom chips on the opponent's stacks, and how much "instance debt" is. |

## Partly built (12)

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

## Built (35)

| Row | Chip | In the game |
| --- | --- | --- |
| 2 | Royal Paradise 1¢ chip | The 1¢ Royal Paradise chip. |
| 3 | Royal Paradise 2¢ chip | The 2¢ Royal Paradise chip, from floor 2. |
| 4 | Royal Paradise 5¢ chip | The 5¢ Royal Paradise chip, from floor 2. |
| 5 | Royal Paradise 10¢ chip | The 10¢ Royal Paradise chip, from floor 3. |
| 6 | Block Chip | Block chip: Insurance traits, Block, Settle/Fence bonuses, the Shield tilt. |
| 7 | Counter Chip | Counter chip: Block's bonus. |
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
| 29 | Harmony Chip | Harmony chip: a shop chip (Rare). |
| 30 | Debt -1¢ Chip | Debt: every Expense. |
| 31 | Burning -1¢ Chip | Burning: Scorch, the Dragon, Inferno, Volcano, Lava. |
| 32 | Corrupting -1¢ Chip | Corrupting: Infect. |
| 33 | Shocking -1¢ Chip | Shocking: Zap's bonus. |
| 34 | Poison -1¢  Chip | Poison: Envenom. |
| 35 | Boom -5¢ Chip | Boom: Rig. |
| 36 | Dynamite Chip | Dynamite: the Fuse trick (Expense, Technician). |
| 47 | Ward Chip | Ward chip: a shop chip (Royal). |
| 51 | Wood Chip | Wood chip: falls from a felled Tree; blocks two entire fees. |
| 59 | Clay Chip | Clay chip: a shop chip (Uncommon). |
| 60 | Brick Chip | Brick chip: fire bakes Clay. |
| 61 | Acid Chip | Acid: Melt. |
| 75 | Sun Chip | Sun chip: a shop chip (Rare). Flowers bloom twice as many Petals and Trees grow twice as fast. |
| 76 | Shadow Chip | Shadow chip: a shop chip (Uncommon). |
| 79 | Reducer Chip | Reducer chip: a shop chip (Uncommon). Each fee on its stack is 1¢ smaller. |
| 87 | Fibonacci Chip | Fibonacci chip: a shop chip (Rare). Two on one stack merge into the next number after the larger. |
| 88 | Prime Chip | Prime chip: a shop chip (Rare). Two on one stack merge into the next prime after the larger. |
