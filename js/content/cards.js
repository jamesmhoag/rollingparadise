// Cards: what rides in your wallet's card slots. Each card is one `kind`, and what it does is written from its
// numbers (parts.js cardRule), so the words always match the game:
//
//   discount    shop, pct                 pct% off everything at that shop
//   punch       shop, punches, per, free  a punch per purchase (per: 'purchase') or per floor you buy there (per: 'visit');
//                                         at `punches`, the next item is free: free 'any' (anything there) or an item id
//                                         (a drink, a chip, a die size as 'd6', a trick)
//   membership  shop, early, pct, earn    that shop's items open `early` floors sooner, and its members-only items appear
//                                         (chips, drinks, the Trader's secret shelf); pct% off there too. earn.buys: given
//                                         after buying that many on one floor at that shop
//   key         floor                     how a floor's Suite Key is printed. A Suite Key is a pass, not a card: it takes a
//                                         pass slot and is named for its room (run.js addKey)
//   note        text                      a hint, found in the Dodgy Corner
//   trading     text                      a collector's card; does nothing here
//   other       text                      anything else (the Debit Card: the ATM in the Gift Shop)
//
// `starter`: dealt at the start of a run (two of them, to fill the wallet). `corner`: its chance weight in the Shady
// Corner (0 or unset: never found there). Every card takes a wallet slot (there is no lanyard). `look`: how the card is printed (see cardEl in parts.js): its colours, pattern,
// border, edge symbols and big symbol, ink and font, like a neon sign but printed. Shops: diesmith, trader, lounge,
// dice, exchange. The High Rollers' business cards are their traits (bosstraits.js); the Cards section lists them too.
export const CARD_SHOPS = ['diesmith', 'trader', 'lounge', 'dice', 'exchange'];
export const CARD_KINDS = ['discount', 'punch', 'membership', 'key', 'note', 'trading', 'business', 'other'];
// A High Roller's business card: a card like any other (it takes a wallet slot), carrying its Roller's own name sign.
// While it is in your wallet you play by that Roller's trait (the first business card in the wallet, if you hold
// several). There is one for every High Roller, made as they are (data.js refreshDerived); its look can be edited.
export const BUSINESS_LOOK = { bg: ['#f3ead2', '#d9c9a0'], pattern: 'grain', border: 'double', borderColor: '#8b6a2c', symbol: '', symColor: '#8b6a2c', edge: 'star4', edgeAt: 'none', edgeColor: '#8b6a2c', ink: '#2a1c0a', font: 'display',
  back: { bg: ['#2a1c0a', '#120b04'], ink: '#f3ead2', borderColor: '#d9b45a', show: ['name', 'rule', 'flavor', 'serial'] } };
export const bizCardId = (rosterId) => `biz_${rosterId}`;
export const CARD_PATTERNS = ['plain', 'stripes', 'checks', 'dots', 'rays', 'grain'];
export const CARD_BORDERS = ['plain', 'double', 'dashed', 'dotted', 'stripes', 'notched', 'none'];
export const CARD_EDGE_AT = ['none', 'corners', 'top', 'bottom', 'edge'];

