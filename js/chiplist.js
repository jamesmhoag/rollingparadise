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
},
"list": {
"type": "Basic",
"payment": "1",
"flip": "0 || 1",
"worth": "1¢",
"movable": "Yes",
"playable": "Yes",
"state": "Inorganic",
"party": "All",
"permanence": "Resiliant",
"pile": "Roller",
"placement": "Versatile",
"stack": "1",
"source": "Match Prep"
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
},
"list": {
"type": "Basic",
"payment": "2",
"flip": "0 || 2",
"worth": "2¢",
"movable": "Yes",
"playable": "Yes",
"state": "Inorganic",
"party": "All",
"permanence": "Resiliant",
"pile": "Roller",
"placement": "Versatile",
"stack": "1",
"source": "Match Prep"
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
},
"list": {
"type": "Basic",
"payment": "5",
"flip": "0 || 5",
"worth": "5¢",
"movable": "Yes",
"playable": "Yes",
"state": "Inorganic",
"party": "All",
"permanence": "Resiliant",
"pile": "Roller",
"placement": "Versatile",
"stack": "1",
"source": "Match Prep"
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
},
"list": {
"type": "Basic",
"payment": "10",
"flip": "0 || 10",
"worth": "10¢",
"movable": "Yes",
"playable": "Yes",
"state": "Inorganic",
"party": "All",
"permanence": "Resiliant",
"pile": "Roller",
"placement": "Versatile",
"stack": "1",
"source": "Match Prep"
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
},
"list": {
"type": "Defense",
"payment": "1",
"flip": "0 || 1",
"worth": "0¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Fragile",
"pile": "Shield",
"placement": "Versatile",
"stack": "1",
"source": "Spawned"
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
},
"list": {
"type": "Defense",
"payment": "1",
"flip": "0 || 1",
"worth": "0¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Fragile",
"pile": "Shield",
"placement": "Versatile",
"stack": "1",
"source": "Spawned"
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
},
"list": {
"type": "Defense",
"payment": "r",
"flip": "0 || r",
"worth": "0¢",
"movable": "No",
"playable": "Yes",
"party": "All",
"permanence": "Fragile",
"pile": "Shield",
"placement": "Empty Space",
"stack": "Max",
"source": "Spawned"
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
},
"list": {
"type": "Hazard",
"payment": "s",
"flip": "N/A",
"worth": "f¢",
"movable": "Yes",
"playable": "No",
"party": "Crew",
"permanence": "Fragile",
"pile": "Both",
"placement": "Available Stack",
"stack": "Top",
"source": "Spawned"
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
},
"list": {
"type": "Defense",
"payment": "p",
"flip": "0 || p",
"worth": "p¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Temporary",
"pile": "Both",
"placement": "Targeted Chip",
"stack": "1",
"source": "Chip Conversion"
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
"status": "built",
"note": "Hardened chip: lies over its stack (no worth, no height) for its turns, so each fee takes one chip. Made by Brace (Insurance) and the Crown chip. A piercing fee destroys it, a Cloud's rain washes it off; your own cleansing keeps it.",
"show": {
"kind": "hard",
"value": 0,
"life": 3
},
"list": {
"type": "Defense",
"payment": "p",
"flip": "0 || p",
"worth": "p¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Temporary",
"pile": "Both",
"placement": "Targeted Chip",
"stack": "1",
"source": "Chip Conversion"
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
"status": "built",
"note": "Regen: the Renew trick (Insurance) gives value chips Regen for a few turns. A Regen chip paid to the Stage is restored to its position straight away, without its Regen.",
"show": {
"kind": "std",
"value": 5,
"regen": 2
},
"list": {
"type": "Utility",
"payment": "p",
"flip": "0 || p",
"worth": "p¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Temporary",
"pile": "Both",
"placement": "Targeted Chip",
"stack": "1",
"source": "Chip Conversion"
}
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
},
"list": {
"type": "Defense",
"payment": "p",
"flip": "1 || p",
"worth": "p¢",
"movable": "Yes",
"playable": "Yes",
"party": "Crew",
"permanence": "Temporary",
"pile": "Both",
"placement": "Targeted Chip",
"stack": "1",
"source": "Chip Conversion"
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
},
"list": {
"type": "Utility",
"payment": "s",
"flip": "0 || p",
"worth": "s¢",
"movable": "Yes",
"playable": "Yes",
"party": "Crew",
"permanence": "Temporary",
"pile": "Both",
"placement": "Targeted Chip",
"stack": "Max",
"source": "Stack Conversion"
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
},
"list": {
"type": "Utility",
"payment": "s",
"flip": "0 || p",
"worth": "s¢",
"movable": "Yes",
"playable": "Yes",
"party": "Crew",
"permanence": "Temporary",
"pile": "Both",
"placement": "Targeted Chip",
"stack": "Max",
"source": "Stack Conversion"
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
},
"list": {
"type": "Utility",
"payment": "N/A",
"flip": "N/A",
"worth": "0¢",
"movable": "No",
"playable": "No",
"party": "Crew",
"permanence": "Match",
"pile": "Both",
"placement": "Empty Space",
"stack": "Base",
"source": "Spawned"
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
"status": "built",
"note": "Hole: the Hazard tilt, Acid and the Mole make them. A Hole does not move (the Magic Hat is the movable one); a Puddle fills one so Wood can float in it.",
"show": null,
"list": {
"type": "Hazard",
"payment": "/0",
"flip": "N/A",
"worth": "0¢",
"movable": "No",
"playable": "No",
"party": "Crew",
"permanence": "Match",
"pile": "Both",
"placement": "Empty Space",
"stack": "Base",
"source": "Spawned"
}
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
},
"list": {
"type": "Defense",
"payment": "f",
"flip": "N/A",
"worth": "f¢",
"movable": "Yes",
"playable": "No",
"party": "Crew",
"permanence": "Fragile",
"pile": "Roller",
"placement": "Available Stack",
"stack": "Top",
"source": "Stack Conversion"
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
"status": "built",
"note": "Sticky chip: the Gum Up trick (Correction) sticks it on an opponent's stack. The first timed buff or debuff there stops counting down; its value is the stack's height.",
"show": {
"kind": "sticky",
"value": 3,
"stuck": "burn"
},
"list": {
"type": "Utility",
"payment": "f",
"flip": "N/A",
"worth": "f¢",
"movable": "No",
"playable": "No",
"party": "Crew",
"permanence": "Fragile",
"pile": "Roller",
"placement": "Available Stack",
"stack": "1",
"source": "Stack Conversion"
}
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
},
"list": {
"type": "Vehicle",
"payment": "p",
"flip": "N/A",
"worth": "p¢",
"movable": "No",
"playable": "No",
"party": "Crew",
"permanence": "Fragile",
"pile": "Roller",
"placement": "Available Stack",
"stack": "Top",
"source": "Chip Conversion"
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
},
"list": {
"type": "Spawner",
"payment": "s",
"flip": "N/A",
"worth": "0¢",
"movable": "Break",
"playable": "No",
"party": "Crew",
"permanence": "Fragile",
"pile": "Roller",
"placement": "Empty Space",
"stack": "Top",
"source": "Space Conversion"
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
},
"list": {
"type": "Spawner",
"payment": "f",
"flip": "N/A",
"worth": "0¢",
"movable": "Break",
"playable": "No",
"party": "Cast",
"permanence": "Fragile",
"pile": "Roller",
"placement": "Available Stack",
"stack": "Top",
"source": "Stack Conversion"
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
},
"list": {
"type": "Defense",
"payment": "1 instance",
"flip": "1*p",
"worth": "p¢",
"movable": "Yes",
"playable": "Yes",
"party": "Crew",
"permanence": "Fragile",
"pile": "Roller",
"placement": "Available Stack",
"stack": "Top",
"source": "Spawned"
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
"status": "built",
"note": "Opportunity chip: earned for unused rolls, accumulated, bid and moved like any chip. One left at the end counts as value in your position (no refund).",
"show": {
"kind": "opp",
"value": 1
},
"list": {
"type": "Bounty",
"payment": "1 instance",
"flip": "0 || 1",
"worth": "1¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Fragile",
"pile": "Shield",
"placement": "Versatile",
"stack": "1",
"source": "Spawned"
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
},
"list": {
"type": "Bounty",
"payment": "2*p",
"flip": "N/A",
"worth": "2*p¢",
"movable": "Yes",
"playable": "No",
"party": "Cast",
"permanence": "Fragile",
"pile": "Roller",
"placement": "Versatile",
"stack": "1",
"source": "Chip Conversion"
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
},
"list": {
"type": "Utility",
"payment": "p + b",
"flip": "0 + b || p + b",
"worth": "p¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Fragile",
"pile": "Both",
"placement": "Versatile",
"stack": "1",
"source": "Chip Conversion"
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
},
"list": {
"type": "Aura",
"payment": "1 instance",
"flip": "0 || 0",
"worth": "0¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Fragile",
"pile": "Both",
"placement": "Versatle",
"stack": "1",
"source": "Chip Conversion"
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
},
"list": {
"type": "Aura",
"payment": "1 instance",
"flip": "N/A",
"worth": "0¢",
"movable": "Yes",
"playable": "No",
"permanence": "Fragile",
"pile": "Both",
"placement": "Versatile",
"stack": "1",
"source": "Spawned"
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
},
"list": {
"type": "Hazard",
"payment": "-1",
"flip": "N/A",
"worth": "-1¢",
"movable": "Yes",
"playable": "No",
"party": "All",
"permanence": "Consuming",
"pile": "Both",
"placement": "Versatile",
"stack": "1",
"source": "Spawned"
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
},
"list": {
"type": "Hazard",
"payment": "-1",
"flip": "N/A",
"worth": "-1¢",
"movable": "Yes",
"playable": "No",
"permanence": "Consuming",
"pile": "Both",
"placement": "Targeted Stack",
"stack": "1",
"source": "Chip Conversion"
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
},
"list": {
"type": "Hazard",
"payment": "-1",
"flip": "N/A",
"worth": "-1¢",
"movable": "Yes",
"playable": "No",
"permanence": "Consuming",
"pile": "Both",
"placement": "Targeted Stack",
"stack": "1",
"source": "Chip Conversion"
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
},
"list": {
"type": "Hazard",
"payment": "-1",
"flip": "N/A",
"worth": "-1¢",
"movable": "Yes",
"playable": "No",
"permanence": "Consuming",
"pile": "Both",
"placement": "Targeted Stack",
"stack": "Top",
"source": "Chip Conversion"
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
},
"list": {
"type": "Hazard",
"payment": "-1",
"flip": "N/A",
"worth": "-1¢",
"movable": "Yes",
"playable": "No",
"permanence": "Consuming",
"pile": "Roller",
"placement": "Targeted Stack",
"stack": "Top",
"source": "Chip Conversion"
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
},
"list": {
"type": "Hazard",
"payment": "-5",
"flip": "N/A",
"worth": "-2¢",
"movable": "Yes",
"playable": "No",
"permanence": "Temporary",
"pile": "Both",
"placement": "Available Stack",
"stack": "1",
"source": "Chip Conversion"
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
},
"list": {
"type": "Hazard",
"payment": "-s",
"flip": "N/A",
"worth": "-s¢",
"movable": "Yes",
"playable": "No",
"permanence": "Temporary",
"pile": "Both",
"placement": "Empty Space",
"stack": "Top",
"source": "Space Conversion"
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
"status": "built",
"note": "Black Hole: a Calamity, a hole in space on a Bar space. Anything put on it is gone; each turn, and whenever a Correction moves chips, it consumes the bottom chip of a stack next to it.",
"show": null,
"list": {
"type": "Hazard",
"payment": "/0",
"flip": "N/A",
"worth": "0¢",
"movable": "No",
"playable": "No",
"permanence": "Match",
"pile": "Both",
"placement": "Versatile",
"stack": "Base",
"source": "Space Conversion"
}
},
{
"row": 38,
"name": "UFO Chip",
"type": "Creature",
"permanence": "Temporary",
"placement": "Versatile",
"source": "Encountered",
"text": "Flying Chip That removes a chip from a stack then flies back its home planet, Chips taken are lost",
"status": "built",
"note": "UFO creature: flying, 1 hit instance, stays a turn. Abducts a chip; a hit drives it off for a 5¢ Bounty.",
"show": null,
"list": {
"type": "Creature",
"payment": "50",
"flip": "N/A",
"worth": "0¢",
"movable": "No",
"playable": "No",
"permanence": "Temporary",
"pile": "Both",
"placement": "Versatile",
"stack": "Flying",
"source": "Encountered"
}
},
{
"row": 39,
"name": "Mothership Chip",
"type": "Creature",
"permanence": "Temporary",
"placement": "Available Stack",
"source": "Encountered",
"text": "Flying Chip That removes chips in a stack each turn until they are all depleted, Chips taken are lost",
"status": "built",
"note": "Mothership creature: flying, 10 hit instances (50¢ Bounty).",
"show": null,
"list": {
"type": "Creature",
"payment": "500",
"flip": "N/A",
"worth": "0¢",
"movable": "No",
"playable": "No",
"permanence": "Temporary",
"pile": "Both",
"placement": "Available Stack",
"stack": "Flying",
"source": "Encountered"
}
},
{
"row": 40,
"name": "Fairy Chip",
"type": "Creature",
"permanence": "Temporary",
"placement": "Available Stack",
"source": "Encountered",
"text": "Converts the top chip in the stack below it into a random chip of any type, Chaos Reigns! it cries as it flies away at the end of turn",
"status": "built",
"note": "Fairy creature: flying, 1 hit instance (5¢ Bounty).",
"show": null,
"list": {
"type": "Creature",
"payment": "25",
"flip": "N/A",
"worth": "0¢",
"movable": "No",
"playable": "No",
"permanence": "Temporary",
"pile": "Both",
"placement": "Available Stack",
"stack": "Flying",
"source": "Encountered"
}
},
{
"row": 41,
"name": "Unicorn Chip",
"type": "Creature",
"permanence": "Temporary",
"placement": "Available Stack",
"source": "Encountered",
"text": "Converts all chips in the stack below it into random chips of any type, Chaos Reigns! it cries as it flies away at the end of turn",
"status": "built",
"note": "Unicorn creature: 1 hit instance (5¢ Bounty).",
"show": null,
"list": {
"type": "Creature",
"payment": "250",
"flip": "N/A",
"worth": "0¢",
"movable": "No",
"playable": "No",
"permanence": "Temporary",
"pile": "Both",
"placement": "Available Stack",
"stack": "Flying",
"source": "Encountered"
}
},
{
"row": 42,
"name": "Heli-Chipter",
"type": "Utility",
"permanence": "Match",
"placement": "Available Stack",
"source": "Spawned",
"text": "Lifts stack below it off the table granting flying to each of the chips and reverses the play order of the stack to bottom to top",
"status": "built",
"note": "Heli-Chipter: a shop chip (Rare) on top of a stack. The stack is flying and plays from the bottom: bids take the bottom chip and fees pay from the bottom up.",
"show": {
"kind": "std",
"value": 1,
"resist": "heli"
},
"list": {
"type": "Utility",
"payment": "10",
"flip": "N/A",
"worth": "0¢",
"movable": "Yes",
"playable": "No",
"permanence": "Match",
"pile": "Both",
"placement": "Available Stack",
"stack": "Flying",
"source": "Spawned"
}
},
{
"row": 43,
"name": "Cloud Chip",
"type": "Hazard",
"permanence": "Temporary",
"placement": "Versatile",
"source": "Spawned",
"text": "Rains on the space or stack below it cleansing the chips, and removing modifiers (melting ice, extinguishing fire, nullfiying corruption etc) Makes plants grow faster/produce more, can randomly shock random stacks",
"status": "built",
"note": "Cloud: orbital weather that comes with Oceanic, Frosty and Earthen tables. It drifts, rains (Puddles, wet stacks, fire and frost washed off, plants grow faster) and throws lightning one turn in four.",
"show": null,
"list": {
"type": "Hazard",
"payment": "/0",
"flip": "N/A",
"worth": "0¢",
"movable": "Yes",
"playable": "No",
"permanence": "Temporary",
"pile": "Both",
"placement": "Versatile",
"stack": "Flying",
"source": "Spawned"
}
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
"show": null,
"list": {
"type": "Hazard",
"payment": "/0",
"flip": "N/A",
"worth": "0¢",
"movable": "No",
"playable": "No",
"permanence": "Temporary",
"pile": "Both",
"placement": "Empty Space",
"stack": "Base",
"source": "Space Conversion"
}
},
{
"row": 45,
"name": "Volcano Chip",
"type": "Hazard",
"permanence": "Temporary",
"placement": "Versatile",
"source": "Space Conversion",
"text": "Erupts destroying all in the stack on the space and launches burning chips at  random stacks  each turn it is active, once dormant the space returns to normal but with a lower max height",
"status": "built",
"note": "Volcano chips: the Volcano Calamity is a full stack, two spaces by two where there is room, that nothing can be placed on. Dormant after 4 turns, the spaces come back one stack height lower.",
"show": {
"kind": "volcano",
"value": 0
},
"list": {
"type": "Hazard",
"payment": "/0",
"flip": "N/A",
"worth": "0¢",
"movable": "No",
"playable": "No",
"party": "Stage",
"permanence": "Temporary",
"pile": "Both",
"placement": "Versatile",
"stack": "Base",
"source": "Space Conversion"
}
},
{
"row": 46,
"name": "Dragon Chip",
"type": "Creature",
"permanence": "Temporary",
"placement": "Available Stack",
"source": "Encountered",
"text": "Breathes burning chips on the stack beneath it",
"status": "built",
"note": "Dragon creature: flying, 50 hit instances (250¢ Bounty). Breathes fire.",
"show": null,
"list": {
"type": "Creature",
"payment": "250",
"flip": "N/A",
"worth": "0¢",
"movable": "No",
"playable": "No",
"permanence": "Temporary",
"pile": "Both",
"placement": "Available Stack",
"stack": "Flying",
"source": "Encountered"
}
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
},
"list": {
"type": "Utility",
"payment": "50",
"flip": "N/A",
"worth": "0¢",
"movable": "Yes",
"playable": "No",
"permanence": "Match",
"pile": "Both",
"placement": "Empty Space",
"stack": "Max",
"source": "Space Conversion"
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
"status": "built",
"note": "Hive chip: a shop chip (Rare) on its own space. Every second turn each Hive chip in the stack sends out a Bumble Bee (up to 6). Each Hive chip takes a whole fee, like a Petal.",
"show": {
"kind": "hive",
"value": 0,
"hits": 1
},
"list": {
"type": "Spawner",
"payment": "20",
"flip": "N/A",
"worth": "0¢",
"movable": "Break",
"playable": "No",
"permanence": "Match",
"pile": "Both",
"placement": "Empty Space",
"stack": "Max",
"source": "Stack Conversion"
}
},
{
"row": 49,
"name": "Bumble Bee Chip",
"type": "Creature",
"permanence": "Temporary",
"placement": "Adjacent Versatile",
"source": "Spawned",
"text": "Moves to the nearest flower and pollenates it causing it to bloom instantly for max value, and causing the bee to become a pollenate bumble bee, which returns to the hive on the next turn",
"status": "built",
"note": "Bumble Bee: a familiar from a Hive. It stings creatures over your table (one hit each turn) and pollinates your Flowers into Honey chips.",
"show": null,
"list": {
"type": "Creature",
"payment": "1",
"flip": "N/A",
"worth": "0¢",
"movable": "No",
"playable": "No",
"permanence": "Temporary",
"pile": "Both",
"placement": "Adjacent Versatile",
"stack": "Flying",
"source": "Spawned"
}
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
"note": "Honey chip: food (+1 Roll, +1 Bid for a turn). Sold at the Chip Exchange and made by Bumble Bees pollinating Flowers.",
"show": {
"kind": "food",
"value": 0,
"shop": "honey"
},
"list": {
"type": "Consumable",
"payment": "2*p",
"flip": "2*p || 2*p",
"worth": "2*p¢",
"movable": "No",
"playable": "Yes",
"permanence": "Delicious",
"pile": "Both",
"placement": "Adajacent Stack",
"stack": "1",
"source": "Stack Conversion"
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
},
"list": {
"type": "Defense",
"payment": "2 instances",
"flip": "0 || 0",
"worth": "0¢",
"movable": "Yes",
"playable": "Yes",
"permanence": "Fragile",
"pile": "Both",
"placement": "Adjacent Versatile",
"stack": "1",
"source": "Stack Conversion"
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
},
"list": {
"type": "Consumable",
"payment": "p instances",
"flip": "N/A",
"worth": "0¢",
"movable": "Yes",
"playable": "No",
"permanence": "Delicious",
"pile": "Both",
"placement": "Targeted Stack",
"stack": "Top",
"source": "Chip Conversion"
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
"note": "Bounty system: creatures have hit instances; each fee instance on one takes a hit, the last drives it off and it drops a Bounty chip worth 5¢ a hit. The Fairy has 1 hit: 5¢.",
"show": {
"kind": "bounty",
"value": 5,
"creature": "fairy"
},
"list": {
"type": "Bounty",
"payment": "1 instance",
"flip": "0 || 25",
"worth": "25¢",
"movable": "Yes",
"playable": "Yes",
"permanence": "Resiliant",
"pile": "Roller",
"source": "Chip Conversion"
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
"note": "Bounty: the Unicorn has 1 hit. Pays 5¢.",
"show": {
"kind": "bounty",
"value": 5,
"creature": "unicorn"
},
"list": {
"type": "Bounty",
"payment": "1 instance",
"flip": "0 || 250",
"worth": "250¢",
"movable": "Yes",
"playable": "Yes",
"permanence": "Resiliant",
"pile": "Roller",
"source": "Chip Conversion"
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
"note": "Bounty: the UFO has 1 hit. Pays 5¢.",
"show": {
"kind": "bounty",
"value": 5,
"creature": "ufo"
},
"list": {
"type": "Bounty",
"payment": "1 instance",
"flip": "0 || 50",
"worth": "50¢",
"movable": "Yes",
"playable": "Yes",
"permanence": "Resiliant",
"pile": "Roller",
"source": "Chip Conversion"
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
"note": "Bounty: the Mothership has 10 hits. Pays 50¢.",
"show": {
"kind": "bounty",
"value": 50,
"creature": "mothership"
},
"list": {
"type": "Bounty",
"payment": "1 instance",
"flip": "0 || 500",
"worth": "500¢",
"movable": "Yes",
"playable": "Yes",
"permanence": "Resiliant",
"pile": "Roller",
"source": "Chip Conversion"
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
"note": "Bounty: the Dragon has 50 hits. Pays 250¢.",
"show": {
"kind": "bounty",
"value": 250,
"creature": "dragon"
},
"list": {
"type": "Bounty",
"payment": "1 instance",
"flip": "0 || 250",
"worth": "250¢",
"movable": "Yes",
"playable": "Yes",
"permanence": "Resiliant",
"pile": "Roller",
"source": "Chip Conversion"
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
"status": "built",
"note": "Battery chip: a shop chip (Rare). Electrical and electronic chips above it in its stack get one more instance a turn (Zap, Repeater, Forgetter, Tesla, Absorption, Sprinkler); a Shocking chip on its stack hits one more stack.",
"show": {
"kind": "std",
"value": 1,
"resist": "battery"
},
"list": {
"type": "Utility",
"payment": "1 instance",
"movable": "Yes",
"playable": "Yes",
"permanence": "Match",
"stack": "1",
"source": "Chip Conversion"
}
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
},
"list": {
"type": "Utility",
"payment": "p instances",
"permanence": "Fragile",
"source": "Chip Conversion"
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
},
"list": {
"type": "Utility",
"payment": "2*p instances",
"permanence": "Fragile",
"source": "Chip Conversion"
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
},
"list": {
"type": "Hazard",
"payment": "-1",
"permanence": "Consuming",
"source": "Chip Conversion"
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
"note": "Upgrade chip: a shop chip (Epic). On your Meter each one puts a random die upgrade on every roll, for that roll only (a risk); bid on a trick it plays that trick one upgrade higher.",
"show": {
"kind": "std",
"value": 1,
"resist": "upgrade"
},
"list": {
"permanence": "Temporary"
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
"status": "built",
"note": "Tornado chip: the Tornado Calamity moves over your position with a strength of 2d6; a stack under it shorter than that is thrown about.",
"show": null,
"list": {
"type": "Hazard",
"payment": "/0",
"permanence": "Temporary"
}
},
{
"row": 64,
"name": "Blizzard Chip",
"type": "Hazard",
"permanence": "Temporary",
"placement": "",
"source": "",
"text": "Giant Blizzard effect every space for one turn and obsucring it, after the turn end any stack less than its strength value is converted to a frozen chip",
"status": "built",
"note": "Blizzard: orbital weather as big as the table, from Polar tables (now and then) and the Blizzard Calamity (every fourth turn). It lasts a turn, then freezes every stack shorter than its strength (2d6), wet chips and Puddles.",
"show": null,
"list": {
"type": "Hazard",
"payment": "/0",
"permanence": "Temporary"
}
},
{
"row": 65,
"name": "Ghost Chip",
"type": "Creature",
"permanence": "Temporary",
"placement": "",
"source": "",
"text": "Very Spooky, like transparent chip",
"status": "built",
"note": "Ghost creature: fear. No trick can aim at its row (only spreads reach it), it cannot be damaged, and no overkill passes into or through its row. Bad for both Rollers.",
"show": null,
"list": {
"type": "Creature",
"payment": "10 instances",
"permanence": "Temporary"
}
},
{
"row": 66,
"name": "Puddle Chip",
"type": "Hazard",
"permanence": "Temporary",
"placement": "",
"source": "",
"text": "Space that gets water will form a puddle and can no longer be played on until it dries after a turn without being watered",
"status": "built",
"note": "Puddle: water on an empty space (a Cloud's rain, a Sprinkler) makes one; nothing can be played on it until it dries after a turn without water. Wet stacks cannot burn, pass electricity on, freeze in the cold and grow plants faster.",
"show": null,
"list": {
"type": "Hazard",
"payment": "/0",
"permanence": "Temporary"
}
},
{
"row": 67,
"name": "Ghost Ship Chip",
"type": "Vehicle",
"permanence": "Temporary",
"placement": "",
"source": "",
"text": "Sails across empty tiles to a stack of chips with a gold chip on top and steals it, chips is converted into a treasure chip if ghost ship can be managed to destroyed",
"status": "built",
"note": "Ghost Ship creature: a vehicle with 100 hit instances. Sails across empty spaces to a Gold-topped stack and steals the Gold; sunk, it drops a Treasure chip with all it stole.",
"show": null,
"list": {
"type": "Vehicle",
"payment": "100 instances",
"permanence": "Temporary"
}
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
},
"list": {
"type": "Consumable",
"permanence": "Fragile"
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
},
"list": {
"type": "Consumable",
"permanence": "Limited"
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
"note": "Dragon Roost: one in two Spawner tilts. It takes a Bar space and calls a Dragon every third turn while no egg sits on it; the Dragon lays an egg chip on it.",
"show": null,
"list": {
"type": "Spawner",
"permanence": "Match"
}
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
"note": "Dragon Egg: 5 hit instances. Hatches after 5 hatch steps: one a turn, two on a Roost (3 turns), one more next to heat. Broken first, it never hatches. A trick totalling 10 or more hatches the eggs on your Roost at your opponent.",
"show": {
"kind": "egg",
"value": 0,
"hits": 5,
"shop": "egg"
},
"list": {
"type": "Consumable",
"permanence": "Fragile"
}
},
{
"row": 72,
"name": "Treasure Chip",
"type": "Conditional",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Contains a random amount of gold chips but has  slight chance one is a curse chip",
"status": "built",
"note": "Treasure chip: dropped by a sunk Ghost Ship. 50 to 100 Gold plus what it stole; one in ten carries a Cursed chip.",
"show": {
"kind": "std",
"value": 72,
"gold": true,
"treasure": true
},
"list": {
"type": "Conditional",
"permanence": "Fragile"
}
},
{
"row": 73,
"name": "Cursed Chip",
"type": "Conditional",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Can not be distinguished for a gold chip, but has a negative effect on any roller with it in thier pile. Curse Effect is lifted as soon as the Cursed coin is removed from a pile",
"status": "built",
"note": "Cursed chip: looks like a Gold chip. While it is in your pile, each turn one of Draw, Roll or Bid is 1 lower (never below 1).",
"show": {
"kind": "std",
"value": 1,
"gold": true,
"cursed": true
},
"list": {
"type": "Conditional",
"permanence": "Fragile"
}
},
{
"row": 74,
"name": "Mole Chip",
"type": "Creature",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Digs up a random spot and creates a hole in it",
"status": "built",
"note": "Mole creature: 1 hit instance (5¢ Bounty). Digs a Hole and sits in it.",
"show": null,
"list": {
"type": "Creature",
"permanence": "Fragile"
}
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
"note": "Sun chip: a shop chip (Rare) that goes up into your sky as orbital weather, and the weather of Molten tables. Flowers and Trees grow twice as fast, Puddles dry, eggs hatch faster.",
"show": {
"kind": "std",
"value": 1,
"resist": "sun"
},
"list": {
"type": "Aura",
"permanence": "Temporary",
"placement": "Versatile"
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
},
"list": {
"type": "Conditional",
"permanence": "Fragile"
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
"status": "built",
"note": "Repeater chip: a shop chip (Epic), electronic. On top of a stack with n chips under it, your tricks whose dice total n play again (once more per Battery).",
"show": {
"kind": "std",
"value": 1,
"resist": "repeater"
},
"list": {
"permanence": "Fragile"
}
},
{
"row": 78,
"name": "Mimic Chip",
"type": "",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Each mimic chip on top of a pile cause each trick performed to be repeated that turn",
"status": "built",
"note": "Mimic chip: a shop chip (Epic). For each Mimic on top of your stacks, one of your tricks of each type, at random, plays again in that phase.",
"show": {
"kind": "std",
"value": 1,
"resist": "mimic"
},
"list": {
"permanence": "Fragile"
}
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
},
"list": {
"permanence": "Fragile",
"stack": "1"
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
"status": "built",
"note": "Forgetter chip: a shop chip (Epic), electronic. On top of a stack with n chips under it, the first of your opponent's tricks each turn whose dice total n is negated (one more per Battery).",
"show": {
"kind": "std",
"value": 1,
"resist": "forgetter"
},
"list": {
"permanence": "Fragile",
"stack": "1"
}
},
{
"row": 81,
"name": "Tesla Chip",
"type": "Hazard",
"permanence": "Match",
"placement": "",
"source": "",
"text": "Grabs a lightning attack and send multiple back at random targets",
"status": "built",
"note": "Tesla chip: a shop chip (Epic), electronic. Zap, Shocking chips and Cloud lightning count as lightning; once a turn it grabs a strike on your position and sends 2 back (one more per Battery).",
"show": {
"kind": "std",
"value": 1,
"resist": "tesla"
},
"list": {
"type": "Hazard",
"permanence": "Match"
}
},
{
"row": 82,
"name": "Absorbtion Chip",
"type": "Utility",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Absorbs instances of lightning",
"status": "built",
"note": "Absorption chip: a shop chip (Rare), electronic. Absorbs 2 lightning instances a turn on its stack and the stacks around it (one more per Battery); an absorbed Shocking chip cannot repeat.",
"show": {
"kind": "std",
"value": 1,
"resist": "absorb"
},
"list": {
"type": "Utility",
"permanence": "Fragile"
}
},
{
"row": 83,
"name": "Sprinkler Chip",
"type": "Utility",
"permanence": "Match",
"placement": "",
"source": "",
"text": "Waters nearby space or stacks on the spaces, watered spaces can not be burnt and plant chip grow faster",
"status": "built",
"note": "Sprinkler chip: a shop chip (Uncommon), electronic. Each turn it shoots water at the farthest space: a Puddle or a wet stack.",
"show": {
"kind": "std",
"value": 1,
"resist": "sprinkler"
},
"list": {
"type": "Utility",
"permanence": "Match"
}
},
{
"row": 84,
"name": "Uranium Chip",
"type": "Hazard",
"permanence": "Match",
"placement": "",
"source": "",
"text": "Mutates 1 chip from an adjacent stack into another a different chip",
"status": "built",
"note": "Uranium chip: a shop chip (Rare). Each turn it mutates a chip next to it into a random chip. The Hand Off trick (Correction) moves it onto your opponent.",
"show": {
"kind": "std",
"value": 1,
"resist": "uranium"
},
"list": {
"type": "Hazard",
"permanence": "Match"
}
},
{
"row": 85,
"name": "Big Chip",
"type": "Basic",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Chips that covers 5 total spaces so they can not fall in holes, Big chips can only be stacked on other big chips or empty spaces, but any chips can be stacked on a big chip if stack is not max height",
"status": "built",
"note": "Big chip: a shop chip (Epic). Two spaces by two (the list says 5; the clarification says 4), worth 4 basic chips of the table: 4¢, 8¢, 20¢ or 40¢. Big chips stack only on Big chips; anything goes on top.",
"show": {
"kind": "std",
"value": 8,
"big": true,
"resist": "big"
},
"list": {
"type": "Basic",
"permanence": "Fragile"
}
},
{
"row": 86,
"name": "Little Chip",
"type": "Basic",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Chips that don't cover a full space and can only be stacked on by other Little Chips",
"status": "built",
"note": "Little chip: a shop chip (Common). Tiny: no worth, no height, one hit instance. Only Little chips go on top of it.",
"show": {
"kind": "little",
"value": 0,
"hits": 1
},
"list": {
"type": "Basic",
"permanence": "Fragile",
"stack": "Top"
}
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
},
"list": {
"type": "Conditional",
"permanence": "Fragile",
"stack": "1"
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
},
"list": {
"type": "Conditional",
"permanence": "Fragile",
"stack": "1"
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
"status": "built",
"note": "Magic Hat: a movable hole that always sits at the bottom of its stack and swallows the chip on it each turn. The Conjure trick plants it on your opponent; one in three Hazard tilts is a Hat under one of your own stacks.",
"show": {
"kind": "hat",
"value": 0
},
"list": {
"type": "Gear",
"payment": "1",
"flip": "0 || 1",
"worth": "0¢",
"movable": "Yes",
"playable": "No",
"permanence": "Fragile",
"pile": "Roller",
"placement": "Versatile",
"stack": "Top || Base",
"source": "Spawned"
}
},
{
"row": 90,
"name": "B 52¢ Chip",
"type": "Vehicle",
"permanence": "Fragile",
"placement": "",
"source": "",
"text": "Advances one space along the row leaving a boom 52¢ chip on top",
"status": "built",
"note": "B-52: orbital vehicle from the B-52 Calamity. Flies one space along a row each turn, dropping a 52¢ Boom chip.",
"show": null,
"list": {
"type": "Vehicle",
"payment": "52",
"flip": "N/A",
"worth": "52¢",
"movable": "No",
"playable": "No",
"permanence": "Fragile",
"pile": "Roller",
"stack": "Flying"
}
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
"note": "Skipped for now (by request). Need: what a \"Burden\" is.",
"show": null,
"list": {
"permanence": "Fragile",
"pile": "Roller",
"stack": "Base"
}
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
"note": "Skipped for now (by request). Need: what it deters and what its burden is.",
"show": null,
"list": {
"permanence": "Match",
"pile": "Roller",
"stack": "Base"
}
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
},
"list": {
"type": "Consumable",
"permanence": "Delicious",
"pile": "Roller",
"stack": "Base"
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
},
"list": {
"type": "Consumable",
"permanence": "Delicious",
"pile": "Roller",
"stack": "Base"
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
},
"list": {
"type": "Consumable",
"permanence": "Delicious",
"pile": "Roller",
"stack": "Base"
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
"status": "built",
"note": "Egg chip: food (+2 Roll, −1 Draw for 2 turns) and a Dragon egg: 5 hit instances, hatches a Dragon at your opponent after 5 hatch steps unless eaten or broken.",
"show": {
"kind": "egg",
"value": 0,
"shop": "egg",
"hits": 5
},
"list": {
"type": "Consumable",
"permanence": "Delicious",
"pile": "Roller",
"stack": "Base"
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
"status": "built",
"note": "Spy chip: a shop chip (Rare) that looks like a 1¢ chip to your opponent. On top of your stack, your opponent plays each phase first and you see it, aims included, before you commit.",
"show": {
"kind": "std",
"value": 1,
"resist": "spy"
},
"list": {
"type": "Utility",
"permanence": "Delicious",
"pile": "Roller",
"stack": "Base"
}
},
{
"row": 98,
"name": "Doom Chip",
"type": "Aura",
"permanence": "",
"placement": "",
"source": "",
"text": "Appears to be a different chip but cause instance debt of Opposing roller if all of their stacks have a doom chip on top, appears as a doom chip to the Roller and a basic chip to the opponetn",
"status": "built",
"note": "Doom chip: the Foretell trick (Correction) plants them on your opponent's front stacks; they see 1¢ chips. Once all their stacks are topped with Doom, each Doom chip charges 1¢ a turn (instance debt).",
"show": {
"kind": "doom",
"value": 0,
"owner": 1
},
"list": {
"type": "Aura",
"pile": "Roller",
"stack": "Base"
}
},
{
"row": 99,
"name": "Green Chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "",
"source": "Match Prep",
"text": "Basic value chip worth 25¢",
"status": "built",
"note": "Royal Paradise 25¢ chip: a basic value chip worth 25¢, dealt from floor 3.",
"show": {
"kind": "std",
"value": 25
},
"list": {
"type": "Basic",
"payment": "1",
"flip": "0 || 1",
"worth": "25¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Resiliant",
"source": "Match Prep"
}
},
{
"row": 100,
"name": "Purple Chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "",
"source": "Match Prep",
"text": "Basic value chip worth 50¢",
"status": "built",
"note": "Royal Paradise 50¢ chip: a basic value chip worth 50¢, dealt from floor 4.",
"show": {
"kind": "std",
"value": 50
},
"list": {
"type": "Basic",
"payment": "1",
"flip": "0 || 1",
"worth": "50¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Resiliant",
"source": "Match Prep"
}
},
{
"row": 101,
"name": "Orange Chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "",
"source": "Match Prep",
"text": "Basic value chip worth 100¢",
"status": "built",
"note": "Royal Paradise 100¢ chip: a basic value chip worth 100¢, dealt from floor 4.",
"show": {
"kind": "std",
"value": 100
},
"list": {
"type": "Basic",
"payment": "1",
"flip": "0 || 1",
"worth": "100¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Resiliant",
"source": "Match Prep"
}
},
{
"row": 102,
"name": "Black Chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "",
"source": "Match Prep",
"text": "Basic value chip worth 250¢",
"status": "built",
"note": "Royal Paradise 250¢ chip: a basic value chip worth 250¢, dealt from floor 4.",
"show": {
"kind": "std",
"value": 250
},
"list": {
"type": "Basic",
"payment": "1",
"flip": "0 || 1",
"worth": "250¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Resiliant",
"source": "Match Prep"
}
},
{
"row": 103,
"name": "White Chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "",
"source": "Match Prep",
"text": "Basic value chip worth 500¢",
"status": "built",
"note": "Royal Paradise 500¢ chip: a basic value chip worth 500¢, dealt from the Paradise Ascent (the list gives 5000¢; read as 500¢, between Black and Silver).",
"show": {
"kind": "std",
"value": 500
},
"list": {
"type": "Basic",
"payment": "1",
"flip": "0 || 1",
"worth": "500¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Resiliant",
"source": "Match Prep"
}
},
{
"row": 104,
"name": "Silver Chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "",
"source": "Match Prep",
"text": "Basic value chip worth 1000¢",
"status": "built",
"note": "Silver Chip: a basic value chip worth 1,000¢, dealt from the Paradise Ascent.",
"show": {
"kind": "std",
"value": 1000
},
"list": {
"type": "Basic",
"payment": "1",
"flip": "0 || 1",
"worth": "1000¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Resiliant",
"source": "Match Prep"
}
},
{
"row": 105,
"name": "Ruby Chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "",
"source": "Match Prep",
"text": "Basic value chip worth 2500¢",
"status": "built",
"note": "Ruby Chip: a basic value chip worth 2,500¢, dealt from the Paradise Ascent.",
"show": {
"kind": "std",
"value": 2500
},
"list": {
"type": "Basic",
"payment": "1",
"flip": "0 || 1",
"worth": "2500¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Resiliant",
"source": "Match Prep"
}
},
{
"row": 106,
"name": "Emerald Chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "",
"source": "Match Prep",
"text": "Basic value chip worth 5000¢",
"status": "built",
"note": "Emerald Chip: a basic value chip worth 5,000¢, dealt from the Paradise Ascent.",
"show": {
"kind": "std",
"value": 5000
},
"list": {
"type": "Basic",
"payment": "1",
"flip": "0 || 1",
"worth": "5000¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Resiliant",
"source": "Match Prep"
}
},
{
"row": 107,
"name": "Saphire Chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "",
"source": "Match Prep",
"text": "Basic value chip worth 10,000¢",
"status": "built",
"note": "Sapphire Chip: a basic value chip worth 10,000¢, dealt from the Paradise Ascent (spelled Sapphire in the game).",
"show": {
"kind": "std",
"value": 10000
},
"list": {
"type": "Basic",
"payment": "1",
"flip": "0 || 1",
"worth": "10,000¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Resiliant",
"source": "Match Prep"
}
},
{
"row": 108,
"name": "Amber Chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "",
"source": "Match Prep",
"text": "Basic value chip worth 25,000¢",
"status": "built",
"note": "Amber Chip: a basic value chip worth 25,000¢, dealt from the Paradise Ascent.",
"show": {
"kind": "std",
"value": 25000
},
"list": {
"type": "Basic",
"payment": "1",
"flip": "0 || 1",
"worth": "25,000¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Resiliant",
"source": "Match Prep"
}
},
{
"row": 109,
"name": "Diamond Chip",
"type": "Basic",
"permanence": "Resiliant",
"placement": "",
"source": "Match Prep",
"text": "Basic value chip worth 50,000¢",
"status": "built",
"note": "Diamond Chip: a basic value chip worth 50,000¢, dealt from the Paradise Ascent.",
"show": {
"kind": "std",
"value": 50000
},
"list": {
"type": "Basic",
"payment": "1",
"flip": "0 || 1",
"worth": "50,000¢",
"movable": "Yes",
"playable": "Yes",
"party": "All",
"permanence": "Resiliant",
"source": "Match Prep"
}
}
];
