# Round 19: the designer's notes, and what was done for each

The notes are quoted in short, in the order they were given. **Done**: built as asked. **Part**: built in part; what is
missing is said. **Was built**: already in the game before this round. Readings chosen and questions back are in
`docs/DESIGN.md` (Round 19) and `docs/OPEN-QUESTIONS.md`.

| # | Note | Status | What was built |
| --- | --- | --- | --- |
| 1 | A bid card lights and animates, then sparks off, greys and moves to tapped (dice too) | Was built | Lit and spent tricks and dice (the commit before this round). Unchanged. |
| 2 | Pet names for dice | Done | Named when cast at the Diesmith and from the Coat Check; shown under the die there and at the head of its hover. No name given: none shown. |
| 3 | Paint pips and numbers on see-through dice | Done | White paint in the recesses of Glass, Glimmering, Swirling and Diamond dice. |
| 4 | Pre-load dice; materials stay live when small; a themed transition on load | Done | Every size in every material is built behind an opening curtain; dice at rest are redrawn in turn. |
| 5 | Dice enlarge on mouse over | Done | Everywhere, less than the close-up. |
| 6 | Tricks one fixed size; long text lengthens them all | Done | Each state is one size; the cards are as tall as the longest trick; the Trick maker flags a wordy one. |
| 7 | No tag strip, no Foil/Misprint/Reprint explanation, no Misprint icon | Done | |
| 8 | Suite Key takes a pass slot, named for its room | Done | Room = floor number then 00 to 99. Needs a free pass slot (see questions). |
| 9 | Punches show as holes through a punch card | Done | |
| 10 | Bug: switching tabs starts the music when it is off | Done | The band's state is kept in the browser and checked on return; it also holds on the title and in Build mode. |
| 11 | No lanyard: everything is a pass or a card | Done | |
| 12 | Developer mode in the main game | Done | Set the purse (floor, pre-bout, suite, alley), jump floors, seat the High Roller, Clear or Lose a table with tilts and Double Down, real settlement and prizes, ¢ lost on a clear. |
| 13 | More control over wallets and jackets | Done | Gear maker (Build mode): names, parameters, looks, new ones. |
| 14 | Edging on cards with symbols trims cleanly | Done | The border is cut round each edge symbol. |
| 15 | Name plate and wallet card text scales with the edging | Part | Card lettering gives way to edge symbols; a name plate is one fixed size with its name fitted. A sign's text is not otherwise re-laid by its edging. |
| 16 | Favorites can have a price | Done | `TUNING.band.favorite` (0: free). |
| 17 | Parts of a plate, card, wallet, jacket, symbol or crown in dice materials, with glint and sparkle | Part | Finishes on a sign's name, class line and backing, a card's backing and lettering, wallets and jackets. A symbol or crown takes the colour, glint and sparkle only. |
| 18 | Clothing and wallet materials, usable everywhere | Part | Eight cloths and hides alongside the eight dice materials, on every part above. Drawn in CSS, not rendered like the dice. |
| 19 | A defeated Roller's sign sparks, shuts off, cracks | Part | The whole sign sparks, flickers out, greys and cracks, with shards. Its parts do not break one by one. |
| 20 | End of match readouts overlap | Done | The call, the signs, then the readout, in turn. |
| 21 | Wallet and suit customizer, with bounds | Done | The Gear maker's preview and bounded fields; sign finishes in the sign editor. |
| 22 | Bug: cannot bid on a stacked trick (can lock a bout) | Done | |
| 23 | Paint mode: insert below and remove the targeted chip | Part | In the test table's chip tools. Not in the Stake painter. |
| 24 | Cheat and Challenge chips: rate curve over turns, placement | Part | Each tilt: first turn, ramp, cap, where it lays. Which chips it lays is not yet a setting. |
| 25 | Crown placement and tilt in the suite | Done | Tilt, along, height and size, kept with the crown. |
| 26 | Bid on a tapped trick to restore it; the surplus is a base effect | Done | |
| 28 | You must bid; zero and negative bids, Debt | Done | |
| 29 | No tiered cards: one quality from effect to cost | Done | One quality a trick. The rating formula itself is unchanged (see questions). |
| 30 | Tables have a wager; no rematches; no need to win to meet or beat the High Roller; cannot play if you cannot pay | Done | With tuners. |
| 31 | High Roller: all in, and they match you | Done | |
| 33 | Pushing and shoving: slides, lifts, slips | Done | In the engine, as chip actions, and as tricks (Shove, Tug, Hoist, Tuck). |
| 34 | The Pit fills five rows, two columns a Roller, a stack height, a bottomless middle; tunable | Done | |
| 35 | All movement and Regen (all trick effects) chip driven | Part | Retreat, Advance, Lift, Sink and Renew converted. The sorting arrangements, Settle, Gather, Scatter, Sweep and the non-movement effects are not. |
| 36 | Fixed name plate; other details in the Roller's field, out from between the Stakes | Done | |
| 37 | Overlapping text | Part | The cases found are fixed. |
| 38 | All bids placed: clicking a die starts the Bluff | Done | |
| 39 | Clear where an ability adds chips | Done | Landing preview. |
| 40 | Clear where a trick will affect | Done | Landing preview, from the Book, the Run and while aiming. |
| 41 | Cannot play a double trick stack or its copies singly; make it tactile | Part | Both play now; the stack mark splits a stack. No drag and drop. |
| 42 | Move and delete classes and types; deletions must not come back | Done | Organise, in Build mode. |
