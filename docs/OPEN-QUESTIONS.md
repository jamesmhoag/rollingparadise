# Open questions

What is needed from the designer before the remaining systems can be built. Each item names the workbook tab it
comes from and the specific gaps.

## Artifacts (**Collectables**, **Gear**)
1. Effects for the artifacts that have none listed: Windup, Ring ("Never ..."), Key, Token, Button, Locket, and all
   five trash items.
2. How artifacts are obtained. Only the Seed has a price.
3. Where an artifact goes during a bout: does it take a space in the position, and who places it?
4. Whether jacket pocket capacity (2 or 4) is the only limit on how many you carry.

## Cards (**Collectables**)
5. Identification cards: the "5 traits" for each of the three classes.
6. Gift cards: the credit limit, and the interest the House charges on credit debt.
7. Roller and High Roller cards: which traits each one grants.
8. Collectable (athlete) cards: how a card gives "an edge" on a bet (better odds, a preview of the result, something else).
9. Trading cards and Notes: the text or lore to print on them.
10. Whether passes (Royal, Membership, Suite Key, Punch) should take a wallet slot. They currently do not.

## Sports Book (**Gamble**)
11. How a game should play out on screen for each of the seven sports, if bets are to be more than a result.
12. Rosters or entrants per sport, if they should persist between floors.
13. What a hedge is and when it can be placed.

## Chips, elements and themes (**Chips**, **Effects**, **Commitment**)
14. Which of the roughly 400 listed chips matter first, and effects for the many rows that have none.
15. How each chip is obtained: bought, created by a trick, or brought by a theme.
16. Rules for the element rows (Heat, Cold, Storm, Fog, Water, Lava and the rest): what each does to a chip, stack,
    space or table.
17. What a theme changes: only the look of the table and chips, or also which chips and hazards appear.

## Tricks and dice (**Tricks**, **Dice**, **Splitting**)
18. Rules for Splitting, and for the Rest conditional.
19. (Answered: dice upgrades are permanent, including Rig, Enchant and Encase faces; only Upgrade chip effects reset.)

## The floor (**Floors**)
20. The Secret Shop: what it sells and what "skip the next encounter" costs.
21. Credit at the House: how much, at what interest, and what happens if a run ends in debt.
22. Whether the Lounge should have Rollers to recruit ("add to your pack"), and what a pack does.

## Paradise Ascent (**Paradise Ascent**, **Floors**)
23. Going online needs a decision on hosting, accounts and how builds are validated. Until then the ladder uses
    generated legends and your own past builds on this device.
24. The rule "50% of winnings stay on the steps, 50% tumble off": what the winnings are when there are no wagers.

## Economy (**Covetted Run Objectives**)
25. The targets (1,000¢ after floor 1, 100,000¢ after floor 2, 10,000,000¢ after floor 3) are far above what the
    current numbers produce without repeated Double Downs. Confirm whether the game should be tuned up to them.

## Presentation
26. A vector or layered source for the neon sign. The title screen currently splits the supplied image into its
    pink, cyan and dice tubes.
27. A script typeface for "Paradise"-style lettering elsewhere. The tagline falls back to whatever cursive font the
    player's device has.
28. Whether the House should be a visible character at the table, or stay as the sign and the stick.
29. Music and sound.

## Round 3 additions
30. Names and numbers for the three new hazard tricks (Infect, Envenom, Rig) and the hazard lifetimes: Corrupting
    3 turns with a 60% spread, Poison until cleansed, Boom goes off the turn after it lands for 5¢ around it.
31. Unicorn, Mothership, Black Hole, Volcano and Tornado follow the Chips tab text; the numbers (Volcano for four
    turns, Tornado throws stacks under 3 chips, Black Hole takes one chip a turn) are mine.
32. Should Debt that does not cover the chip beneath it ever collect on its own? Now it waits until it reaches the
    chip's value, from any further fees.

## Round 4 additions (phased turns and Debt)
33. Rolling is read as one throw a turn. Should a Roller be able to throw again with rolls left over (for example
    after a sip that raises Proficiency)?
34. When every chip you could bid is your last, the required bid is waived. Should the House instead force the
    bid (and the loss), or charge something else?
35. Overkill goes only down its own lane and is wasted when nothing is behind. Should wasted overkill do anything
    (spill to a neighbouring lane, go to the House, pay Power to the attacker)?
36. The required draw, roll and bid each cost something every turn, so the AI now clears floor 1 less often in the
    simulations. Should the rewards for unused actions or opponent strength be retuned around the requirements?

