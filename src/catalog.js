// The 50 robots of the orchestra. Every robot belongs to an instrument family; each family has its
// own 3D body design (robots3d.js), sound preset style (audio.js) and riff writer (song.js).

export const FAMILIES = {
  piano: { label: 'Piano', icon: '🎹', melodic: true, octave: 0, color: '#3d8bff', blurb: 'Elegant melody robots with keyboard chest plates and long tapping fingers.' },
  keys: { label: 'Keys', icon: '🎛️', melodic: true, octave: 0, color: '#8b5cff', blurb: 'Keyboard-slinging robots: electric piano, organ, mallets.' },
  synth: { label: 'Lead Synth', icon: '📡', melodic: true, octave: 1, color: '#ff3fa4', blurb: 'Tall, streamlined leads with glowing antennae and flashing chest panels.' },
  pad: { label: 'Chord Pad', icon: '🪐', melodic: true, octave: 0, color: '#19d3c5', blurb: 'Hovering chord robots wrapped in orbit rings that swell with every chord.' },
  brass: { label: 'Brass', icon: '🎺', melodic: true, octave: 0, color: '#ffb020', blurb: 'Barrel-chested horn robots with flaring brass bells.' },
  pluck: { label: 'Strings', icon: '🎸', melodic: true, octave: 0, color: '#8fd400', blurb: 'Lanky string robots that strum and pluck.' },
  bass: { label: 'Bassline', icon: '🔊', melodic: true, octave: -2, color: '#6d3bff', blurb: 'Low-profile tracked robots with glowing subwoofer cores that pulse to the low end.' },
  drum: { label: 'Drums', icon: '🥁', melodic: false, octave: 0, color: '#ff5a36', blurb: 'Heavy, bulky drummers with stomping feet and big sticks.' },
  perc: { label: 'Percussion', icon: '🪇', melodic: false, octave: 0, color: '#ffc400', blurb: 'Agile four-armed spinners with shakers, claps and bells.' },
};
export const FAMILY_ORDER = ['piano', 'keys', 'synth', 'pad', 'brass', 'pluck', 'bass', 'drum', 'perc'];

