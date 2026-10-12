// The 50-level campaign. Each level: which robots are on stage, starting settings, which robots
// arrive already playing ("prefill"), and the audience's requests (criteria from audience.js).
import { ROBOTS, FAMILY_ORDER } from './catalog.js';

export const FANS = {
  kid: { name: 'Kid in the front row', avatar: '🧒' },
  grandma: { name: 'Grandma Rosa', avatar: '👵' },
  dave: { name: 'Disco Dave', avatar: '🕺' },
  critic: { name: 'The Critic', avatar: '🎩' },
  teacher: { name: 'Ms. Tempo', avatar: '🧑‍🏫' },
  punk: { name: 'Punk Pat', avatar: '👩‍🎤' },
  bot: { name: 'Robo-fan 3000', avatar: '🤖' },
  cat: { name: 'A cat?', avatar: '🐱' },
  dj: { name: 'DJ Volt', avatar: '🎧' },
  queen: { name: 'The Queen', avatar: '👑' },
};
const Q = (who, text, crit) => ({ who, text, ...crit });

/** All robots unlocked by level L. */
const unlockedBy = (L) => ROBOTS.filter((r) => r.unlock <= L);
/** n robots for level L: the newly unlocked ones first, then round-robin across families. */
function band(L, n) {
  const pool = unlockedBy(L), chosen = pool.filter((r) => r.unlock === L);
  const byFam = Object.fromEntries(FAMILY_ORDER.map((f) => [f, pool.filter((r) => r.family === f && !chosen.includes(r))]));
  while (chosen.length < Math.min(n, pool.length)) for (const f of FAMILY_ORDER) if (chosen.length < n && byFam[f].length) chosen.push(byFam[f].shift());
  return chosen.map((r) => r.id);
}

const S = (bpm, extra = {}) => ({ bpm, scale: 'major', beatsPerBar: 4, stepsPerBeat: 2, bars: 2, octaves: 2, ...extra });

