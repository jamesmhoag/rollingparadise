// The gameplay tuner: the numbers behind the game's systems (not any one trick or chip). Edit them in Build mode
// (Gameplay tuner) or here. Tables of things (drinks, wallets, jackets, sports, odds, chip tiers, floors) are edited
// in Build mode's tables; the tuner links to them.
export const TUNING = {
  // what a bout is played for
  wager: {
    base: 1.5, // a table bout's wager multiplier
    boss: 3, // a High Roller's
    doubleDownMax: 6, // the most a Double Down can reach
    tiltWorthShare: 1, // Challenges pay (Cheats cost) this × their net multiplier × the opponent's worth, on a win
  },
  // losing
  penalty: {
    diceTaken: 2, // dice the winner takes from your pouch when you lose a table bout (you always keep one)
    interventionShare: 0.5, // the share of your wager an Intervention takes
    barLossPaysDrink: true, // losing a bar bout buys your opponent the drink
  },
  // the shops
  shops: {
    discount: 0.9, // price with a discount card (and a Membership at the Trick Trader)
    trickPrice: 50, // a trick on the Trader's shelf: this × floor × quality
    shelfUp: 0.2, shelfDown: 0.25, // chance a shelf trick is one quality above / below the floor's
    restock: 100, // a Trader restock: this × (floor + restocks already bought)
    packPrice: 200, packSize: 5, packFoil: 0.2, gemChance: 0.08, // foil packs: price × quality × floor
    freeDrinkPunches: 5, // Lounge punches for a free drink
  },
  // which floors each room appears on
  rooms: { smith: [1, 2, 3, 4], dice: [1, 2, 3, 4], trader: [1, 2, 3, 4], exchange: [1, 2, 3, 4], lounge: [1, 2, 3, 4], book: [1, 2, 3, 4], search: [1, 2, 3, 4] },
  // the tables' size
  tables: {
    barCols: 3, // a bar bout's columns (a standard table's are the Position size's)
    barChallengerWorth: 14, // the Barfly's chips: this × the floor's largest chip
  },
  // drinks at the table
  drinks: {
    sipsPerRound: 1, // sips a Roller may take each Drink phase
    sipTurns: 1, // turns one sip's effect lasts
  },
  // the Sports Book
  book: {
    houseEdge: 0.95, // odds pay this share of the fair price
  },
};
