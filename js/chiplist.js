// Every chip on the workbook's chip list (docs/CHIP-LIST.tsv) and where it stands in the game.
// status: 'built' (in the game as a chip), 'partial' (in the game in another form, or with a gap),
// 'needs' (cannot be built yet: `note` says what is missing). Generated from the sheet; edit `note` freely.
export const CHIP_LIST = [
{
"row": 2,
"name": "Royal Paradise 1¢ chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "Versatile",
"source": "Match Prep",
"text": "Basic Chip worth 1¢ at the Royal Paradise",
"status": "built",
"note": "The 1¢ Royal Paradise chip.",
"show": {
"kind": "std",
"value": 1
}
},
{
"row": 3,
"name": "Royal Paradise 2¢ chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "Versatile",
"source": "Match Prep",
"text": "Basic Chip worth 2¢ at the Royale Paradise converts chip fee remainders under 2¢  into debt chips",
"status": "built",
"note": "The 2¢ Royal Paradise chip, from floor 2.",
"show": {
"kind": "std",
"value": 2
}
},
{
"row": 4,
"name": "Royal Paradise 5¢ chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "Versatile",
"source": "Match Prep",
"text": "Basic Chip worth 5¢ at the Royale Paradise  converts chip fee remainders under 5¢  into debt chips",
"status": "built",
"note": "The 5¢ Royal Paradise chip, from floor 2.",
"show": {
"kind": "std",
"value": 5
}
},
{
"row": 5,
"name": "Royal Paradise 10¢ chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "Versatile",
"source": "Match Prep",
"text": "Basic Chip worth 10¢ at the Royale Paradise converts chip fee remainders under 10¢  into debt chips",
"status": "built",
"note": "The 10¢ Royal Paradise chip, from floor 3.",
"show": {
"kind": "std",
"value": 10
}
},
{
"row": 6,
"name": "Block Chip",
"type": "Defense",
"permanence": "Fragile",
"placement": "Versatile",
"source": "Spawned",
"text": "Basic Deterent Chip good for 1¢ chip fee in a match",
"status": "built",
"note": "Block chip: Insurance traits, Block, Settle/Fence bonuses, the Shield tilt.",
"show": {
"kind": "block",
"value": 0
}
},
{
"row": 7,
"name": "Counter Chip",
"type": "Defense",
"permanence": "Fragile",
"placement": "Versatile",
"source": "Spawned",
"text": "Basic Deterent Chip good for 1¢ chip fee in a match for both you and the charging Roller",
"status": "built",
"note": "Counter chip: Block's bonus.",
"show": {
"kind": "counter",
"value": 0
}
},
{
"row": 8,
"name": "Resist Chip",
"type": "Defense",
"permanence": "Fragile",
"placement": "Empty Space",
"source": "Spawned",
"text": "Basic Deterent Chip deters damage instance under under r¢,  each resist chip is a stack tall and can not exceed max stack height in its value",
"status": "built",
"note": "Resist chip: made by Resist Cards (found in the dodgy corner; r 2 or 3). Sits at the base of a front Bar stack; fees under r¢ on it are deterred, like a Red chip keeps fire off.",
"show": {
"kind": "resist",
"value": 0,
"r": 2
}
},
{
"row": 9,
"name": "Zap Chip",
"type": "Hazard",
"permanence": "Fragile",
"placement": "Available Stack",
"source": "Spawned",
"text": "Deterent Chip Shocks Rollerof fees with any debt it creates, is broken if fee exceeds",
"status": "built",
"note": "Zap chip: a shop chip (Uncommon). A fee of 3¢ or less on its stack shocks the attacker; a bigger fee shorts it out.",
"show": {
"kind": "std",
"value": 1,
"resist": "zap"
}
},
{
"row": 10,
"name": "Feather p¢ Chip",
"type": "Defense",
"permanence": "Temporary",
"placement": "Targeted Chip",
"source": "Chip Conversion",
"text": "Turn limited Chip Modifier that causes charging Roller to miss any fees greater than the value of the stack",
"status": "built",
"note": "Feather: the Float trick (Insurance, Rascal).",
"show": {
"kind": "std",
"value": 2,
"feather": 2
}
},
{
"row": 11,
"name": "Hardened p¢ Chip",
"type": "Defense",
"permanence": "Temporary",
"placement": "Targeted Chip",
"source": "Chip Conversion",
"text": "Turn limited Chip Modifier that causes chips to cover any fee cost so that each fee instance cost one Chip until depleted",
"status": "partial",
"note": "Built as a stack state, not a chip: Brace (Insurance, Technician) and the Crown chip Harden a stack. Need: should it become a chip on top?",
"show": {
"kind": "std",
"value": 5
}
},
{
"row": 12,
"name": "Regen x¢ Chip",
"type": "Utility",
"permanence": "Temporary",
"placement": "Targeted Chip",
"source": "Chip Conversion",
"text": "Turn limited Chip Modifier that causes remaining chips to grant recoup instanceTurn limited",
"status": "needs",
"note": "Need: what a \"recoup instance\" pays (how many ¢, from where) and how long the modifier lasts. What makes it?",
"show": null
},
{
"row": 13,
"name": "Transpara-Chip",
"type": "Defense",
"permanence": "Temporary",
"placement": "Targeted Chip",
"source": "Chip Conversion",
"text": "Chip can not be targeted by fee instances, but does not avoid extraneous fees frm fire, shock, virus, etc",
"status": "built",
"note": "Transpara-Chip: a shop chip (Rare).",
"show": {
"kind": "std",
"value": 1,
"resist": "transpara"
}
},
{
"row": 14,
"name": "Power Chip",
"type": "Utility",
"permanence": "Temporary",
"placement": "Targeted Chip",
"source": "Stack Conversion",
"text": "Chip Conversion that generates more boosting influence that turn",
"status": "built",
"note": "Power chip: a shop chip (Uncommon), +1 to your roll effects each turn for 4 turns.",
"show": {
"kind": "std",
"value": 1,
"resist": "power"
}
},
{
"row": 15,
"name": "Control Chip",
"type": "Utility",
"permanence": "Temporary",
"placement": "Targeted Chip",
"source": "Stack Conversion",
"text": "Chip Conversion that generates more enfeebiling influence that turn",
"status": "built",
"note": "Control chip: a shop chip (Uncommon), −1 to your opponent's roll effects each turn for 4 turns.",
"show": {
"kind": "std",
"value": 1,
"resist": "control"
}
},
{
"row": 16,
"name": "Anchor Chip",
"type": "Utility",
"permanence": "Match",
"placement": "Empty Space",
"source": "Spawned",
"text": "Match Limited Chip that can not be moved so any chips placed on top of it can not be affected by movement effects",
"status": "built",
"note": "Anchor chip: a shop chip (Uncommon).",
"show": {
"kind": "std",
"value": 1,
"resist": "anchor"
}
},
{
"row": 17,
"name": "Hole Chip",
"type": "Hazard",
"permanence": "Match",
"placement": "Empty Space",
"source": "Spawned",
"text": "Match Limited Chip that creates a void on any empty stack it is moved to, chips moved onto this space are lost",
"status": "partial",
"note": "Built as a space state, not a chip: the Hazard tilt, Acid and the Mole make Holes. Need: should it be a movable chip (see Magic Hat)?",
"show": null
},
{
"row": 18,
"name": "Coin",
"type": "Artifact",
"permanence": "Resiliant",
"placement": "Empty Space",
"source": "Match Prep",
"text": "This isn't a chip at all its wider than the space, what can you even do with this? Can not be used to pay fees",
"status": "needs",
"note": "Need: what it is for. Artifacts are not built yet, and the text asks the same question.",
"show": null
},
{
"row": 19,
"name": "Frozen f¢ Chip",
"type": "Defense",
"permanence": "Fragile",
"placement": "Available Stack",
"source": "Stack Conversion",
"text": "Match Limited Chip Modifier that combines Royal Paradise chips together summing the value, lesser fees increments are convert to debt chips, Frozen chips can not be burned, corrupted, or shocked or turned into another type of chip",
"status": "built",
"note": "Frozen chip: the Chill trick (Insurance).",
"show": {
"kind": "std",
"value": 7,
"frozen": true
}
},
{
"row": 20,
"name": "Sticky f¢ Chip",
"type": "Utility",
"permanence": "Fragile",
"placement": "Available Stack",
"source": "Stack Conversion",
"text": "Macth Limited Chip Modifier that spread to each chip above and below it in the stack and permemnently applies turn limited chip modifiers to each chip in the sticky stack (limited to first modifier stuck) can not be turned into another type of chip",
"status": "needs",
"note": "Need: which modifiers stick (Feather, Hardened, Power…?), how long, and what makes a Sticky chip.",
"show": null
},
{
"row": 21,
"name": "Seed p¢ Chip",
"type": "Vehicle",
"permanence": "Fragile",
"placement": "Available Stack",
"source": "Chip Conversion",
"text": "Match Limited Chip Modifier that is planted on a stack of chips (min 2) converting the top most to a flower chip that blooms new petal every turn, takes one fee instance to be removed",
"status": "built",
"note": "Seed chip: a shop chip (Uncommon). Sprouts into a Flower.",
"show": {
"kind": "std",
"value": 1,
"resist": "seed"
}
},
{
"row": 22,
"name": "Tree Chip",
"type": "Spawner",
"permanence": "Fragile",
"placement": "Empty Space",
"source": "Space Conversion",
"text": "Grows until it reaches max stack height then drops seeds on adjacent piles, Count is based on height up to max adjacent spaces count (8), When broken it spawns wood chips in adjacent spaces based on height",
"status": "built",
"note": "Tree chip: a shop chip (Rare). Grows on an empty space, seeds the stacks around it, and falls into Wood when a fee hits it.",
"show": {
"kind": "tree",
"value": 0
}
},
{
"row": 23,
"name": "Flower Chip",
"type": "Spawner",
"permanence": "Fragile",
"placement": "Available Stack",
"source": "Stack Conversion",
"text": "Grows Petal Chips and Drop themo on adajacent stacks each turn, Count is based on chips it is rooted in up to max adjacent spaces amount (8)",
"status": "built",
"note": "Flower chip: grown from a Seed.",
"show": {
"kind": "flower",
"value": 0
}
},
{
"row": 24,
"name": "Petal Chip",
"type": "Defense",
"permanence": "Fragile",
"placement": "Available Stack",
"source": "Spawned",
"text": "Turn Limited Chip that is bloomed from an adjacent flower chip on any stack that has capacity available, Each petal takes one fee instance to be removed, Petals do not stack and new ones bloom only if stack has no petal or flower chips",
"status": "built",
"note": "Petal chip: bloomed by a Flower; blocks an entire fee.",
"show": {
"kind": "petal",
"value": 0
}
},
{
"row": 25,
"name": "Opportunity 1¢ Chip",
"type": "Bounty",
"permanence": "Fragile",
"placement": "Versatile",
"source": "Spawned",
"text": "Chip that is can be earned during a match and used like any chip, remaining opportunities at the end of match refunds equvilant amount of bets made by the Roller that turn (bets must exceed or match remaining opportunity chips)",
"status": "partial",
"note": "Opportunity chip: earned for unused rolls. Differs: the list says leftovers refund that turn's bets; the game pays a chip per leftover. Need: which?",
"show": {
"kind": "opp",
"value": 1
}
},
{
"row": 26,
"name": "Golded 2*p¢ Chip",
"type": "Bounty",
"permanence": "Fragile",
"placement": "Versatile",
"source": "Chip Conversion",
"text": "Basic Chip that is turned to Gold, it can no longer be used, but is convert into 2X chips remaining amount of Gold Chips",
"status": "built",
"note": "Gold: the Gild trick.",
"show": {
"kind": "std",
"value": 5,
"gold": true
}
},
{
"row": 27,
"name": "Boosted Chip",
"type": "Utility",
"permanence": "Fragile",
"placement": "Versatile",
"source": "Chip Conversion",
"text": "Increases Dice Values for each Boosted chip in  the pile",
"status": "built",
"note": "Boosted chip: a shop chip (Rare). Every die you roll shows 1 more per Boosted chip in your position.",
"show": {
"kind": "std",
"value": 1,
"resist": "boosted"
}
},
{
"row": 28,
"name": "Cheapened Chip",
"type": "Aura",
"permanence": "Fragile",
"placement": "Versatle",
"source": "Chip Conversion",
"text": "Decreases Dice Values for each Boosted chip in the pile",
"status": "built",
"note": "Cheapened chip: a shop chip (Rare), read as the opposite of Boosted: your opponent's dice show 1 less per Cheapened chip in your position.",
"show": {
"kind": "std",
"value": 1,
"resist": "cheapened"
}
},
{
"row": 29,
"name": "Harmony Chip",
"type": "Aura",
"permanence": "Fragile",
"placement": "Versatile",
"source": "Spawned",
"text": "Cleanses negative valued chips leaving Basic Chips behind",
"status": "built",
"note": "Harmony chip: a shop chip (Rare).",
"show": {
"kind": "std",
"value": 1,
"resist": "harmony"
}
},
{
"row": 30,
"name": "Debt -1¢ Chip",
"type": "Hazard",
"permanence": "Consuming",
"placement": "Versatile",
"source": "Spawned",
"text": "Fee Chips cost Roller if chips are available behind it in the pile and fee is not deterred that turn, these chips can not be used and prevent using any chips",
"status": "built",
"note": "Debt: every Expense.",
"show": {
"kind": "debt",
"value": 3
}
},
{
"row": 31,
"name": "Burning -1¢ Chip",
"type": "Hazard",
"permanence": "Consuming",
"placement": "Targeted Stack",
"source": "Chip Conversion",
"text": "Fee Chips that have a 30% chance to spread to adjacent piles each turn they remaining in the pile",
"status": "built",
"note": "Burning: Scorch, the Dragon, Inferno, Volcano, Lava.",
"show": {
"kind": "burn",
"value": 0
}
},
{
"row": 32,
"name": "Corrupting -1¢ Chip",
"type": "Hazard",
"permanence": "Consuming",
"placement": "Targeted Stack",
"source": "Chip Conversion",
"text": "Fee Chips that have a 60% chance to spread to random piles each turn they remaining in the pile",
"status": "built",
"note": "Corrupting: Infect.",
"show": {
"kind": "corrupt",
"value": 0
}
},
{
"row": 33,
"name": "Shocking -1¢ Chip",
"type": "Hazard",
"permanence": "Consuming",
"placement": "Targeted Stack",
"source": "Chip Conversion",
"text": "Fee Chips that charge random amount of random  piles each turn they are remaining in the pile",
"status": "built",
"note": "Shocking: Zap's bonus.",
"show": {
"kind": "shock",
"value": 0
}
},
{
"row": 34,
"name": "Poison -1¢  Chip",
"type": "Hazard",
"permanence": "Consuming",
"placement": "Targeted Stack",
"source": "Chip Conversion",
"text": "Lingers on the stack until it is completely depleted",
"status": "built",
"note": "Poison: Envenom.",
"show": {
"kind": "poison",
"value": 0
}
},
{
"row": 35,
"name": "Boom -5¢ Chip",
"type": "Hazard",
"permanence": "Temporary",
"placement": "Available Stack",
"source": "Chip Conversion",
"text": "Added to any open stack, and the on the next turn charges fees to the stack its on and all adjacent stacks",
"status": "built",
"note": "Boom: Rig.",
"show": {
"kind": "boom",
"value": 0
}
},
{
"row": 36,
"name": "Dynamite Chip",
"type": "Hazard",
"permanence": "Temporary",
"placement": "Empty Space",
"source": "Space Conversion",
"text": "Consumes one chips in the dynamite stack until all are spent, then explodes destroying all chips in adjacent stacks",
"status": "built",
"note": "Dynamite: the Fuse trick (Expense, Technician).",
"show": {
"kind": "dynamite",
"value": 0
}
},
{
"row": 37,
"name": "Black Hole Chip",
"type": "Hazard",
"permanence": "Match",
"placement": "Versatile",
"source": "Space Conversion",
"text": "Sucks in adjacent chips each turn which are lost",
"status": "partial",
"note": "Built as a Calamity that takes a Bar space, not a chip. Need: what else places one?",
"show": null
},
{
"row": 38,
"name": "UFO Chip",
"type": "Creature",
"permanence": "Temporary",
"placement": "Versatile",
"source": "Encountered",
"text": "Flying Chip That removes a chip from a stack then flies back its home planet, Chips taken are lost",
"status": "partial",
"note": "Built as a creature that visits the table (Creature tilt), not a chip with a worth. See the Bounty chips.",
"show": null
},
{
"row": 39,
"name": "Mothership Chip",
"type": "Creature",
"permanence": "Temporary",
"placement": "Available Stack",
"source": "Encountered",
"text": "Flying Chip That removes chips in a stack each turn until they are all depleted, Chips taken are lost",
"status": "partial",
"note": "Built as a creature (from the 10¢ floors).",
"show": null
},
{
"row": 40,
"name": "Fairy Chip",
"type": "Creature",
"permanence": "Temporary",
"placement": "Available Stack",
"source": "Encountered",
"text": "Converts the top chip in the stack below it into a random chip of any type, Chaos Reigns! it cries as it flies away at the end of turn",
"status": "partial",
"note": "Built as a creature.",
"show": null
},
{
"row": 41,
"name": "Unicorn Chip",
"type": "Creature",
"permanence": "Temporary",
"placement": "Available Stack",
"source": "Encountered",
"text": "Converts all chips in the stack below it into random chips of any type, Chaos Reigns! it cries as it flies away at the end of turn",
"status": "partial",
"note": "Built as a creature (from the 5¢ floors).",
"show": null
},
{
"row": 42,
"name": "Heli-Chipter",
"type": "Utility",
"permanence": "Match",
"placement": "Available Stack",
"source": "Spawned",
"text": "Lifts stack below it off the table granting flying to each of the chips and reverses the play order of the stack to bottom to top",
"status": "needs",
"note": "Need: what \"reverses the play order of the stack\" means here (pay from the bottom first?) and what makes it.",
"show": null
},
{
"row": 43,
"name": "Cloud Chip",
"type": "Hazard",
"permanence": "Temporary",
"placement": "Versatile",
"source": "Spawned",
"text": "Rains on the space or stack below it cleansing the chips, and removing modifiers (melting ice, extinguishing fire, nullfiying corruption etc) Makes plants grow faster/produce more, can randomly shock random stacks",
"status": "needs",
"note": "Need: what makes a Cloud, how long it stays, how often it shocks, and how much faster plants grow.",
"show": null
},
{
"row": 44,
"name": "Worm Hole Chip",
"type": "Hazard",
"permanence": "Temporary",
"placement": "Empty Space",
"source": "Space Conversion",
"text": "Any chips placed on top of the Worm Hole is transported it another empty space",
"status": "built",
"note": "Worm Hole: a Calamity (Challenge tilt). Opens on an empty Meter space; chips that land on it are pulled through to your opponent's side.",
"show": null
},
{
"row": 45,
"name": "Volcano Chip",
"type": "Hazard",
"permanence": "Temporary",
"placement": "Versatile",
"source": "Space Conversion",
"text": "Erupts destroying all in the stack on the space and launches burning chips at  random stacks  each turn it is active, once dormant the space returns to normal but with a lower max height",
"status": "partial",
"note": "Built as a Calamity: launches Burning chips for 4 turns. Missing: the lower max height after it goes dormant (how much lower?).",
"show": null
},
{
"row": 46,
"name": "Dragon Chip",
"type": "Creature",
"permanence": "Temporary",
"placement": "Available Stack",
"source": "Encountered",
"text": "Breathes burning chips on the stack beneath it",
"status": "partial",
"note": "Built as a creature.",
"show": null
},
{
"row": 47,
"name": "Ward Chip",
"type": "Utility",
"permanence": "Match",
"placement": "Empty Space",
"source": "Space Conversion",
"text": "Nullifies the highest value depleting effect each turn",
"status": "built",
"note": "Ward chip: a shop chip (Royal).",
"show": {
"kind": "std",
"value": 1,
"resist": "ward"
}
},
{
"row": 48,
"name": "Hive Chip",
"type": "Spawner",
"permanence": "Match",
"placement": "Empty Space",
"source": "Stack Conversion",
"text": "Create bumble bee chips and create Honey with Pollenate Bumble Bee Chips",
"status": "needs",
"note": "Need: how many bees a Hive makes and how often, and what breaks it. Depends on Bumble Bee and Honey.",
"show": null
},
{
"row": 49,
"name": "Bumble Bee Chip",
"type": "Creature",
"permanence": "Temporary",
"placement": "Adjacent Versatile",
"source": "Spawned",
"text": "Moves to the nearest flower and pollenates it causing it to bloom instantly for max value, and causing the bee to become a pollenate bumble bee, which returns to the hive on the next turn",
"status": "needs",
"note": "Need: Hive rules first. Flowers exist, so pollinating is ready once bees are.",
"show": null
},
{
"row": 50,
"name": "Honey Chip",
"type": "Consumable",
"permanence": "Delicious",
"placement": "Adajacent Stack",
"source": "Stack Conversion",
"text": "Has Sticky, Golden, and  Delicious chip effect properties allowing it to be consumed for temporary attribute bonuses",
"status": "built",
"note": "Honey chip: food sold at the Chip Exchange (+1 Roll, +1 Bid for a turn). The Hive that makes it still needs detail.",
"show": {
"kind": "food",
"value": 0,
"shop": "honey"
}
},
{
"row": 51,
"name": "Wood Chip",
"type": "Defense",
"permanence": "Fragile",
"placement": "Adjacent Versatile",
"source": "Stack Conversion",
"text": "Generated from a felled  Tree chip take two fee instances to break",
"status": "built",
"note": "Wood chip: falls from a felled Tree; blocks two entire fees.",
"show": {
"kind": "wood",
"value": 0,
"hits": 2
}
},
{
"row": 52,
"name": "Chocolate Chip",
"type": "Consumable",
"permanence": "Delicious",
"placement": "Targeted Stack",
"source": "Chip Conversion",
"text": "Can be consumed to gain temporary attribute bonuses",
"status": "built",
"note": "Chocolate chip: food sold at the Chip Exchange (+1 Draw for 2 turns).",
"show": {
"kind": "food",
"value": 0,
"shop": "chocolate"
}
},
{
"row": 53,
"name": "Fairy Bounty Chip",
"type": "Bounty",
"permanence": "Resiliant",
"placement": "",
"source": "Chip Conversion",
"text": "Drop after forcing a fairy into debt.  The chip can be used  and moved but is fragile and breaks with any instance of damage, can be exchanged for Royal Paradise Chips and a Unique Prize",
"status": "built",
"note": "Bounty system: a creature hovering over a stack soaks fees that land there; at 25¢ of Debt the Fairy is driven off and drops this chip. Pays 25¢ and a found card.",
"show": {
"kind": "bounty",
"value": 25,
"creature": "fairy"
}
},
{
"row": 54,
"name": "Unicorn Bounty Chip",
"type": "Bounty",
"permanence": "Resiliant",
"placement": "",
"source": "Chip Conversion",
"text": "Drop after forcing a Unicorn into debt.  The chip can be used  and moved but is fragile and breaks with any instance of damage, can be exchanged for Royal Paradise Chips and a Unique Prize",
"status": "built",
"note": "Bounty: at 250¢ of Debt. Pays 250¢ and a free die upgrade on your best die.",
"show": {
"kind": "bounty",
"value": 250,
"creature": "unicorn"
}
},
{
"row": 55,
"name": "UFO Bounty Chip",
"type": "Bounty",
"permanence": "Resiliant",
"placement": "",
"source": "Chip Conversion",
"text": "Drop after forcing a UFO into debt.  The chip can be used  and moved but is fragile and breaks with any instance of damage, can be exchanged for Royal Paradise Chips and a Unique Prize",
"status": "built",
"note": "Bounty: at 50¢ of Debt. Pays 50¢ and a d8.",
"show": {
"kind": "bounty",
"value": 50,
"creature": "ufo"
}
},
{
"row": 56,
"name": "Mothership Bounty Chip",
"type": "Bounty",
"permanence": "Resiliant",
"placement": "",
"source": "Chip Conversion",
"text": "Drop after forcing a Mothership into debt.  The chip can be used  and moved but is fragile and breaks with any instance of damage, can be exchanged for Royal Paradise Chips and a Unique Prize",
"status": "built",
"note": "Bounty: at 500¢ of Debt. Pays 500¢ and a d20.",
"show": {
"kind": "bounty",
"value": 500,
"creature": "mothership"
}
},
{
"row": 57,
"name": "Dragon Bounty Chip",
"type": "Bounty",
"permanence": "Resiliant",
"placement": "",
"source": "Chip Conversion",
"text": "Drop after forcing a Dragon into debt.  The chip can be used  and moved but is fragile and breaks with any instance of damage, can be exchanged for Royal Paradise Chips and a Unique Prize",
"status": "built",
"note": "Bounty: at 250¢ of Debt. Pays 250¢ and a Scorch trick.",
"show": {
"kind": "bounty",
"value": 250,
"creature": "dragon"
}
},
{
"row": 58,
"name": "Battery Chip",
"type": "Utility",
"permanence": "Match",
"placement": "",
"source": "Chip Conversion",
"text": "Energizes electrical and electronic chips on top",
"status": "needs",
"note": "Need: which chips count as electrical or electronic, and what energizing does to them.",
"show": null
},
{
"row": 59,
"name": "Clay Chip",
"type": "Utility",
"permanence": "Fragile",
"placement": "",
"source": "Chip Conversion",
"text": "Absorbs a count of fee istances before breaking, based on the value of the chips it was converted from",
"status": "built",
"note": "Clay chip: a shop chip (Uncommon).",
"show": {
"kind": "clay",
"value": 0,
"hits": 2
}
},
{
"row": 60,
"name": "Brick Chip",
"type": "Utility",
"permanence": "Fragile",
"placement": "",
"source": "Chip Conversion",
"text": "A burn clay chip becomes a brick chip and takes twice as many instances to break",
"status": "built",
"note": "Brick chip: fire bakes Clay.",
"show": {
"kind": "brick",
"value": 0,
"hits": 4
}
},
{
"row": 61,
"name": "Acid Chip",
"type": "Hazard",
"permanence": "Consuming",
"placement": "",
"source": "Chip Conversion",
"text": "Destroys the chip under it each turn until it reaches the table then leaves a Hole",
"status": "built",
"note": "Acid: Melt.",
"show": {
"kind": "acid",
"value": 0
}
},
{
"row": 62,
"name": "Upgrade Chip",
"type": "",
"permanence": "Temporary",
"placement": "",
"source": "",
"text": "",
"status": "built",
"note": "Upgrade chip: a shop chip (Epic). On your Meter it upgrades every roll (Escalate, +1, Gamble, more +1 as you add chips); bid on a trick it plays that trick one upgrade higher.",
"show": {
"kind": "std",
"value": 1,
"resist": "upgrade"
}
},
{
"row": 63,
"name": "Tornado Chip",
"type": "Hazard",
"permanence": "Temporary",
"placement": "",
"source": "",
"text": "Tornado effects a random space/ stack if the stack is less that its strength its chips are scattered and have a chance to be lost",
"status": "partial",
"note": "Built as a Calamity: stacks under 3 high are thrown about. Need: its \"strength\" value, if not 3.",
"show": null
},
{
"row": 64,
"name": "Blizzard Chip",
"type": "Hazard",
"permanence": "Temporary",
"placement": "",
"source": "",
"text": "Giant Blizzard effect every space for one turn and obsucring it, after the turn end any stack less than its strength value is converted to a frozen chip",
"status": "needs",
"note": "Need: its strength value and what brings it (a Calamity tilt?). Frozen chips exist for it to make.",
"show": null
},
{
"row": 65,
"name": "Ghost Chip",
"type": "Creature",
"permanence": "Temporary",
"placement": "",
"source": "",
"text": "Very Spooky, like transparent chip",
"status": "needs",
"note": "Need: what it does besides being hard to target, and where it comes from.",
"show": null
},
{
"row": 66,
"name": "Puddle Chip",
"type": "Hazard",
"permanence": "Temporary",
"placement": "",
"source": "",
"text": "Space that gets water will form a puddle and can no longer be played on until it dries after a turn without being watered",
"status": "needs",
"note": "Need: a water source first (Cloud, Sprinkler).",
"show": null
},
{
"row": 67,
"name": "Ghost Ship Chip",
"type": "Vehicle",
"permanence": "Temporary",
"placement": "",
"source": "",
"text": "Sails across empty tiles to a stack of chips with a gold chip on top and steals it, chips is converted into a treasure chip if ghost ship can be managed to destroyed",
"status": "needs",
"note": "Need: how it is destroyed (100 hits of what?) and the Treasure chip.",
"show": null
},
{
"row": 68,
"name": "Chip Chip",
"type": "Consumable",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Can be dipped in a dip chip to increases value, and makes it delicious granting temporary bonus attributes",
"status": "built",
"note": "Chip Chip: food (+1 Steal for a turn, doubled when dipped).",
"show": {
"kind": "food",
"value": 0,
"shop": "chipchip"
}
},
{
"row": 69,
"name": "Dip Chip",
"type": "Consumable",
"permanence": "Limited",
"placement": "",
"source": "",
"text": "Kinda like a puddle but its dip, which can be dipped with Chip Chips enough times to expose the space again",
"status": "built",
"note": "Dip chip: a shop chip on its own space; the next 3 Chip Chips you eat are dipped for double.",
"show": {
"kind": "dip",
"value": 0,
"shop": "dip",
"dips": 3
}
},
{
"row": 70,
"name": "Dragon Roost Chip",
"type": "Spawner",
"permanence": "Match",
"placement": "",
"source": "",
"text": "If present with a dragon will cause the dragon to nest after burning a chip, leaving a new dragon egg, dargon returns to burn a chip stack after nesting, but flies off if the roost has an egg on top",
"status": "built",
"note": "Dragon Roost: one in two Spawner tilts is a Roost. It takes a Bar space and calls a Dragon every third turn, which nests and lays an egg.",
"show": null
},
{
"row": 71,
"name": "Dragon Egg Chip",
"type": "Consumable",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Hatches a Dragon after the Owner Plays a trick with a 10 or higher value",
"status": "built",
"note": "Dragon Egg: laid on a Roost. No Dragon comes while it sits there; play a trick totalling 10 or more and it hatches a Dragon onto your opponent.",
"show": null
},
{
"row": 72,
"name": "Treasure Chip",
"type": "Conditional",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Contains a random amount of gold chips but has  slight chance one is a curse chip",
"status": "needs",
"note": "Need: how many Gold chips it holds, how it opens, and the curse chance.",
"show": null
},
{
"row": 73,
"name": "Cursed Chip",
"type": "Conditional",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Can not be distinguished for a gold chip, but has a negative effect on any roller with it in thier pile. Curse Effect is lifted as soon as the Cursed coin is removed from a pile",
"status": "needs",
"note": "Need: the negative effect while it is in a pile.",
"show": null
},
{
"row": 74,
"name": "Mole Chip",
"type": "Creature",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Digs up a random spot and creates a hole in it",
"status": "partial",
"note": "Built as a creature: digs a Hole.",
"show": null
},
{
"row": 75,
"name": "Sun Chip",
"type": "Aura",
"permanence": "Temporary",
"placement": "Versatile",
"source": "",
"text": "Increases plant growth for every space on the Roller's table, but they can not obcsure chips",
"status": "built",
"note": "Sun chip: a shop chip (Rare). Flowers bloom twice as many Petals and Trees grow twice as fast.",
"show": {
"kind": "std",
"value": 1,
"resist": "sun"
}
},
{
"row": 76,
"name": "Shadow Chip",
"type": "Conditional",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Chips can not be targeted when behind taller stacks of chips",
"status": "built",
"note": "Shadow chip: a shop chip (Uncommon).",
"show": {
"kind": "std",
"value": 1,
"resist": "shadow"
}
},
{
"row": 77,
"name": "Repeater Chip",
"type": "",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Causes specific roll value (based on the count of chips below it) of effects targeted at the owner to be repeated when this chip is on top,",
"status": "needs",
"note": "Need: which roll value repeats (\"based on the count of chips below it\") and how often.",
"show": null
},
{
"row": 78,
"name": "Mimic Chip",
"type": "",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Each mimic chip on top of a pile cause each trick performed to be repeated that turn",
"status": "needs",
"note": "Need: whose tricks are repeated (the owner's, or tricks aimed at the owner) and what makes it.",
"show": null
},
{
"row": 79,
"name": "Reducer Chip",
"type": "",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Each reducer chip on top of a pile lowers targeted effect on the own of the chips",
"status": "built",
"note": "Reducer chip: a shop chip (Uncommon). Each fee on its stack is 1¢ smaller.",
"show": {
"kind": "std",
"value": 1,
"resist": "reducer"
}
},
{
"row": 80,
"name": "Forgetter Chip",
"type": "",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Causes specific roll value (based on the count of chips below it) of effects target at the owner to be negated when this chip is on top,",
"status": "needs",
"note": "Need: same as Repeater — which roll value is negated.",
"show": null
},
{
"row": 81,
"name": "Tesla Chip",
"type": "Hazard",
"permanence": "Match",
"placement": "",
"source": "",
"text": "Grabs a lightning attack and send multiple back at random targets",
"status": "needs",
"note": "Need: which effects count as lightning (Zap, Shocking chips?) and how many targets it sends back to.",
"show": null
},
{
"row": 82,
"name": "Absorbtion Chip",
"type": "Utility",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Absorbs instances of lightning",
"status": "needs",
"note": "Need: which effects count as lightning, and how many it absorbs.",
"show": null
},
{
"row": 83,
"name": "Sprinkler Chip",
"type": "Utility",
"permanence": "Match",
"placement": "",
"source": "",
"text": "Waters nearby space or stacks on the spaces, watered spaces can not be burnt and plant chip grow faster",
"status": "needs",
"note": "Need: watering rules (Puddle) and how much faster plants grow.",
"show": null
},
{
"row": 84,
"name": "Uranium Chip",
"type": "Hazard",
"permanence": "Match",
"placement": "",
"source": "",
"text": "Mutates 1 chip from an adjacent stack into another a different chip",
"status": "needs",
"note": "Need: what places it (it harms its own stack, so a trick or a tilt?).",
"show": null
},
{
"row": 85,
"name": "Big Chip",
"type": "Basic",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Chips that covers 5 total spaces so they can not fall in holes, Big chips can only be stacked on other big chips or empty spaces, but any chips can be stacked on a big chip if stack is not max height",
"status": "needs",
"note": "Need: chips that cover 5 spaces are a new table rule. Which 5 (a plus shape?) and its value.",
"show": null
},
{
"row": 86,
"name": "Little Chip",
"type": "Basic",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Chips that don't cover a full space and can only be stacked on by other Little Chips",
"status": "needs",
"note": "Need: its value and how many fit on a space.",
"show": null
},
{
"row": 87,
"name": "Fibonacci Chip",
"type": "Conditional",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Chips that when stacked on each merge into a single chip with a greater value chip, each increment is the nex in Fibonaci Sequence (1,1,2,3,5,8,13 ...)",
"status": "built",
"note": "Fibonacci chip: a shop chip (Rare). Two on one stack merge into the next number after the larger.",
"show": {
"kind": "std",
"value": 1,
"resist": "fib"
}
},
{
"row": 88,
"name": "Prime Chip",
"type": "Conditional",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Chips that when stacked on each merge into a single chip with a greater value chip, each increment is the next Prime Number (1,2,3,5,7,9,11,13,17,19....)",
"status": "built",
"note": "Prime chip: a shop chip (Rare). Two on one stack merge into the next prime after the larger.",
"show": {
"kind": "std",
"value": 1,
"resist": "prime"
}
},
{
"row": 89,
"name": "Magic Hat Chip",
"type": "Gear",
"permanence": "Fragile",
"placement": "Versatile",
"source": "Spawned",
"text": "Movable Hole",
"status": "needs",
"note": "Need: how a Hole moves (\"movable hole\") and who moves it.",
"show": null
},
{
"row": 90,
"name": "B 52¢ Chip",
"type": "Vehicle",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Advances one space along the row leaving a boom 52¢ chip on top",
"status": "needs",
"note": "Need: what launches it, and the size of the Boom it drops (52¢ of Debt?).",
"show": null
},
{
"row": 91,
"name": "Heavy Chip",
"type": "",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Burden",
"status": "needs",
"note": "Need: what a \"Burden\" is.",
"show": null
},
{
"row": 92,
"name": "Metal Chip",
"type": "",
"permanence": "Match",
"placement": "",
"source": "",
"text": "Deterent and Burden",
"status": "needs",
"note": "Need: what it deters and what its burden is.",
"show": null
},
{
"row": 93,
"name": "Fish \"n Chip",
"type": "Consumable",
"permanence": "Delicious",
"placement": "",
"source": "",
"text": "Delicious and something to do with n values",
"status": "built",
"note": "Fish 'n Chip: food. +1 Conviction for every chip under it (n, up to 3) this turn.",
"show": {
"kind": "food",
"value": 0,
"shop": "fishchip"
}
},
{
"row": 94,
"name": "Hamburger Chip",
"type": "Consumable",
"permanence": "Delicious",
"placement": "",
"source": "",
"text": "Delicious if  cover top and bottom with bun chips",
"status": "built",
"note": "Hamburger chip: food. Plain: +2 Roll, −1 Bid. Bun-Hamburger-Bun, eaten from the top Bun: +1 Draw, Roll and Bid for 2 turns.",
"show": {
"kind": "food",
"value": 0,
"shop": "hamburger"
}
},
{
"row": 95,
"name": "Bun Chip",
"type": "Consumable",
"permanence": "Delicious",
"placement": "",
"source": "",
"text": "Delicious if the top or bottom of burger chip",
"status": "built",
"note": "Bun chip: food (+1 Conviction), and the top and bottom of a burger.",
"show": {
"kind": "food",
"value": 0,
"shop": "bun"
}
},
{
"row": 96,
"name": "Egg Chip",
"type": "Consumable",
"permanence": "Delicious",
"placement": "",
"source": "",
"text": "Crack and Hatched conditions",
"status": "partial",
"note": "Egg chip: food (+2 Roll, −1 Draw for 2 turns). Missing: crack and hatch conditions and what hatches.",
"show": {
"kind": "food",
"value": 0,
"shop": "egg"
}
},
{
"row": 97,
"name": "Spy Chip",
"type": "Utility",
"permanence": "Delicious",
"placement": "",
"source": "",
"text": "Appears to be a different chip but gains the Owner of it an advantage when its on top of one of their stacks",
"status": "needs",
"note": "Need: the advantage it gives, and what it looks like to the opponent.",
"show": null
},
{
"row": 98,
"name": "Doom Chip",
"type": "Aura",
"permanence": "",
"placement": "",
"source": "",
"text": "Appears to be a different chip but cause instance debt of Opposing roller if all of their stacks have a doom chip on top, appears as a doom chip to the Roller and a basic chip to the opponetn",
"status": "needs",
"note": "Need: what places Doom chips on the opponent's stacks, and how much \"instance debt\" is.",
"show": null
}
];
