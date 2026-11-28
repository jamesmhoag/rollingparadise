// Every shop's prices and stock, floor by floor. Each list is [floor 1, floor 2, floor 3, floor 4]. Stock is how many of
// each thing a shop has on a floor in a run: what you buy is gone until the next floor restocks it. A stock of 0 means
// it is not sold on that floor. Edit it all in Build mode's Shops section (which also links the tables a shop sells
// from: chip tiers, dice and materials, drinks, packs).
export const SHOPS = {
  // the Chip Exchange: each shop chip on the counter
  exchange: {
    stock: [3, 3, 4, 5], // of each chip on the counter (from its tier's floor)
    priceMult: [1, 1, 1, 1], // × the chip's tier price (or its own price)
    chips: {}, // a chip's own price and stock by floor: { id: { price: [..], stock: [..] } } (a blank floor keeps the default)
  },
  // the Dice Shop: plain dice in each material, and Bone dice
  dice: {
    plain: [6, 6, 6, 6], // plain dice listed
    bone: [2, 2, 2, 2], // Bone dice listed
    stock: [2, 2, 2, 2], // of each die listed
    priceMult: [1, 1.5, 2.25, 3.5], // × the die's base price (Dice Shop table) × its material
  },
  // the Trick Trader: the shelf (one trick for each class and one for anyone), restocks, and foil packs
  trader: {
    stock: [1, 1, 2, 2], // copies of each shelf trick
    price: [50, 100, 150, 200], // a shelf trick of quality I; × its quality
    restock: [100, 200, 300, 400], // the floor's first restock
    restockStep: 100, // each restock after it costs this much more
    packPrice: [200, 400, 600, 800], // a foil pack; × its set's quality
    packStock: [2, 2, 2, 2], // of each foil pack set (from its floor)
  },
  // the Lounge: drinks
  lounge: {
    priceMult: [0.2, 0.4, 0.7, 1], // × each drink's price (happy hour halves it)
    stock: [3, 3, 3, 3], // pours of each drink on the menu
  },
  // the Diesmith: a cast
  smith: { priceMult: [1, 1, 1, 1] }, // × the cast's price
  // the Coat Check: a pass for whatever you check (any mix, under one number), taken back at any floor's Coat Check
  coat: { price: [20, 40, 80, 160] },
  // the Casino door: the bout you walk in with, and what the door pays
  door: {
    chips: 30, // 1¢ chips you play the door bout with (as many as your Stake holds)
    oppWorth: 18, // the Doorman's chips
    welcome: 200, // the welcome stake: your purse after the door bout (a Roller's own starting worth overrides it)
    keepFees: true, // the fees the Doorman paid you are added to the welcome stake
  },
};
// a floor's value from a [f1..f4] list (a number stands for every floor)
export const perFloor = (list, floor, dflt = 0) => { if (typeof list === 'number') return list; const f = Math.max(1, Math.min(4, floor || 1)); const v = list?.[f - 1]; return v == null || v === '' ? dflt : v; };
