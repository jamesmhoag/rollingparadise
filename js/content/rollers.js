// Rollers: the heroes you can walk in as. A Roller is a name, a Class (CLASSES: its attributes) and what it starts
// with: its Book of tricks, its Pouch of dice, its Worth (the ¢ it is staked with after the Doorman's bout), and the
// wallet and jacket it walks in wearing (if you own them). Its neon sign is laid over the shared look for your seat
// (NEON.you). Edit in Build mode (Roller maker) or here.
//
// Opponents (ROSTER) are Rollers too, always across the table from yours; they add where they sit and how they play.
export const ROLLERS = {
  owl: { name: 'Owl', cls: 'hustler', dice: { d4: 4, d6: 4 }, tricks: ['charge', 'mug', 'stir', 'block', 'settle'], worth: 200, wallet: 'worn_cloth', jacket: 'standard' },
  fox: { name: 'Fox', cls: 'rascal', dice: { d6: 7 }, tricks: ['charge', 'stir', 'bend', 'block', 'settle'], worth: 200, wallet: 'worn_cloth', jacket: 'standard' },
  hog: { name: 'Hog', cls: 'technician', dice: { d6: 3, d8: 3 }, tricks: ['charge', 'stir', 'block', 'brace', 'settle'], worth: 200, wallet: 'worn_cloth', jacket: 'standard' },
};
// a new Roller from the maker starts as this
export const NEW_ROLLER = { name: 'New Roller', cls: 'hustler', dice: { d6: 6 }, tricks: ['charge', 'stir', 'block', 'settle'], worth: 200, wallet: 'worn_cloth', jacket: 'standard' };
