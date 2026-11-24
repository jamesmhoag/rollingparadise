// Opponents and High Rollers: who sits at the tables, what they bring, and how they play. Edit in Build mode
// (Opponent maker) or here. Anything left out of an entry is generated for the floor: its class's Roller's Book plus tricks
// for the floor, dice for the floor, chips to the table's worth, no drink. Its own `tricks` and `dice` replace those.
//
// An entry:
//   name, cls (a class id: every Opponent and High Roller has one), boss (a High Roller), floors [1-4], tables [0, 1, 2] (not bosses)
//   purse (¢ on the table, replacing the floor's worth), wallet, jacket (a JACKETS id: its attribute changes apply),
//   drink (a DRINKS id), chips ({ effect chip id: count }), layout ([{ r, c, chips: [value or effect chip id] }]: a
//   precise Stake layout, row 0 = the Stake's front), deploy ({ spacing, stacking }), behave (see BEHAVE),
//   trait (High Rollers: a BOSS_TRAITS id, the rule their business card bends their way),
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
export const NEW_OPPONENT = { name: 'New Opponent', cls: 'hustler', floors: [1, 2, 3, 4], tables: [0, 1, 2], behave: { ...DEFAULT_BEHAVE } };
export const NEW_BOSS = { name: 'New High Roller', cls: 'hustler', boss: true, floors: [1], trait: 'withdrawal', behave: { ...DEFAULT_BEHAVE, temper: 'aggressive' },
  phases: [{ below: 0.5, behave: { temper: 'rabid', bluff: 'big' }, cheat: { dice: 2, tricks: 1 } }] };

export const ROSTER = {
  leather_wallet: { name: "Leather Wallet", cls: 'hustler' },
  designer_purse: { name: "Designer Purse", cls: 'rascal' },
  money_clip: { name: "Money Clip", cls: 'technician' },
  credit_card: { name: "Credit Card", cls: 'hustler' },
  wad_of_cash: { name: "Wad of Cash", cls: 'rascal' },
  coin_dispenser: { name: "Coin Dispenser", cls: 'technician' },
  piggy_bank: { name: "Piggy Bank", cls: 'hustler' },
  trained_monkey: { name: "Trained Monkey", cls: 'rascal' },
  tip_jar: { name: "Tip Jar", cls: 'technician' },
  block_chain: { name: "Block Chain", cls: 'hustler' },
  gold_chain: { name: "Gold Chain", cls: 'rascal' },
  platinum_teeth: { name: "Platinum Teeth", cls: 'technician' },
  golden_parachute: { name: "Golden Parachute", cls: 'hustler' },
  phone_scam: { name: "Phone Scam", cls: 'rascal' },
  phishing_email: { name: "Phishing Email", cls: 'technician' },
  long_con: { name: "Long Con", cls: 'hustler' },
  blink_dagger: { name: "Blink Dagger", cls: 'rascal' },
  paper_check: { name: "Paper Check", cls: 'technician' },
  money_order: { name: "Money Order", cls: 'hustler' },
  championship_trophy: { name: "Championship Trophy", cls: 'rascal' },
  prize_pig: { name: "Prize Pig", cls: 'technician' },
  bounty_reward: { name: "Bounty Reward", cls: 'hustler' },
  finders_fee: { name: "Finders Fee", cls: 'rascal' },
  sly_fox: { name: "Sly Fox", cls: 'technician' },
  ceramic_frog: { name: "Ceramic Frog", cls: 'hustler' },
  bearish_forecast: { name: "Bearish Forecast", cls: 'rascal' },
  bull_market: { name: "Bull Market", cls: 'technician' },
  savings_account: { name: "Savings Account", cls: 'hustler' },
  college_tuition: { name: "College Tuition", cls: 'rascal' },
  research_grant: { name: "Research Grant", cls: 'technician' },
  student_loan: { name: "Student Loan", cls: 'hustler' },
  mortgage_payment: { name: "Mortgage Payment", cls: 'rascal' },
  lease_agreement: { name: "Lease Agreement", cls: 'technician' },
  bank_statement: { name: "Bank Statement", cls: 'hustler' },
  pyramid_scheme: { name: "Pyramid Scheme", cls: 'rascal' },
  highway_robber: { name: "Highway Robber", cls: 'technician' },
  gambling_addict: { name: "Gambling Addict", cls: 'hustler' },
  inside_job: { name: "Inside Job", cls: 'rascal' },
  chocolate_coins: { name: "Chocolate Coins", cls: 'technician' },
  finance_secretary: { name: "Finance Secretary", cls: 'hustler' },
  certified_accountant: { name: "Certified Accountant", cls: 'rascal' },
  shaken_stirrer: { name: "Shaken Stirrer", cls: 'technician' },
  stirred_shaker: { name: "Stirred Shaker", cls: 'hustler' },
  high_ball: { name: "High Ball", cls: 'rascal' },
  chain_smoker: { name: "Chain Smoker", cls: 'technician' },
  hsa_account: { name: "HSA Account", cls: 'hustler' },
  health_benefits: { name: "Health Benefits", cls: 'rascal' },
  crinkled_iou: { name: "Crinkled IOU", cls: 'technician' },
  veteran_hustler: { name: "Veteran Hustler", cls: 'hustler' },
  vending_machine: { name: "Vending Machine", cls: 'rascal' },
  low_ball: { name: "Low Ball", cls: 'technician' },
  atm_machine: { name: "ATM Machine", cls: 'hustler', boss: true, floors: [1], trait: "withdrawal" },
  pile_of_cash: { name: "Pile of Cash", cls: 'rascal', boss: true, floors: [1], trait: "stacked" },
  exotic_animal: { name: "Exotic Animal", cls: 'technician', boss: true, floors: [1], trait: "wildfire" },
  antique_clock: { name: "Antique Clock", cls: 'hustler', boss: true, floors: [1], trait: "clockwork" },
  gold_bar: { name: "Gold Bar", cls: 'rascal', boss: true, floors: [2], trait: "bullion" },
  uncut_gem: { name: "Uncut Gem", cls: 'technician', boss: true, floors: [2], trait: "rough_cut" },
  luxury_vehicle: { name: "Luxury Vehicle", cls: 'hustler', boss: true, floors: [2], trait: "leased" },
  lucrative_deal: { name: "Lucrative Deal", cls: 'rascal', boss: true, floors: [2], trait: "closing" },
  sunken_treasure: { name: "Sunken Treasure", cls: 'technician', boss: true, floors: [3], trait: "waterlogged" },
  endangered_species: { name: "Endangered Species", cls: 'hustler', boss: true, floors: [3], trait: "protected" },
  vested_401k: { name: "Vested 401k", cls: 'rascal', boss: true, floors: [3], trait: "vested" },
  project_funding: { name: "Project Funding", cls: 'technician', boss: true, floors: [3], trait: "greenlit" },
  trust_fund: { name: "Trust Fund", cls: 'hustler', boss: true, floors: [4], trait: "old_money" },
  the_vault: { name: "The Vault", cls: 'rascal', boss: true, floors: [4], trait: "time_lock" },
  priceless_painting: { name: "Priceless Painting", cls: 'technician', boss: true, floors: [4], trait: "masterpiece" },
  ancient_artifact: { name: "Ancient Artifact", cls: 'hustler', boss: true, floors: [4], trait: "cursed_relic" },
};
