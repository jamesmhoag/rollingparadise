// The bout music, written by tools/jazz/loops.py (edit loops.py and render, not this file): a loop for each floor's
// tables and one for its High Roller (floor 5 is the Ascent), each in four layers the game mixes by how close a
// Roller is to broke. start/length: the loop's span in each file, in seconds. key: its tonic (0 = C ... 11 = B).
export const LOOPS = [
 {
  "slug": "basement-bout",
  "title": "Basement Boogie",
  "floor": 1,
  "kind": "bout",
  "key": 7,
  "bpm": 139.53,
  "start": 0.5,
  "length": 27.52,
  "layers": {
   "base": "assets/music/loops/basement-bout-base.mp3",
   "theme": "assets/music/loops/basement-bout-theme.mp3",
   "drive": "assets/music/loops/basement-bout-drive.mp3",
   "peril": "assets/music/loops/basement-bout-peril.mp3"
  }
 },
 {
  "slug": "basement-boss",
  "title": "Cellar Stomp",
  "floor": 1,
  "kind": "boss",
  "key": 4,
  "bpm": 111.11,
  "start": 0.5,
  "length": 34.56,
  "layers": {
   "base": "assets/music/loops/basement-boss-base.mp3",
   "theme": "assets/music/loops/basement-boss-theme.mp3",
   "drive": "assets/music/loops/basement-boss-drive.mp3",
   "peril": "assets/music/loops/basement-boss-peril.mp3"
  }
 },
 {
  "slug": "haven-bout",
  "title": "Haven Hustle",
  "floor": 2,
  "kind": "bout",
  "key": 0,
  "bpm": 171.43,
  "start": 0.5,
  "length": 22.4,
  "layers": {
   "base": "assets/music/loops/haven-bout-base.mp3",
   "theme": "assets/music/loops/haven-bout-theme.mp3",
   "drive": "assets/music/loops/haven-bout-drive.mp3",
   "peril": "assets/music/loops/haven-bout-peril.mp3"
  }
 },
 {
  "slug": "haven-boss",
  "title": "Haven Heat",
  "floor": 2,
  "kind": "boss",
  "key": 2,
  "bpm": 176.47,
  "start": 0.5,
  "length": 21.76,
  "layers": {
   "base": "assets/music/loops/haven-boss-base.mp3",
   "theme": "assets/music/loops/haven-boss-theme.mp3",
   "drive": "assets/music/loops/haven-boss-drive.mp3",
   "peril": "assets/music/loops/haven-boss-peril.mp3"
  }
 },
 {
  "slug": "suite-bout",
  "title": "Suite Intrigue",
  "floor": 3,
  "kind": "bout",
  "key": 9,
  "bpm": 115.38,
  "start": 0.5,
  "length": 33.28,
  "layers": {
   "base": "assets/music/loops/suite-bout-base.mp3",
   "theme": "assets/music/loops/suite-bout-theme.mp3",
   "drive": "assets/music/loops/suite-bout-drive.mp3",
   "peril": "assets/music/loops/suite-bout-peril.mp3"
  }
 },
 {
  "slug": "suite-boss",
  "title": "Showroom Showdown",
  "floor": 3,
  "kind": "boss",
  "key": 10,
  "bpm": 153.85,
  "start": 0.5,
  "length": 24.96,
  "layers": {
   "base": "assets/music/loops/suite-boss-base.mp3",
   "theme": "assets/music/loops/suite-boss-theme.mp3",
   "drive": "assets/music/loops/suite-boss-drive.mp3",
   "peril": "assets/music/loops/suite-boss-peril.mp3"
  }
 },
 {
  "slug": "paradise-bout",
  "title": "Royal Velvet",
  "floor": 4,
  "kind": "bout",
  "key": 1,
  "bpm": 100.0,
  "start": 0.5,
  "length": 38.4,
  "layers": {
   "base": "assets/music/loops/paradise-bout-base.mp3",
   "theme": "assets/music/loops/paradise-bout-theme.mp3",
   "drive": "assets/music/loops/paradise-bout-drive.mp3",
   "peril": "assets/music/loops/paradise-bout-peril.mp3"
  }
 },
 {
  "slug": "paradise-boss",
  "title": "Royal Decree",
  "floor": 4,
  "kind": "boss",
  "key": 7,
  "bpm": 107.14,
  "start": 0.5,
  "length": 35.84,
  "layers": {
   "base": "assets/music/loops/paradise-boss-base.mp3",
   "theme": "assets/music/loops/paradise-boss-theme.mp3",
   "drive": "assets/music/loops/paradise-boss-drive.mp3",
   "peril": "assets/music/loops/paradise-boss-peril.mp3"
  }
 },
 {
  "slug": "ascent-bout",
  "title": "The Climb",
  "floor": 5,
  "kind": "bout",
  "key": 2,
  "bpm": 100.0,
  "start": 0.5,
  "length": 38.4,
  "layers": {
   "base": "assets/music/loops/ascent-bout-base.mp3",
   "theme": "assets/music/loops/ascent-bout-theme.mp3",
   "drive": "assets/music/loops/ascent-bout-drive.mp3",
   "peril": "assets/music/loops/ascent-bout-peril.mp3"
  }
 },
 {
  "slug": "ascent-boss",
  "title": "The House",
  "floor": 5,
  "kind": "boss",
  "key": 4,
  "bpm": 125.0,
  "start": 0.5,
  "length": 30.72,
  "layers": {
   "base": "assets/music/loops/ascent-boss-base.mp3",
   "theme": "assets/music/loops/ascent-boss-theme.mp3",
   "drive": "assets/music/loops/ascent-boss-drive.mp3",
   "peril": "assets/music/loops/ascent-boss-peril.mp3"
  }
 }
];
