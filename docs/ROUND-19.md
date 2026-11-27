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
| 15 | Name plate and wallet card text scales with the edging | Done | Every sign's lettering is set in the room its frame and edging leave on each side (edging along the top moves it down) and is fitted to that room; a card's name is fitted to the room its edge symbols leave. |
| 16 | Favorites can have a price | Done | `TUNING.band.favorite` (0: free). |
| 17 | Parts of a plate, card, wallet, jacket, symbol or crown in dice materials, with glint and sparkle | Done | Every part takes any material: name, class line, backing, symbol and crown on a sign; body, lettering and symbols on a card or pass; body, pocket, emblem on a wallet; body, sleeves, trim, emblem on a jacket. |
| 18 | Clothing and wallet materials, usable everywhere | Done | Every material is one material in the dice renderer (the dice's eight, card stock, leather, crocodile, snakeskin, suede, velvet, fur, silk, denim, canvas, wool, vinyl), pictured in the dice's room and light and laid on wherever a finish is. |
| 19 | A defeated Roller's sign sparks, shuts off, cracks | Done | It fails a part at a time (crown, symbols, each tube and bulb, name, class line, backing), each by its material: glass shatters, plastic and bone crack, metal dulls and buckles, cloth and paper go dark. |
| 20 | End of match readouts overlap | Done | The call, the signs, then the readout, in turn. |
| 21 | Wallet and suit customizer, with bounds | Done | The Gear maker's preview and bounded fields; sign finishes in the sign editor. |
| 22 | Bug: cannot bid on a stacked trick (can lock a bout) | Done | |
| 23 | Paint mode: insert below and remove the targeted chip | Done | One chip painter (Add, Insert, Change, Remove) for your Stake, Build mode's positions and the test table. |
| 24 | Cheat and Challenge chips: rate curve over turns, placement | Done | Each tilt: first turn, ramp, cap, where it lays, and the chips it lays (any chip, how many, more with pressure, with or without its usual play). |
| 25 | Crown placement and tilt in the suite | Done | Tilt, along, height and size, kept with the crown. |
| 26 | Bid on a tapped trick to restore it; the surplus is a base effect | Done | |
| 28 | You must bid; zero and negative bids, Debt | Done | |
| 29 | No tiered cards: one quality from effect to cost | Done | One quality a trick. The rating formula itself is unchanged (see questions). |
| 30 | Tables have a wager; no rematches; no need to win to meet or beat the High Roller; cannot play if you cannot pay | Done | With tuners. |
| 31 | High Roller: all in, and they match you | Done | |
| 33 | Pushing and shoving: slides, lifts, slips | Done | In the engine, as chip actions, and as tricks (Shove, Tug, Hoist, Tuck). |
| 34 | The Pit fills five rows, two columns a Roller, a stack height, a bottomless middle; tunable | Done | |
| 35 | All movement and Regen (all trick effects) chip driven | Done | Every Insurance, Investment and Correction lays a chip that plays its effect (27 effect chips, 16 makers). An Expense's fee is unchanged: it is Debt chips already (see questions). |
| 36 | Fixed name plate; other details in the Roller's field, out from between the Stakes | Done | |
| 37 | Overlapping text | Done | One rule for every screen: standing text under text that arrives for a moment fades until it has gone. |
| 38 | All bids placed: clicking a die starts the Bluff | Done | |
| 39 | Clear where an ability adds chips | Done | Landing preview. |
| 40 | Clear where a trick will affect | Done | Landing preview, from the Book, the Run and while aiming. |
| 41 | Cannot play a double trick stack or its copies singly; make it tactile | Done | Press and carry: tricks, chips and dice go where they are dropped; dropping a trick on a copy stacks it, on the Run plays it apart. |
| 42 | Move and delete classes and types; deletions must not come back | Done | Organise, in Build mode. |