const look = (bg, sym, o = {}) => ({ bg, pattern: 'plain', border: 'plain', borderColor: '#ffffff', symbol: sym, symColor: '#ffffff', edge: 'star4', edgeAt: 'none', edgeColor: '#ffffff', ink: '#ffffff', font: 'display', ...o });
export const CARDS = {
  discount_diesmith: { kind: 'discount', shop: 'diesmith', pct: 10, name: 'Discount Card: Diesmith', starter: true, look: look(['#2aa7c4', '#16607a'], '%', { pattern: 'stripes' }) },
  discount_trader: { kind: 'discount', shop: 'trader', pct: 10, name: 'Discount Card: Trick Trader', starter: true, look: look(['#2aa7c4', '#1c4f8a'], '%', { pattern: 'stripes' }) },
  discount_lounge: { kind: 'discount', shop: 'lounge', pct: 10, name: 'Discount Card: Lounge', starter: true, look: look(['#2aa7c4', '#6a2d8a'], '%', { pattern: 'stripes' }) },
  discount_dice: { kind: 'discount', shop: 'dice', pct: 10, name: 'Discount Card: Dice Shop', corner: 0.05, look: look(['#2aa7c4', '#3d7a1c'], '%', { pattern: 'stripes' }) },
  discount_exchange: { kind: 'discount', shop: 'exchange', pct: 10, name: 'Discount Card: Chip Exchange', corner: 0.05, look: look(['#2aa7c4', '#8a6a1c'], '%', { pattern: 'stripes' }) },
  membership: { kind: 'membership', shop: 'trader', early: 1, pct: 10, earn: { buys: 5 }, name: 'Membership Card', look: look(['#b08cff', '#4a2d8a'], 'M', { border: 'double', borderColor: '#ffd76a', font: 'script' }) },
  punch: { kind: 'punch', shop: 'lounge', punches: 5, per: 'purchase', free: 'any', name: 'Punch Card', corner: 0.1, look: look(['#ff9f3a', '#c4501c'], 'cocktail', { border: 'dashed', edge: 'ring', edgeAt: 'top' }) },
  suite_1: { kind: 'key', floor: 1, name: 'Suite Key: Boogey Basement', look: look(['#ff86ea', '#8a2d6a'], '⚿', { border: 'notched' }) },
  suite_2: { kind: 'key', floor: 2, name: 'Suite Key: Hustlers Haven', look: look(['#ff86ea', '#2d4a8a'], '⚿', { border: 'notched' }) },
  suite_3: { kind: 'key', floor: 3, name: 'Suite Key: Rollers Suite', look: look(['#ff86ea', '#8a6a2d'], '⚿', { border: 'notched' }) },
  suite_4: { kind: 'key', floor: 4, name: 'Suite Key: Royal Paradise', look: look(['#ffd76a', '#8a2d6a'], '⚿', { border: 'notched', edge: 'crown', edgeAt: 'corners' }) },
  debit: { kind: 'other', text: 'Found by searching the floor. Lets you use the ATM in the Gift Shop, which keeps chips between runs.', name: 'Debit Card', corner: 0.1, look: look(['#3c7fc4', '#1c2f6a'], '$', { pattern: 'grain' }) },
  note: { kind: 'note', name: 'Note: on bidding', text: '"Every chip you bid adds its worth to the trick. Two of the same trick, stacked, play twice for one bid."', corner: 0.08, look: look(['#f4efe2', '#e2d6b8'], '✉', { ink: '#3a2c14', symColor: '#3a2c14', border: 'none', font: 'script' }) },
  note_dice: { kind: 'note', name: 'Note: on dice', text: '"Roll, bid on what you rolled, then pile the dice on the bid tricks in the Bluff. Any die adds its value; the ones of the trick\'s own size make its Bonus."', corner: 0.08, look: look(['#f4efe2', '#e2d6b8'], '✉', { ink: '#3a2c14', symColor: '#3a2c14', border: 'none', font: 'script' }) },
  note_debt: { kind: 'note', name: 'Note: on Debt', text: '"Debt only takes a chip it can cover. A 5¢ chip on top shrugs off a 4¢ fee, but the Debt stays and the next fee finishes it."', corner: 0.08, look: look(['#f4efe2', '#e2d6b8'], '✉', { ink: '#3a2c14', symColor: '#3a2c14', border: 'none', font: 'script' }) },
  note_house: { kind: 'note', name: 'Note: on the House', text: '"Both arms move at once. What you play this phase cannot change what they play this phase. Insure a turn early, not the same turn."', corner: 0.08, look: look(['#f4efe2', '#e2d6b8'], '✉', { ink: '#3a2c14', symColor: '#3a2c14', border: 'none', font: 'script' }) },
  note_hold: { kind: 'note', name: 'Note: on holding back', text: '"A turn with nothing worth playing still pays. Every draw, roll and bid you leave unused earns chips off the Stage, Power or Opportunity."', corner: 0.08, look: look(['#f4efe2', '#e2d6b8'], '✉', { ink: '#3a2c14', symColor: '#3a2c14', border: 'none', font: 'script' }) },
  note_flip: { kind: 'note', name: 'Note: on flips', text: '"Out of dice? Flip a chip. It lands on nothing or its worth, fits any trick, and comes back to your Bet afterwards."', corner: 0.08, look: look(['#f4efe2', '#e2d6b8'], '✉', { ink: '#3a2c14', symColor: '#3a2c14', border: 'none', font: 'script' }) },
  trading: { kind: 'trading', name: "Trading Card: Children of Ae'a", text: 'From a super popular card game. Does not seem to do anything here.', corner: 0.1, look: look(['#7dffb5', '#2d8a6a'], 'sparkle', { pattern: 'rays', border: 'double', edge: 'star5', edgeAt: 'corners' }) },
};
// the Dodgy Corner: each card's `corner` weight against this weight of finding nothing
export const SHADY = { nothing: 0 };
// a new card from the Cards section starts as this, for its kind
export const NEW_CARD = {
  discount: { kind: 'discount', shop: 'trader', pct: 10, name: 'New Discount Card', look: look(['#2aa7c4', '#16607a'], '%', { pattern: 'stripes' }) },
  punch: { kind: 'punch', shop: 'lounge', punches: 5, per: 'purchase', free: 'any', name: 'New Punch Card', look: look(['#ff9f3a', '#c4501c'], 'ring', { border: 'dashed' }) },
  membership: { kind: 'membership', shop: 'exchange', early: 1, pct: 0, earn: { buys: 5 }, name: 'New Membership', look: look(['#b08cff', '#4a2d8a'], 'M', { border: 'double', borderColor: '#ffd76a', font: 'script' }) },
  note: { kind: 'note', name: 'Note: new', text: '"Write the hint here."', corner: 0.05, look: look(['#f4efe2', '#e2d6b8'], '✉', { ink: '#3a2c14', symColor: '#3a2c14', border: 'none', font: 'script' }) },
  trading: { kind: 'trading', name: 'Trading Card: new', text: 'A collector\'s card. Does not seem to do anything here.', corner: 0.05, look: look(['#7dffb5', '#2d8a6a'], 'sparkle', { pattern: 'rays', border: 'double' }) },
};
