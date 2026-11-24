// High Roller traits: each High Roller hands you their business card at the table, and it says what makes them
// different to play: one rule of the bout bent their way. Pick one for a High Roller in Build mode (Opponent maker)
// or set `trait` on its ROSTER entry. Edit freely: `k` is the rule the engine plays (below), `vars` its numbers,
// `title` the line on their card, and `flavor` the voice it is said in. What the trait does is written from `k` and
// `vars` (traitRule in bout.js), so the words always match the numbers.
//
//   k: 'pitback'  (n)          at the start of each turn, n of its own chips climb back out of its Pit onto its Bet
//      'fireproof'            its stacks start the bout Burning, and fire and acid never take a chip from them
//      'hardened' (turns)     its front stacks start Hardened (one chip a fee) for that many turns
//      'wet'                  its stacks start wet: they cannot burn, and electricity passes on through them
//      'interest' (per, max)  each turn, a 1¢ chip on its Bet for every `per`¢ of Worth (at most `max`)
//      'resist'   (n)         every fee charged to it is n¢ smaller
//      'tempo'    (every)     every `every` turns it gets +1 Draw, Roll and Bid for the turn
export const BOSS_TRAITS = {
  withdrawal: { name: 'Withdrawal', k: 'pitback', vars: { n: 1 }, title: 'Automated Teller',
    flavor: 'Insert card. Enter PIN. Whatever you take, it dispenses right back to itself.' },
  stacked: { name: 'Stacked', k: 'interest', vars: { per: 20, max: 3 }, title: 'Loose Bills',
    flavor: 'It never counts the pile. It just keeps getting taller.' },
  wildfire: { name: 'Wildfire', k: 'fireproof', vars: {}, title: 'Rare Import',
    flavor: 'It came over in a crate stamped DO NOT FEED. Everything it sits on is already on fire, and it likes it that way.' },
  clockwork: { name: 'Clockwork', k: 'tempo', vars: { every: 3 }, title: 'Keeps Perfect Time',
    flavor: 'Tick, tick, tick. On the third tick it moves twice as fast as you.' },
  bullion: { name: 'Bullion', k: 'hardened', vars: { turns: 3 }, title: '24 Karat',
    flavor: 'Solid all the way through. You can scratch it, but you cannot take a bite.' },
  rough_cut: { name: 'Rough Cut', k: 'resist', vars: { n: 1 }, title: 'Not Yet Polished',
    flavor: 'All edges. Small fees glance right off it.' },
  leased: { name: 'Leased', k: 'hardened', vars: { turns: 2 }, title: 'Fully Insured',
    flavor: 'Comprehensive coverage, zero deductible. Dents buff right out.' },
  closing: { name: 'Closing', k: 'pitback', vars: { n: 2 }, title: 'Signed and Sealed',
    flavor: 'Every term has a clawback clause. Read the fine print, if you can find it.' },
  waterlogged: { name: 'Waterlogged', k: 'wet', vars: {}, title: 'Salvage Rights Pending',
    flavor: 'Three hundred years at the bottom of the sea. It will not catch, and it will not dry.' },
  protected: { name: 'Protected', k: 'resist', vars: { n: 2 }, title: 'On the List',
    flavor: 'Touch it and the paperwork alone will bankrupt you.' },
  vested: { name: 'Vested', k: 'interest', vars: { per: 25, max: 4 }, title: 'Fully Matched',
    flavor: 'It does nothing at all, and every quarter it is worth a little more.' },
  greenlit: { name: 'Greenlit', k: 'tempo', vars: { every: 2 }, title: 'Fast-Tracked',
    flavor: 'Approved, staffed and moving before you have read the proposal.' },
  old_money: { name: 'Old Money', k: 'interest', vars: { per: 30, max: 5 }, title: 'Generational',
    flavor: 'It was rich before your grandmother was born and it will be rich after you leave.' },
  time_lock: { name: 'Time Lock', k: 'hardened', vars: { turns: 4 }, title: 'Opens at Dawn',
    flavor: 'Two feet of steel and a timer nobody can override. Come back in the morning.' },
  masterpiece: { name: 'Masterpiece', k: 'resist', vars: { n: 3 }, title: 'Beyond Appraisal',
    flavor: 'The price tag is a velvet rope. Nobody gets close enough to bargain.' },
  cursed_relic: { name: 'Cursed Relic', k: 'fireproof', vars: {}, title: 'Unearthed',
    flavor: 'The tomb was burning when they found it. It has not stopped since.' },
};
