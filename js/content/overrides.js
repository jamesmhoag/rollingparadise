// Content changes made in the build mode. Each line sets one value in the game's content, by its path:
//   'TRICKS.charge.count': 3          a trick's dice count
//   'ROLLERS.fox.name': 'Fox'         a Roller's name
//   'TRICKS.my_trick': { ... }        a whole new entry
// The build mode exports this whole file: replace this one with it to make the changes part of the game.
// (npm run merge-content <file> merges an export into this file instead, keeping changes from both.)
export const OVERRIDES = {
};