## Round 5 additions (Library, shop chips, felts)
Every number below is a variable in `js/data.js` (`CHIP_TIERS`, `SHOP_CHIPS[id].vars`, `FELTS`), so a change is one edit.
37. Shop chip tiers and prices: Common 20¢, Uncommon 120¢, Rare 600¢ (floor 2+), Epic 3,000¢ (floor 3+),
    Royal 15,000¢ (floor 4+). The tier a chip sits in is my read of how strong it feels. Should tiers follow the
    **Chips** tab's rarity column instead, and should the Chip Exchange stock rotate like the Trick Trader's shelf?
38. The six new shop chips and their numbers: Bumper (−1¢ off each fee on its stack), Anchor (creatures, Scatter,
    Tornado and Black Hole cannot take from its stack), Nest Egg (15¢ if it survives a win), Mirror (2¢ of Debt back
    per fee), Lucky (30% a turn for an Opportunity chip), Crown (stack Hardened for the first 3 turns). Do several
    of the same chip on one stack stack up? Now they do.
39. The three new resist chips (Violet for Corrupting, Green for Poison, Black for Boom). Should a Black chip also
    shield its stack from a blast next door? Now it only defuses a Boom chip sitting on its own stack.
40. Should opponents ever bring shop chips, and should a Fairy or Unicorn be able to make one?
41. Felts: each table now has a felt id with colours. What board effect should each felt have (Frosty slows
    hazards, Molten feeds Burning chips, Satin moves chips, and so on)? The `effect` slot is empty.
42. Upgrades for cards, drinks, wallets, jackets and felts: there are none in the workbook. The Library shows an
    empty Upgrades section for each so they have a home when they are designed.
43. Trick quality is drawn as a frame (Fine silver, Grand gold, Royal gold with a violet halo) and upgrades as a
    moving foil plus ▲. Die upgrades each have a badge (Accelerate +, Escalate ▲, Stabilize =). Are these the right
    marks, and what should the other 19 die upgrades look like?

## Round 6 additions (floor path, hover detail, prizes, element chips)
44. (Answered: the chip list is in `docs/CHIP-LIST.tsv` and is additive. The old Frozen hazard is kept as Frost,
    with Lava and the Orange chip.)
45. Tables 2 and 3 are a strict either/or. "Not without more time": what would let you fight both (a turn
    limit, a fee, a card)?
46. The prize bonus is 25% of the opponent's starting worth. Should it scale with the wager or the floor instead?
47. Dice and bids stay editable until Play, but the opponent's bid is made against your table as it stood when
    Bid opened. Should moving a die during Bid be visible to them, or cost something?

## Round 7 additions (chip list, dice upgrades)
48. (Answered: a Petal blocks an entire fee — fee instance defence. Built: it blocks the fee when it lands on its
    stack, however big. A fee spread over several stacks is one landing per stack.)
49. Harmony "leaves Basic chips behind": built as a 1¢ chip in place of each hazard chip it clears. Too generous?
50. Dynamite destroys every chip on the 8 stacks around it, as listed. Should a Black chip or Hardening protect?
51. Opportunity chips: the list says leftovers refund the bets made that turn; the game pays a chip per leftover.
    Which should it be?
52. Next from the list, in rough order of fit: Resist, Regen, Sticky, Tree/Wood, Boosted/Cheapened, Cloud,
    Sprinkler/Puddle, Worm Hole, Heli-Chipter, Repeater/Forgetter/Mimic, Fibonacci/Prime, Treasure/Cursed, Bounty
    chips (need creatures that can be forced into debt), Big/Little chips, Spy/Doom. Which first?

## Round 8 additions (arrangements, Swift, Vengeance, Saturate)
53. Arrangements move chips across the Meter and the Bar ("able to cross sections"). Should the Meter stay for
    chips gained during the bout, with Bar chips stopping at its edge?
54. The attribute sheet's Timing, Overflow and Performing rows (after the trick completes, in reaction, tumble,
    fumble, penetrate, separating, pacing, dividing) would work best as Trader upgrades that bolt onto a trick.
    Should trick upgrades become choices like that instead of the flat +0.25?
55. Workbook classes Rogue and Brute map to Rascal and Hustler here for Retreat and Advance. Right mapping?

## Round 9 additions (the whole chip list)
56. 50 chips on the list need detail before they can be built. Each one's question is in the Library's Chip list
    tab and in `docs/CHIP-STATUS.md`.