// [id, name, family, preset, move, accent, unlockLevel]
const RAW = [
  ['pip', 'Pip', 'piano', 'grand', 'nodTap', '#3d8bff', 1],
  ['thump', 'Thump', 'drum', 'kick', 'stomp', '#ff5a36', 2],
  ['snap', 'Snap', 'drum', 'snare', 'clap', '#ff7a2e', 3],
  ['tik', 'Tik', 'perc', 'hat', 'headShake', '#ffc400', 5],
  ['rumble', 'Rumble', 'bass', 'moog', 'pulseSquat', '#6d3bff', 6],
  ['zap', 'Zap', 'synth', 'sawLead', 'pump', '#ff3fa4', 7],
  ['rhoda', 'Rhoda', 'keys', 'rhodes', 'sway', '#8b5cff', 8],
  ['nimbus', 'Nimbus', 'pad', 'warmPad', 'float', '#19d3c5', 9],
  ['ivory', 'Ivory', 'piano', 'upright', 'keySweep', '#5aa9ff', 10],
  ['blare', 'Blare', 'brass', 'trumpet', 'fanfare', '#ffb020', 11],
  ['strum', 'Strum', 'pluck', 'guitar', 'strumLean', '#8fd400', 12],
  ['shaka', 'Shaka', 'perc', 'shaker', 'armSpin', '#ffd84a', 13],
  ['volt', 'Volt', 'synth', 'squareLead', 'robotPop', '#ff4fd8', 14],
  ['tuba', 'Tubby', 'brass', 'tuba', 'bounce', '#e8a020', 14],
  ['clapper', 'Clapper', 'perc', 'clap', 'clap', '#ffb800', 15],
  ['marimbo', 'Marimbo', 'keys', 'marimba', 'twist', '#a77bff', 16],
  ['halo', 'Halo', 'pad', 'glassPad', 'spin', '#2fe8d8', 17],
  ['subby', 'Subby', 'bass', 'sub', 'pulseSquat', '#7f52ff', 18],
  ['tomtom', 'Tom-Tom', 'drum', 'tomHi', 'drumRoll', '#ff6a4a', 19],
  ['bell', 'Dingdong', 'perc', 'cowbell', 'jump', '#ffcf33', 19],
  ['keytar', 'Keytar Kai', 'keys', 'organ', 'shimmy', '#9d6bff', 20],
  ['harpo', 'Harpo', 'pluck', 'harp', 'wave', '#a8e62a', 21],
  ['laser', 'Laserbeam', 'synth', 'fatLead', 'backflip', '#ff2f7d', 22],
  ['tinker', 'Tinker', 'piano', 'toy', 'headShake', '#4fc3ff', 23],
  ['boom', 'Boom-808', 'drum', 'kick808', 'stomp', '#ff4a26', 24],
  ['slide', 'Slide', 'brass', 'trombone', 'slidePush', '#ffa31a', 25],
  ['choir', 'Choiri', 'pad', 'choir', 'float', '#14c9b0', 26],
  ['acid', 'Acid Ace', 'bass', 'acid', 'twist', '#8a4bff', 27],
  ['tamb', 'Tambo', 'perc', 'tambourine', 'spin', '#ffe066', 28],
  ['vibe', 'Vibey', 'keys', 'vibes', 'nod', '#b48aff', 29],
  ['chip', 'Chiptune', 'synth', 'chip', 'robotPop', '#ff6fc8', 30],
  ['banjo', 'Banjo Bo', 'pluck', 'banjo', 'jump', '#b6f03c', 31],
  ['celeste', 'Celeste', 'piano', 'celesta', 'wave', '#62d0ff', 32],
  ['tomlow', 'Thud', 'drum', 'tomLo', 'drumRoll', '#ff7b5c', 33],
  ['horn', 'Hornby', 'brass', 'horns', 'fanfare', '#ffc24a', 34],
  ['strings', 'Sylvie', 'pad', 'strings', 'sway', '#3fe0c8', 35],
  ['wobble', 'Wobbles', 'bass', 'wobble', 'shimmy', '#5b2ee0', 36],
  ['whistle', 'Whistler', 'synth', 'sine', 'point', '#ff8ad0', 37],
  ['clav', 'Clavo', 'keys', 'clav', 'robotPop', '#7a4dff', 38],
  ['snare2', 'Rimshot', 'drum', 'rim', 'clap', '#ff8c42', 39],
  ['koto', 'Koto', 'pluck', 'koto', 'nod', '#76c400', 40],
  ['honky', 'Honky', 'piano', 'honky', 'bounce', '#2f7bff', 41],
  ['arp', 'Arpeggia', 'synth', 'arp', 'spin', '#ff3fb0', 42],
  ['sax', 'Saxby', 'brass', 'sax', 'sway', '#f0a000', 43],
  ['fm', 'FM Fred', 'bass', 'fmBass', 'stompWalk', '#7444ff', 44],
  ['glass', 'Prism', 'pad', 'shimmer', 'spin', '#00e0e0', 45],
  ['uke', 'Ukey', 'pluck', 'uke', 'wave', '#9ce000', 46],
  ['harpsi', 'Baroque', 'piano', 'harpsichord', 'keySweep', '#4aa0ff', 47],
  ['conga', 'Conga Lina', 'perc', 'conga', 'armSpin', '#ffb000', 48],
  ['maestro', 'Maestro', 'synth', 'portaLead', 'backflip', '#ff1f8f', 49],
];

export const ROBOTS = RAW.map(([id, name, family, preset, move, accent, unlock], i) => ({
  id, name, family, preset, move, accent, unlock, index: i,
  variant: RAW.slice(0, i).filter((r) => r[2] === family).length,
}));
export const ROBOT_BY_ID = Object.fromEntries(ROBOTS.map((r) => [r.id, r]));
export const MAX_ROBOTS = 50;

export const MOVE_LABELS = {
  nodTap: 'nod & key-tap', keySweep: 'keyboard sweep', stomp: 'foot stomp', clap: 'big clap', headShake: 'head shake',
  pulseSquat: 'bass pulse squat', pump: 'fist pump', sway: 'smooth sway', float: 'orbit float', fanfare: 'horn raise',
  strumLean: 'strum lean', armSpin: 'arm spin', robotPop: 'pop & lock', bounce: 'bounce', twist: 'body twist',
  spin: 'full spin', drumRoll: 'drum roll', jump: 'jump', shimmy: 'shimmy', wave: 'wave', backflip: 'backflip',
  slidePush: 'slide push', nod: 'groove nod', point: 'disco point', stompWalk: 'stomp walk',
};
