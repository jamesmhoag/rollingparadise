// Opponents and High Rollers: who sits at the tables, what they bring, and how they play. Edit in Build mode
// (Opponent maker) or here. Anything left out of an entry is generated for the floor as before: a random class,
// dice and tricks for the floor, chips to the table's worth, no drink.
//
// An entry:
//   name, cls (a class id, or null for random), boss (a High Roller), floors [1-4], tables [0, 1, 2] (not bosses)
//   purse (¢ on the table, replacing the floor's worth), wallet, jacket (a JACKETS id: its attribute changes apply),
//   drink (a DRINKS id), chips ({ effect chip id: count }), layout ([{ r, c, chips: [value or effect chip id] }]: a
//   precise Bar layout, row 0 = the Bar's front), deploy ({ spacing, stacking }), behave (see BEHAVE),
//   phases (High Rollers: [{ below, behave, cheat: { dice, tricks } }], switched to when Worth falls below `below`
//   of what they sat down with; a cheat adds that many dice to the pouch and draws that many tricks at once)

// how an opponent plays, part by part. 'balanced' is the play the game always had.
export const BEHAVE = {
  draw: { balanced: 'Balanced: the trick that suits the table', random: 'Random', investment: 'Prefers Investments', insurance: 'Prefers Insurances', expense: 'Prefers Expenses', correction: 'Prefers Corrections',
    self: 'Tricks that work on itself', foe: 'Tricks that work on you' },
  temper: { balanced: 'Balanced', passive: 'Passive', aggressive: 'Aggressive', rabid: 'Rabid: aggressive when low, passive before', cowardly: 'Cowardly: passive when low, aggressive before' },
  roll: { balanced: 'As many as its tricks need', all: 'Rolls all it can', partial: 'Rolls only what one trick needs' },
  dice: { needed: 'The dice its tricks need', highest: 'Its highest dice', lowest: 'Its lowest dice' },
  bid: { tricks: 'Bids for more tricks in play', effect: 'Bids for more effect (bigger, lingering bids)', refund: 'Holds bids back for Opportunity' },
  aim: { effect: 'Where it does the most', chips: 'Where it reaches the most chips', least: 'Where it reaches the least value' },
  bluff: { balanced: 'Best total on each trick', big: 'One big trick, loaded up', build: 'Builds one trick over several turns', many: 'Many tricks, a die each' },
  bonus: { yes: 'Plays for Bonus rolls', no: 'Ignores Bonus rolls' },
};
export const DEFAULT_BEHAVE = { draw: 'balanced', temper: 'balanced', roll: 'balanced', dice: 'needed', bid: 'tricks', aim: 'effect', bluff: 'balanced', bonus: 'yes' };
// a new opponent from the maker starts as this
export const NEW_OPPONENT = { name: 'New Roller', cls: null, floors: [1, 2, 3, 4], tables: [0, 1, 2], behave: { ...DEFAULT_BEHAVE } };
export const NEW_BOSS = { name: 'New High Roller', cls: null, boss: true, floors: [1], behave: { ...DEFAULT_BEHAVE, temper: 'aggressive' },
  phases: [{ below: 0.5, behave: { temper: 'rabid', bluff: 'big' }, cheat: { dice: 2, tricks: 1 } }] };

export const ROSTER = {
  leather_wallet: { name: "Leather Wallet" },
  designer_purse: { name: "Designer Purse" },
  money_clip: { name: "Money Clip" },
  credit_card: { name: "Credit Card" },
  wad_of_cash: { name: "Wad of Cash" },
  coin_dispenser: { name: "Coin Dispenser" },
  piggy_bank: { name: "Piggy Bank" },
  trained_monkey: { name: "Trained Monkey" },
  tip_jar: { name: "Tip Jar" },
  block_chain: { name: "Block Chain" },
  gold_chain: { name: "Gold Chain" },
  platinum_teeth: { name: "Platinum Teeth" },
  golden_parachute: { name: "Golden Parachute" },
  phone_scam: { name: "Phone Scam" },
  phishing_email: { name: "Phishing Email" },
  long_con: { name: "Long Con" },
  blink_dagger: { name: "Blink Dagger" },
  paper_check: { name: "Paper Check" },
  money_order: { name: "Money Order" },
  championship_trophy: { name: "Championship Trophy" },
  prize_pig: { name: "Prize Pig" },
  bounty_reward: { name: "Bounty Reward" },
  finders_fee: { name: "Finders Fee" },
  sly_fox: { name: "Sly Fox" },
  ceramic_frog: { name: "Ceramic Frog" },
  bearish_forecast: { name: "Bearish Forecast" },
  bull_market: { name: "Bull Market" },
  savings_account: { name: "Savings Account" },
  college_tuition: { name: "College Tuition" },
  research_grant: { name: "Research Grant" },
  student_loan: { name: "Student Loan" },
  mortgage_payment: { name: "Mortgage Payment" },
  lease_agreement: { name: "Lease Agreement" },
  bank_statement: { name: "Bank Statement" },
  pyramid_scheme: { name: "Pyramid Scheme" },
  highway_robber: { name: "Highway Robber" },
  gambling_addict: { name: "Gambling Addict" },
  inside_job: { name: "Inside Job" },
  chocolate_coins: { name: "Chocolate Coins" },
  finance_secretary: { name: "Finance Secretary" },
  certified_accountant: { name: "Certified Accountant" },
  shaken_stirrer: { name: "Shaken Stirrer" },
  stirred_shaker: { name: "Stirred Shaker" },
  high_ball: { name: "High Ball" },
  chain_smoker: { name: "Chain Smoker" },
  hsa_account: { name: "HSA Account" },
  health_benefits: { name: "Health Benefits" },
  crinkled_iou: { name: "Crinkled IOU" },
  veteran_hustler: { name: "Veteran Hustler" },
  vending_machine: { name: "Vending Machine" },
  low_ball: { name: "Low Ball" },
  atm_machine: { name: "ATM Machine", boss: true, floors: [1] },
  pile_of_cash: { name: "Pile of Cash", boss: true, floors: [1] },
  exotic_animal: { name: "Exotic Animal", boss: true, floors: [1] },
  antique_clock: { name: "Antique Clock", boss: true, floors: [1] },
  gold_bar: { name: "Gold Bar", boss: true, floors: [2] },
  uncut_gem: { name: "Uncut Gem", boss: true, floors: [2] },
  luxury_vehicle: { name: "Luxury Vehicle", boss: true, floors: [2] },
  lucrative_deal: { name: "Lucrative Deal", boss: true, floors: [2] },
  sunken_treasure: { name: "Sunken Treasure", boss: true, floors: [3] },
  endangered_species: { name: "Endangered Species", boss: true, floors: [3] },
  vested_401k: { name: "Vested 401k", boss: true, floors: [3] },
  project_funding: { name: "Project Funding", boss: true, floors: [3] },
  trust_fund: { name: "Trust Fund", boss: true, floors: [4] },
  the_vault: { name: "The Vault", boss: true, floors: [4] },
  priceless_painting: { name: "Priceless Painting", boss: true, floors: [4] },
  ancient_artifact: { name: "Ancient Artifact", boss: true, floors: [4] },
};