57. Tree, Sun, Fibonacci and Prime have no listed source, so they are sold at the Chip Exchange (the rule for chips
    nothing makes). The list's prime sequence includes 1 and 9; the game uses true primes (2, 3, 5, 7, 11…).

## Round 10 additions (food, bounties, Resist, Upgrade)
58. Food bonuses and penalties are my first numbers (`SHOP_CHIPS[id].food`). Should eating cost an action, or be
    limited to one per turn? Now it is free and unlimited while planning.
59. Bounties: creatures soak fees on the stack they hover over. Should your own Expenses be able to target a creature
    on your side to drive it off sooner?
60. Unique Prizes are placeholders (card, d8, die upgrade, Scorch, d20). What should each creature give?
61. Cheapened's list text repeats Boosted's; it is built as the opposite (your opponent's dice −1). Right?
62. The Upgrade chip's roll ladder (Escalate, +1, Gamble, +1…) is mine. Which upgrades should it give, in what order?

## Round 11 additions (Drink phase, creature attacks, effect chips)
63. (Answered 58–62: eat and sip once a round in the Drink phase; creatures can be attacked on either side with
    overkill going on; Bounty chips pay their worth only, for now; Upgrade chips give random upgrades.)
64. Effect chips are drawn on the table but are not physical: fees, creatures and arrangements do not touch them.
    Should knocking an effect chip off (with a fee, Scatter, a Tornado) end the effect?
65. Big chips for big effects only stack with big chips. Should big *value* chips exist too (the list's Big Chip,
    covering 5 spaces), and what are they worth?

## Round 12 additions (the Bluff, fees on nothing)
66. The Bluff shows the opponent's bids before you aim. Should it also show their dice totals, or keep those until
    the House plays?
67. A trick that loses its target keeps its aim and lands on nothing. Should it instead slide to the nearest stack
    (as it did before), maybe as a trick upgrade (the sheet's Overflow row)?

## Round 13 additions (the rest of the chip list, traits)

- **Traits.** Every chip's information (on the table and in the Library) lists its traits: the chip list's columns
  (solid outline) and the traits the engine derives (dashed). The Library's **Traits** tab lists each trait and the
  chips that carry it. Candidates for dropping: *Pays fees*, *Biddable*, *Flippable*, *Takes height*, *Fixed* and
  *Element* overlap the list's Payment, Playable, Flip value, Stack amount, Movable and Association; the list's
  *Association* column is empty for every chip. Which should stay?
- **Moon.** Not on the list. Proposed: the tide (a Puddle spreads a space a turn) and a Ghost every fourth turn.
- **Sticky on a buff.** Gum Up is aimed at the opponent, so sticking their Hardened chip helps them. Should Sticky
  pick the first *debuff* when there is one?
- **Doom** chips are knocked off by nothing but cleansing (fees go under them). Should a fee knock them off?
- **Magic Hat** swallows one chip a turn. Too fast? Too slow?
- **Big chips** cover four spaces (the clarification) rather than five (the list). They stack only on Big chips and
  are never moved by Corrections. Can a Correction move a whole 2×2 block?
- **Creature bounties** are now 5¢ a hit, so a 1-hit Unicorn pays 5¢ where it paid 250¢ before. Should rare
  creatures pay more a hit?
- **Hardened** is now a chip over the stack. Your own cleansing keeps it (it is a buff); a Cloud's rain and a
  piercing fee remove it.
- **"On high".** An idea to explore: the House playing tricks and challenge effects from above the table, chips
  lost as triggers, chips stacked as a trick's deployment for its duration, rolls that make chips. Would that be
  a new kind of tilt, or the House's own Run?
- **Skipped for now:** Heavy and Metal (Burden).

## Round 14 additions (basic chips, House-played tilts)

- **White chip** is listed at 5000¢, between Black (250¢) and Silver (1000¢). It is in the game at **500¢**. Right?
- **Chip colours.** The 10¢ chip is now Yellow, as on the list (it was black and gold); Black is 250¢. Sapphire is
  spelled with two p's in the game (the list has "Saphire").
- **"Tilts stronger".** Read as Cheat tilts: they grow as your opponent loses to the House, while Challenges grow as
  you do. Should your opponent's losses also make your Challenges *weaker*?
- **Position** is played once, at the start (changing the table's size mid-bout is not supported). Should it grow
  some other way, such as an extra Draw, Roll or Bid when the House plays it?
- **Tilt tiers** are gone: no unlock costs, no slot counts. Tilts open by floor (Spawner from 2, Calamity and
  Intervention from 3). Should anything be paid to switch one on?
- **The House's rates** (`base`, `per` and `mult` on each tilt in `js/data.js`) are first guesses to tune.

## Round 15 additions (match history, effect chips, overload, turn flow)

- **Which shop chips are effects.** Moved off the shelf: Reducer, Anchor, Transpara, Shadow, Ward, Rebound, Zap
  (Insurance); Power, Control, Boosted, Cheapened, Upgrade, Lucky, Nest Egg, Mimic (Investment); Harmony (Correction).
  Kept on the shelf as things rather than effects: the resist colours, Seed, Clay, Tree, Sun, Heli-Chipter, Battery,
  Repeater, Forgetter, Tesla, Absorption, Sprinkler, Uranium, Big, Little, Spy, Fibonacci, Prime and the food.
  Repeater and Forgetter modify effects too; should they move (and Battery with them)?
- **The new maker tricks are placeholders**: Empower, Throttle, Load, Shave, Tinker, Charm, Stow, Echo, Cushion,
  Ward Off, Recoil, Electrify, Moor, Veil, Shade, Attune. Classes, dice, bonuses and the `make` numbers (how many
  chips, how many turns, from the roll total) are first guesses to tune. They are in the Trick Trader's pool now.
- **Crown** is retired (Brace already makes Hardened chips). Bring it back as something else?
- **Effect chips take stack height.** That makes them fight value chips for room, and a full stack cannot take one.
  Should they lie over the stack instead (no height), like Hardened and Sticky?
- **Effect chips and fees.** A fee that reaches one, or empties its stack, knocks it off. Should some (Anchor, Ward)
  be sturdier?
- **Every effect as a chip.** Status effects with no stack (Boost, Resist, Evade, Reflect, Press, Bend, Parlay, and now
  Subdued and the next-turn ones) still lie as flat effect chips sized by what they cover, laid out by the table, not
  aimed by the trick. Should those also be placed by their trick at a space (for example the Meter space nearest the
  trick), and could a fee or a Correction then touch them?
- **Hive from the Familiar tilt.** One play in three sets a Hive (1 to 3 chips) on an empty space, as a Cheat. Should
  Hives come from the Spawner tilt instead, as a challenge that also helps?
- **Overload.** Chips with no room are lost, like overkill, and count with wasted overkill as Meter overflow toward
  the House's pressure. Should overflow instead spill to the next stack in the lane, or go to the Stage?
- **Pressure weights** (`TILT_PRESSURE`: lost 1, overkill 0.5, Meter fill 0.2, Meter value 0.3). A full, rich Meter
  makes the House lean on you harder. Is that the intent, or should a full Meter make Cheats easier for your
  opponent instead?
- **Leftover dice.** A die that fits no shown trick stays in the roll, keeping its value, and must be placed once a
  trick has room. Should leftovers count against next turn's Proficiency? Should something ever let you reroll them
  (the "benefit of an effect" you mentioned)? Nothing does yet.
- **Auto-skip** passes a phase with a short pause and a line in the feed. Should there be a setting to stop on every
  phase anyway?
- **Bid hands.** Each chip in a hand is still one bid (Ingenuity). Should a whole stack bid at once cost one bid?

## Round 16 additions (feed table, phase rewards as chips, aims, bids)

- **"CAT"**: read as the step pills (Draw, Roll, Bid). Each says in its hover what passing it gives, and once passed
  shows ✓ when everything was used or a badge with what it kept (`+2⚡`, `+1 opp`, `3¢ steal`). Was the CAT something
  else?
- **Power chips** (corrected after review): added Power is ordinary Power chips, one per point, lasting the turn.
  Empower's chips work the same way for longer. Nothing spends them.
- **Steal chips** sit on the Meter and steal in the House phase (after the turn's fees reach the Stage). Should they
  steal at once when Bid is passed, or sit somewhere else (by the Stage)?
- Reward chips go to **random** Meter spaces with room, for both sides. Should yours go where you choose?
- Rewards now take Meter room and can be knocked off by fees: the balance sim cleared slightly fewer floor-1 tables
  (5 of 60 against 8). Worth a tuning look.
- **Taking back a bid from a pile**: the + ring covers the top chip, so a chip goes back by clicking the edge of the
  pile below the ring (the top chip comes off) or with Undo. Should it be another gesture?
- **Default aims** use the same judgement as the House's opponents (most impact, least waste), without its random
  tie-break. Should the default ever leave a trick unaimed, so you must choose?
- The feed table drops "The House calls …" lines into the row header. Any other lines you want folded in?
