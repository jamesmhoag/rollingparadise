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
19. (Built: all 22 dice upgrades, readings in DESIGN.md.) Should the use-dependent faces (Rig, Enchant, Encase) carry
    over between bouts instead of resetting?

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
