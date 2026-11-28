// Coat Check passes the High Rollers left behind. Each found one is a lot made from its Roller's entry here, scaled by
// the floor that Roller plays on: so much cash (× the floor, give or take a quarter), a trick or two from its list, a
// Bone die with its trait, chips, cards, and now and then a jacket or a wallet you may not have yet. There is always a
// note in the pocket (written in the Roller's voice; it is the only way to tell whose coat it was, unless their business
// card is in there too: `biz` is the chance it is).
//   cash: base cash (× floor) · tricks: trick ids (one or two of them, `foil` the chance each is foil) · bone: a Bone trait
//   chips: { shop chip id: n } · cards: card ids · jacket, wallet: an unlock (nothing if you own it) · note: the note's text
export const BOSS_LOTS = {
  atm_machine: { cash: 140, tricks: ['swipe', 'audit'], chips: { battery: 2 }, cards: ['debit'], biz: 0.5, note: '"Out of service. Please take your card. Please take your card. Please take"' },
  pile_of_cash: { cash: 220, tricks: ['stackup', 'stash'], chips: { big: 3 }, biz: 0.5, note: '"Counted it twice. Counted it again. Leaving it here so nobody counts it a fourth time."' },
  exotic_animal: { cash: 60, tricks: ['scorch', 'erupt'], bone: 'enchanted', chips: { burn: 3 }, jacket: 'suede', biz: 0.5, note: '"Do not feed after midnight. Do not feed before midnight either. It bites the hand."' },
  antique_clock: { cash: 80, tricks: ['foretell', 'renew'], bone: 'tempered', chips: { repeater: 2 }, wallet: 'worn_leather', biz: 0.5, note: '"Wound for eight days. I will be back on the seventh. I am always back on the seventh."' },
  gold_bar: { cash: 300, tricks: ['gild', 'press'], chips: { crown: 1 }, biz: 0.5, note: '"Weigh it. Then do not tell anyone what it weighed."' },
  uncut_gem: { cash: 90, tricks: ['shave', 'tinker'], bone: 'encased', chips: { clay: 2 }, wallet: 'neon_zip', biz: 0.5, note: '"Not cut yet. Neither are you. Somebody patient could make something of us both."' },
  luxury_vehicle: { cash: 120, tricks: ['advance', 'shove'], chips: { heli: 2 }, jacket: 'leather', wallet: 'chained_snap', biz: 0.5, note: '"Keys under the mat. Payments due on the first. It is not the first yet."' },
  lucrative_deal: { cash: 200, tricks: ['parlay', 'handoff'], chips: { fib: 2 }, biz: 0.5, note: '"Sign here, here and here. Initial here. Whoever finds this has already agreed."' },
  sunken_treasure: { cash: 250, tricks: ['sink', 'saturate'], bone: 'cursed', chips: { sprinkler: 2 }, biz: 0.5, note: '"Still wet. Mind the barnacles. The doubloons are real, the map is not."' },
  endangered_species: { cash: 100, tricks: ['veil', 'shade'], chips: { seed: 3, tree: 1 }, jacket: 'down', biz: 0.5, note: '"The last of its kind. Please do not lose it. Again."' },
  vested_401k: { cash: 400, tricks: ['settle', 'stow'], chips: { anchor: 2 }, wallet: 'magnetic_snap', biz: 0.5, note: '"Do not touch until retirement. Early withdrawal penalties apply. You are not retired."' },
  project_funding: { cash: 250, tricks: ['conjure', 'empower'], chips: { power: 2, battery: 1 }, jacket: 'sports', biz: 0.5, note: '"Phase two is fully funded. Phase one is in this coat. Do not ask about phase three."' },
  trust_fund: { cash: 600, tricks: ['charm', 'gather'], chips: { crown: 1 }, jacket: 'regal', wallet: 'velvet_zip', biz: 0.5, note: '"For when you are older. You are older now. Spend it before Grandmother finds out."' },
  the_vault: { cash: 800, tricks: ['bulwark', 'moor'], chips: { ward: 2, anchor: 2 }, wallet: 'diamond_clip', biz: 0.5, note: '"Time lock set. It opens whenever whoever holds this shows up. That is the lock."' },
  priceless_painting: { cash: 150, tricks: ['shine', 'attune'], bone: 'mirrored', jacket: 'reading', biz: 0.5, note: '"Unsigned. That is how you know it is the real one."' },
  ancient_artifact: { cash: 200, tricks: ['echo', 'foretell'], bone: 'cursed', chips: { mimic: 2 }, jacket: 'rain', biz: 0.5, note: '"Do not read the inscription aloud. You just did. Sorry about the weather."' },
};
// the note cards those lots carry (card id note_<roster id>): never found on their own
export const bossNoteId = (rid) => `note_${rid}`;