const DEFS = [
  // ----- 1–5: first beats & melodies -----
  { title: 'Hello, Pip!', tagline: 'Meet Pip, the piano robot. Click the grid to give Pip some notes, then press Play.', robots: ['pip'], settings: S(100, { bars: 1 }),
    requests: [Q('kid', 'Play me a tune! At least 4 piano notes!', { type: 'notes', fam: 'piano', min: 4 })] },
  { title: 'Stomp Stomp', tagline: 'Thump the drum robot joins. Drum robots get one lane each, below the melody grid.', robots: ['pip', 'thump'], settings: S(100, { bars: 1 }),
    requests: [Q('dave', 'I need a beat! Kick on every beat!', { type: 'beat', id: 'thump', on: 'every' }), Q('kid', 'And a melody — 4 piano notes!', { type: 'notes', fam: 'piano', min: 4 })] },
  { title: 'Happy Bass Melody', tagline: 'Pip moves down an octave for a bouncy bass melody. Snap the snare robot arrives.', robots: ['pip', 'thump', 'snap'], robotOpts: { pip: { octave: -1 } }, settings: S(105, { scale: 'chromatic' }),
    requests: [
      Q('grandma', 'Play a happy piano bass melody! 6 low piano notes, please.', { type: 'low', fam: 'piano', maxRow: 6, min: 6 }),
      Q('critic', 'Happy means Major or Pentatonic. Change that scale!', { type: 'scale', any: ['major', 'pentatonic'] }),
      Q('dave', 'Snare on the backbeat — beats 2 and 4!', { type: 'beat', id: 'snap', on: 'backbeat' })] },
  { title: 'Stairway to Melody', tagline: 'Melodies feel great when they climb and then come home.', robots: ['pip', 'thump', 'snap'], settings: S(108),
    requests: [
      Q('teacher', 'Climb the stairs: 4 piano notes in a row, each one higher!', { type: 'run', fam: 'piano', len: 4 }),
      Q('grandma', 'End on a home note (a shaded row), dear.', { type: 'endOnRoot', fam: 'piano' }),
      Q('dave', 'Kick on the first beat of every bar.', { type: 'beat', id: 'thump', on: 'downbeats' })] },
  { title: 'Tiny Band', tagline: 'Tik the hi-hat robot completes your first 4-piece band.', robots: ['pip', 'thump', 'snap', 'tik'], settings: S(100),
    requests: [
      Q('bot', 'EVERY ROBOT MUST PLAY. BEEP.', { type: 'allPlay' }),
      Q('dave', 'Hi-hats on at least half the steps!', { type: 'fill', id: 'tik', min: 0.5 }),
      Q('punk', 'Make it upbeat — 115 BPM or faster!', { type: 'tempo', min: 115 })] },
  // ----- 6–20: new melodic & chord robots -----
  { title: 'Low Rider', tagline: 'Rumble the bassline robot pulses to the low end.', settings: S(120),
    requests: [
      Q('dj', 'Deep bass! 4 bass notes, all in the bottom 5 rows.', { type: 'low', fam: 'bass', maxRow: 4, min: 4 }),
      Q('dave', 'Four on the floor: kick every beat.', { type: 'beat', id: 'thump', on: 'every' }),
      Q('grandma', 'A laid-back groove, 85 to 105 BPM.', { type: 'tempo', min: 85, max: 105 })] },
  { title: 'Laser Lead', tagline: 'Zap the lead synth robot loves the high notes.', settings: S(118),
    requests: [
      Q('punk', 'Up high! 4 synth notes at row 8 or above.', { type: 'high', fam: 'synth', minRow: 7, min: 4 }),
      Q('critic', 'Variety, please: 4 different synth pitches.', { type: 'distinct', fam: 'synth', min: 4 }),
      Q('bot', 'ACTIVATE 4 ROBOTS.', { type: 'active', min: 4 })] },
  { title: 'Smooth Keys', tagline: 'Rhoda plays a mellow electric piano.', settings: S(110),
    requests: [
      Q('grandma', '6 notes on the keys robot.', { type: 'notes', fam: 'keys', min: 6 }),
      Q('cat', '...purr. Slower. 90 BPM or less.', { type: 'tempo', max: 90 }),
      Q('teacher', 'Use the Pentatonic scale — it never clashes.', { type: 'scale', any: ['pentatonic'] })] },
  { title: 'First Chord', tagline: 'Nimbus the chord pad can play several notes at once — stack them in one column.', settings: S(100),
    requests: [
      Q('teacher', 'Stack 3 notes in one column of the pad robot — twice!', { type: 'chord', fam: 'pad', min: 2 }),
      Q('dj', 'Give it some bass: 2 bass notes.', { type: 'notes', fam: 'bass', min: 2 })] },
  { title: 'Chord Progression', tagline: 'Ivory joins. Chords can be shared between robots too.', settings: S(104),
    requests: [
      Q('critic', 'Build a chord progression with 3 robots! (3 robots, same step, 2 different chords)', { type: 'chord', fam: ['piano', 'keys', 'pad'], robots: 3, min: 2, distinct: 2 }),
      Q('dave', 'Kick every beat!', { type: 'beat', fam: 'drum', on: 'every' })] },
  { title: 'Fanfare!', tagline: 'Blare the trumpet robot is ready to announce something.', settings: S(112),
    requests: [
      Q('queen', 'A fanfare! 4 brass notes.', { type: 'notes', fam: 'brass', min: 4 }),
      Q('bot', '3 ROBOTS HIT TOGETHER. 2 TIMES.', { type: 'unison', robots: 3, min: 2 }),
      Q('punk', 'Fast! 120 BPM or more.', { type: 'tempo', min: 120 })] },
  { title: 'Waltz of the Bots', tagline: 'Strum the guitar robot arrives. Waltzes count in 3 — the time signature is unlocked.', settings: S(120), unlock: ['time'],
    requests: [
      Q('grandma', 'A waltz! Set 3 beats per bar.', { type: 'timeSig', bpb: 3 }),
      Q('teacher', 'Strings on the first beat of every bar.', { type: 'beat', fam: 'pluck', on: 'downbeats' }),
      Q('dj', 'Bass on every downbeat too.', { type: 'beat', fam: 'bass', on: 'downbeats' })] },
  { title: 'Shake It', tagline: 'Shaka the shaker robot never stops moving.', settings: S(110),
    requests: [
      Q('dave', 'Shaker on EVERY step!', { type: 'fill', id: 'shaka', min: 1 }),
      Q('punk', '120 BPM or faster!', { type: 'tempo', min: 120 }),
      Q('bot', '6 ROBOTS ACTIVE.', { type: 'active', min: 6 })] },
  { title: 'Call and Response', tagline: 'Volt and Tubby join. One section asks a question, another answers.', settings: S(110),
    requests: [
      Q('teacher', 'Synth calls in the first half, brass answers in the second half!', { type: 'callResponse', a: 'synth', b: 'brass' }),
      Q('dj', '4 bass notes underneath.', { type: 'notes', fam: 'bass', min: 4 })] },
  { title: 'Fast & Energetic', tagline: 'Clapper brings the hands. Time to wake the crowd up.', settings: S(115),
    requests: [
      Q('punk', 'Make a fast, energetic beat! 140 BPM+', { type: 'tempo', min: 140 }),
      Q('dave', 'Drums on every beat!', { type: 'beat', fam: 'drum', on: 'every' }),
      Q('dj', 'Percussion on 75% of the steps.', { type: 'fill', fam: 'perc', min: 0.75 }),
      Q('bot', '30 NOTES TOTAL.', { type: 'density', min: 30 })] },
  { title: 'Lullaby', tagline: 'Marimbo the mallet robot plays softly. Not everyone has to play.', settings: S(96),
    requests: [
      Q('cat', 'Slow... 80 BPM or less.', { type: 'tempo', max: 80 }),
      Q('teacher', 'Pentatonic, so it stays gentle.', { type: 'scale', any: ['pentatonic'] }),
      Q('grandma', 'Keep it quiet: 20 notes at most.', { type: 'maxNotes', max: 20 }),
      Q('critic', 'The keys melody should end on a home note.', { type: 'endOnRoot', fam: 'keys' }),
      Q('kid', 'Leave 2 empty columns so I can breathe.', { type: 'rests', min: 2 })] },
  { title: 'Chromatic Chaos', tagline: 'Halo the glass pad shimmers in. Try every note there is.', settings: S(116),
    requests: [
      Q('punk', 'All 12 notes! Use the Chromatic scale.', { type: 'scale', any: ['chromatic'] }),
      Q('critic', '8 different synth pitches.', { type: 'distinct', fam: 'synth', min: 8 }),
      Q('dave', '3 percussion hits between the beats.', { type: 'offbeat', fam: 'perc', min: 3 })] },
  { title: 'Bass Walk', tagline: 'Subby the sub-bass robot can walk all over the scale.', settings: S(112),
    requests: [
      Q('dj', 'Walking bass: 4 bass notes climbing upward in a row.', { type: 'run', fam: 'bass', len: 4 }),
      Q('teacher', 'Stretch it: bass notes 5+ rows apart.', { type: 'range', fam: 'bass', span: 5 }),
      Q('dave', 'Drums on every downbeat.', { type: 'beat', fam: 'drum', on: 'downbeats' })] },
  { title: 'Clap Back', tagline: 'Tom-Tom and Dingdong join the rhythm section.', settings: S(118, { stepsPerBeat: 4 }),
    requests: [
      Q('dave', 'Claps on the backbeat!', { type: 'beat', id: 'clapper', on: 'backbeat' }),
      Q('punk', 'Syncopate: 3 drum hits between beats.', { type: 'offbeat', fam: 'drum', min: 3 }),
      Q('bot', '4 ROBOTS IN UNISON. 2 TIMES.', { type: 'unison', robots: 4, min: 2 })] },
  { title: 'Ensemble Night', tagline: 'Keytar Kai completes a 21-robot ensemble. The drummer and hi-hat are already warmed up.', settings: S(112), prefill: ['thump', 'tik'],
    requests: [
      Q('bot', '12 ROBOTS PLAYING.', { type: 'active', min: 12 }),
      Q('critic', '3 melodic robots in a chord, twice.', { type: 'chord', fam: ['piano', 'keys', 'pad', 'brass'], robots: 3, min: 2 }),
      Q('dave', 'Drums on every beat.', { type: 'beat', fam: 'drum', on: 'every' })] },
  // ----- 21–40: bigger bands, tempo changes, advanced rhythm & melody -----
  { title: 'Harp Debut', n: 15, settings: S(100), prefill: ['drum'], tagline: 'Harpo the harp robot glides up the scale.',
    requests: [Q('grandma', 'A harp glissando: 5 rising string notes in a row.', { type: 'run', fam: 'pluck', len: 5 }), Q('teacher', 'Tempo between 90 and 110.', { type: 'tempo', min: 90, max: 110 })] },
  { title: 'Supersaw Sunrise', n: 16, settings: S(120), prefill: ['drum', 'perc', 'bass'], tagline: 'Laserbeam the supersaw lead. The rhythm section is already rolling.',
    requests: [Q('punk', '6 synth notes up high (row 9+).', { type: 'high', fam: 'synth', minRow: 8, min: 6 }), Q('dj', '128 BPM or more — festival speed.', { type: 'tempo', min: 128 })] },
  { title: 'Toy Box', n: 17, settings: S(110), prefill: ['drum'], tagline: 'Tinker plays a tiny toy piano.',
    requests: [Q('kid', '8 notes on the toy piano!', { type: 'notes', id: 'tinker', min: 8 }), Q('teacher', 'Pentatonic, please.', { type: 'scale', any: ['pentatonic'] }), Q('critic', '6 different piano pitches.', { type: 'distinct', fam: 'piano', min: 6 })] },
  { title: '808 Rumble', n: 18, settings: S(110), prefill: ['perc', 'keys'], tagline: 'Boom-808 brings a kick you can feel.',
    requests: [Q('dj', 'Deep bass: 6 notes in the bottom 4 rows.', { type: 'low', fam: 'bass', maxRow: 3, min: 6 }), Q('dave', '808 kick on every beat.', { type: 'beat', id: 'boom', on: 'every' }), Q('cat', 'Tempo 90 to 100.', { type: 'tempo', min: 90, max: 100 })] },
  { title: 'Trombone Slide', n: 19, settings: S(108, { stepsPerBeat: 4 }), prefill: ['drum', 'perc'], tagline: 'Slide the trombone robot loves sliding down.',
    requests: [Q('critic', 'Brass slides down: 4 falling notes in a row.', { type: 'run', fam: 'brass', len: 4, dir: 'down' }), Q('teacher', 'Brass calls (first half), strings answer (second half).', { type: 'callResponse', a: 'brass', b: 'pluck' })] },
  { title: 'Choir of Machines', n: 20, settings: S(100), prefill: ['drum', 'bass'], tagline: 'Choiri sings in big chords.',
    requests: [Q('queen', '2 pad robots, 3 chords, 3 different ones.', { type: 'chord', fam: 'pad', robots: 2, min: 3, distinct: 3 }), Q('grandma', 'Stately: 95 BPM or slower.', { type: 'tempo', max: 95 })] },
  { title: 'Acid Test', n: 21, settings: S(118, { stepsPerBeat: 4 }), prefill: ['drum', 'perc'], tagline: 'Acid Ace squelches between the beats.',
    requests: [Q('dj', '6 bass notes between the beats.', { type: 'offbeat', fam: 'bass', min: 6 }), Q('punk', '125 BPM or faster.', { type: 'tempo', min: 125 }), Q('critic', 'Go Chromatic.', { type: 'scale', any: ['chromatic'] })] },
  { title: 'Tambourine Parade', n: 22, settings: S(116), prefill: ['drum', 'bass', 'pad'], tagline: 'Tambo spins the tambourine.',
    requests: [Q('dave', 'Percussion on every single step.', { type: 'fill', fam: 'perc', min: 1 }), Q('bot', '5 ROBOTS TOGETHER. 3 TIMES.', { type: 'unison', robots: 5, min: 3 })] },
  { title: 'Vibraphone Lounge', n: 23, settings: S(100), prefill: ['bass', 'drum'], tagline: 'Vibey brings the cocktail-lounge mallets.',
    requests: [Q('cat', 'Lounge tempo: 70 to 90.', { type: 'tempo', min: 70, max: 90 }), Q('teacher', 'Pentatonic.', { type: 'scale', any: ['pentatonic'] }), Q('grandma', '10 keys notes...', { type: 'notes', fam: 'keys', min: 10 }), Q('critic', '...ending on a home note.', { type: 'endOnRoot', fam: 'keys' })] },
  { title: 'Arcade', n: 24, settings: S(130, { stepsPerBeat: 4 }), prefill: ['drum', 'perc', 'bass'], tagline: 'Chiptune speaks fluent 8-bit.',
    requests: [Q('kid', '8 notes from Chiptune!', { type: 'notes', id: 'chip', min: 8 }), Q('punk', 'A 6-note rising synth run!', { type: 'run', fam: 'synth', len: 6 }), Q('dj', '140 BPM+', { type: 'tempo', min: 140 })] },
  { title: 'Banjo Hoedown', n: 25, settings: S(130), prefill: ['bass', 'perc'], tagline: 'Banjo Bo picks fast.',
    requests: [Q('grandma', 'Hoedown speed: 150 BPM!', { type: 'tempo', min: 150 }), Q('dave', '6 string notes between the beats.', { type: 'offbeat', fam: 'pluck', min: 6 }), Q('kid', 'Drums every beat!', { type: 'beat', fam: 'drum', on: 'every' })] },
  { title: 'Celestial', n: 25, settings: S(96), prefill: ['bass', 'drum'], tagline: 'Celeste rings like starlight.',
    requests: [Q('queen', '5 piano notes way up high (row 10+).', { type: 'high', fam: 'piano', minRow: 9, min: 5 }), Q('teacher', 'Pad chords, twice.', { type: 'chord', fam: 'pad', min: 2 }), Q('cat', '85 BPM or slower.', { type: 'tempo', max: 85 })] },
  { title: 'Thunder Toms', n: 26, settings: S(112, { stepsPerBeat: 4 }), prefill: ['perc', 'bass'], tagline: 'Thud the floor tom joins the drum line.',
    requests: [Q('punk', '16 drum hits.', { type: 'notes', fam: 'drum', min: 16 }), Q('bot', '3 DRUMMERS IN UNISON. 4 TIMES.', { type: 'unison', fam: 'drum', robots: 3, min: 4 })] },
  { title: 'Horn Section', n: 26, settings: S(118), prefill: ['drum', 'perc', 'bass'], tagline: 'Hornby leads the brass section.',
    requests: [Q('queen', '3 brass robots in a chord — 2 different chords.', { type: 'chord', fam: 'brass', robots: 3, min: 2, distinct: 2 }), Q('dave', '4 brass robots playing.', { type: 'active', fam: 'brass', min: 4 })] },
  { title: 'Strings Attached', n: 27, settings: S(120), unlock: ['time'], prefill: ['drum'], tagline: 'Sylvie and the strings want a waltz.',
    requests: [Q('grandma', 'A waltz in 3.', { type: 'timeSig', bpb: 3 }), Q('critic', '4 pad/string robots in a chord, twice.', { type: 'chord', fam: ['pad', 'pluck'], robots: 4, min: 2 })] },
  { title: 'Wobble Drop', n: 28, settings: S(130), prefill: ['drum', 'perc', 'bass'], tagline: 'Wobbles wants a drop. Drops need silence first.',
    requests: [Q('dj', 'THE DROP: 4 completely silent columns.', { type: 'rests', min: 4 }), Q('punk', 'Low wobble: 6 bass notes in the bottom 5 rows.', { type: 'low', fam: 'bass', maxRow: 4, min: 6 }), Q('dave', '135 to 145 BPM.', { type: 'tempo', min: 135, max: 145 })] },
  { title: 'Whistle While You Work', n: 28, settings: S(110), prefill: ['keys', 'drum'], tagline: 'Whistler hits the highest notes in the band.',
    requests: [Q('kid', '4 synth notes at the very top (row 11+).', { type: 'high', fam: 'synth', minRow: 10, min: 4 }), Q('teacher', 'A 5-note falling synth line.', { type: 'run', fam: 'synth', len: 5, dir: 'down' }), Q('grandma', 'Major scale.', { type: 'scale', any: ['major'] })] },
  { title: 'Clav Funk', n: 29, settings: S(108, { stepsPerBeat: 4 }), prefill: ['perc'], tagline: 'Clavo plays the funkiest chops.',
    requests: [Q('dave', '6 keys notes between beats.', { type: 'offbeat', fam: 'keys', min: 6 }), Q('dj', 'Backbeat on the drums.', { type: 'beat', fam: 'drum', on: 'backbeat' }), Q('punk', '4 offbeat bass notes.', { type: 'offbeat', fam: 'bass', min: 4 }), Q('cat', '100 to 115 BPM.', { type: 'tempo', min: 100, max: 115 })] },
  { title: 'Rimshot Reggae', n: 29, settings: S(90), prefill: ['bass'], tagline: 'Rimshot knows the one-drop.',
    requests: [Q('dj', 'Skank! 8 keys/strings notes on the off-beats.', { type: 'offbeat', fam: ['keys', 'pluck'], min: 8 }), Q('dave', 'Drums on every downbeat.', { type: 'beat', fam: 'drum', on: 'downbeats' }), Q('cat', '80 BPM or slower.', { type: 'tempo', max: 80 })] },
  { title: 'Koto Garden', n: 30, settings: S(92), tagline: 'Koto brings calm. 30 robots, and space between the notes.',
    requests: [Q('teacher', 'Pentatonic.', { type: 'scale', any: ['pentatonic'] }), Q('cat', '80 BPM or slower.', { type: 'tempo', max: 80 }), Q('critic', '7 different string pitches.', { type: 'distinct', fam: 'pluck', min: 7 }), Q('grandma', '2 silent columns, then home.', { type: 'rests', min: 2 }), Q('queen', 'End the strings on a home note.', { type: 'endOnRoot', fam: 'pluck' })] },
  // ----- 41–50: master orchestrations -----
  { title: 'Honky-Tonk Hall', n: 32, settings: S(112), prefill: ['keys', 'synth', 'pad', 'brass', 'pluck', 'bass', 'drum', 'perc'], tagline: 'Honky joins a 32-robot orchestra. The pianos are silent — fix that.',
    requests: [Q('bot', 'ALL ROBOTS PLAY.', { type: 'allPlay' }), Q('punk', '120 BPM+', { type: 'tempo', min: 120 }), Q('queen', '2 piano robots in a chord, twice.', { type: 'chord', fam: 'piano', robots: 2, min: 2 })] },
  { title: 'Arpeggio Storm', n: 34, settings: S(124, { stepsPerBeat: 4 }), prefill: ['piano', 'keys', 'pad', 'brass', 'pluck', 'bass', 'drum', 'perc'], tagline: 'Arpeggia leads a storm of synths.',
    requests: [Q('dj', '6-note rising synth run.', { type: 'run', fam: 'synth', len: 6 }), Q('punk', 'Synths on 75% of steps.', { type: 'fill', fam: 'synth', min: 0.75 }), Q('bot', 'ALL ROBOTS PLAY.', { type: 'allPlay' })] },
  { title: 'Smoky Sax', n: 36, settings: S(100), prefill: ['bass', 'drum', 'perc', 'keys'], tagline: 'Saxby takes a solo.',
    requests: [Q('cat', 'Late night: 70–90 BPM.', { type: 'tempo', min: 70, max: 90 }), Q('teacher', 'Pentatonic.', { type: 'scale', any: ['pentatonic'] }), Q('critic', '6 different brass pitches...', { type: 'distinct', fam: 'brass', min: 6 }), Q('grandma', '...ending home.', { type: 'endOnRoot', fam: 'brass' })] },
  { title: 'FM Factory', n: 38, settings: S(120, { stepsPerBeat: 4 }), prefill: ['drum', 'perc', 'synth', 'pad'], tagline: 'FM Fred stomps on the off-beats.',
    requests: [Q('dj', '8 bass notes between the beats.', { type: 'offbeat', fam: 'bass', min: 8 }), Q('bot', '8 ROBOTS IN UNISON. TWICE.', { type: 'unison', robots: 8, min: 2 }), Q('punk', 'Chromatic.', { type: 'scale', any: ['chromatic'] })] },
  { title: 'Prism Cathedral', n: 40, settings: S(100), prefill: ['bass', 'perc', 'brass'], tagline: 'Prism refracts a giant chord.',
    requests: [Q('queen', '5 pad/keys/piano robots in a chord: 3 chords, 3 different.', { type: 'chord', fam: ['pad', 'keys', 'piano'], robots: 5, min: 3, distinct: 3 }), Q('grandma', '90 BPM or slower.', { type: 'tempo', max: 90 })] },
  { title: 'Island Uke', n: 42, settings: S(110), prefill: ['drum', 'perc', 'bass', 'pad'], tagline: 'Ukey strums a sunny call and response.',
    requests: [Q('teacher', 'Strings call, brass responds.', { type: 'callResponse', a: 'pluck', b: 'brass' }), Q('dave', '100–120 BPM.', { type: 'tempo', min: 100, max: 120 }), Q('kid', 'Major scale!', { type: 'scale', any: ['major'] })] },
  { title: 'Baroque & Roll', n: 44, settings: S(120, { stepsPerBeat: 4 }), prefill: ['drum', 'bass', 'perc', 'pad', 'brass'], tagline: 'Baroque meets rock: runs in both directions.',
    requests: [Q('critic', 'Piano runs up 6 notes.', { type: 'run', fam: 'piano', len: 6 }), Q('punk', 'Synth runs down 5 notes.', { type: 'run', fam: 'synth', len: 5, dir: 'down' }), Q('dj', '130 BPM+', { type: 'tempo', min: 130 })] },
  { title: 'Conga Line', n: 46, settings: S(118), prefill: ['drum', 'bass', 'keys', 'pad', 'brass', 'synth'], tagline: 'Conga Lina starts a conga line across the whole stage.',
    requests: [Q('dave', 'Percussion on every step.', { type: 'fill', fam: 'perc', min: 1 }), Q('bot', '10 ROBOTS TOGETHER. 4 TIMES.', { type: 'unison', robots: 10, min: 4 }), Q('queen', 'Everyone plays.', { type: 'allPlay' })] },
  { title: 'Maestro Rising', n: 49, settings: S(126), prefill: ['drum', 'perc', 'bass', 'pluck', 'brass'], tagline: 'Maestro arrives. 49 robots await the downbeat.',
    requests: [Q('bot', 'ALL 49 ROBOTS PLAY.', { type: 'allPlay' }), Q('queen', '6 robots in a chord — 2 different chords.', { type: 'chord', robots: 6, min: 2, distinct: 2 }), Q('punk', '4 synth notes up high.', { type: 'high', fam: 'synth', minRow: 9, min: 4 }), Q('dj', '120–140 BPM.', { type: 'tempo', min: 120, max: 140 })] },
  { title: 'The Grand Finale', n: 50, settings: S(120, { stepsPerBeat: 4 }), prefill: ['drum', 'perc', 'bass', 'pad', 'brass', 'keys', 'pluck'], tagline: 'All 50 robots. One last performance.',
    requests: [
      Q('bot', 'ALL 50 ROBOTS PLAY.', { type: 'allPlay' }),
      Q('queen', '8 robots in a chord, 4 times, 3 different chords.', { type: 'chord', robots: 8, min: 4, distinct: 3 }),
      Q('dave', '20 robots hit together, twice!', { type: 'unison', robots: 20, min: 2 }),
      Q('dj', 'Then a 2-column dramatic pause.', { type: 'rests', min: 2 }),
      Q('punk', '125 BPM+', { type: 'tempo', min: 125 }),
      Q('grandma', 'And the piano ends on a home note.', { type: 'endOnRoot', fam: 'piano' })] },
];

export const LEVELS = DEFS.map((d, i) => {
  const n = i + 1;
  const robots = d.robots || (d.n ? band(n, d.n) : unlockedBy(n).map((r) => r.id));
  return {
    n, title: d.title, tagline: d.tagline, robots, robotOpts: d.robotOpts || {},
    settings: d.settings, unlock: d.unlock || [], prefill: d.prefill || [], requests: d.requests,
  };
});

/** Build the starting Song for a level (robots on stage, settings, prefilled riffs). */
export function levelSong(level, Song) {
  const song = new Song({ ...level.settings, root: 60, loop: true });
  level.robots.forEach((id, i) => {
    const r = song.addRobot(id, level.robotOpts[id]);
    if (level.prefill.includes(r.def.family) || level.prefill.includes(id)) song.riff(r, level.n * 1000 + i);
  });
  return song;
}
