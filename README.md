# Beep Bop Band

*(formerly Robot Orchestra)* A 3D rhythm-puzzle game built around a sequencer grid in the style of Chrome Music Lab's Song Maker. You program a band of up to 50 robots to win over a crowd. Each robot dances, exactly on the beat, whenever one of its notes plays.

**Play:** https://fanaustinca.github.io/beep-bop-band/

- **50-show campaign.** Shows 1–5 start with Pip the piano robot and 1–4 robots. Shows 6–20 bring in keys, synths, chord pads, brass, strings and bass. Shows 21–40 have 15–30 robots with tempo changes and harder rhythms. Shows 41–50 are orchestrations with 32–50 robots.
- **Audience requests.** Fans ask for things like *"Play a happy piano bass melody!"*, *"Make a fast, energetic beat!"* or *"Build a chord progression with 3 robots!"*. Once every request is met, play the loop all the way through to fill the meter and get a standing ovation. 💡 explains a request, and "Show me" solves it for you at the cost of a star.
- **Free Play.** Always open from the main menu. All 50 robots, up to 50 on stage at once. Every control is available: tempo, beats per bar, steps per beat, bars, 7 scales, start note and range. Your song is saved automatically.
- **Song Book.** 10 happy songs ready to play with one click: originals (*Sunny Side Up*, *Robot Disco*, *Island Breeze*, *8-Bit Adventure*, *Morning Waltz*), public-domain classics (*Ode to Joy*, *Twinkle Twinkle*, *Oh! Susanna*, *When the Saints*) and *Everybody Jam!*, which gives a part to all 50 robots. Each song is a short pattern script in `src/songbook.js`, so adding one is easy.
- **Share codes.** 🔗 Share turns the current song into a code like `BEEP1zVY07Co…`, usually 130–210 characters. Paste a code into *Load a code* to load the song, or share a `?song=` link that opens it directly. Codes are packed binary, deflate-compressed and base64url-encoded. Everything is stored in the code itself, so no server is needed.
- **Real dance routines.** Every robot has a 2-bar choreography locked to the beat: the robot, floss, moonwalk, running man, sprinkler, raise the roof, disco point, cabbage patch, backflips, spins and 22 more. A robot dances while it's playing and goes back to idle about a bar after it stops. Each note adds an accent: a glow, a pop and an instrument reaction such as piano fingers, drumsticks or a flaring brass bell.
- **9 robot families, 50 robots.** All robots share one design language: glossy pearl or graphite shells, a black-glass visor with a neon eye strip, and neon seams. Each family has its own silhouette and instrument:

| Family | Body | Instrument | Example routines |
|---|---|---|---|
| 🎹 Piano | slim, tapered torso, tailcoat fins, bow tie | keyboard chest plate, long tapping fingers | piano groove, glissando sweep |
| 🎛️ Keys | boxy, headphones | floating keytar | smooth groove, the twist, shoulder shimmy |
| 📡 Lead Synth | tall, streamlined, swept fins | glowing antennae, 3×3 flashing chest panel | fist pump, the robot, backflip, disco point |
| 🪐 Chord Pad | hovering sphere, thruster | orbit rings that swell with each chord | zero-g swim, spin move |
| 🎺 Brass | barrel chest, valves | sousaphone bell that flares | raise the roof, moonwalk slide |
| 🎸 Strings | lanky, cyclops eye | guitar / harp / banjo / koto / ukulele | rock-star windmill, arm wave, cabbage patch |
| 🔊 Bassline | low and wide, tank treads | glowing subwoofer cone that pulses | bass-drop squat, running man, march |
| 🥁 Drums | heavy, bulky, shoulder pads | kick / snare / tom drum, sticks | stomp & clap, drum solo, clap-along |
| 🪇 Percussion | four arms on a gyro ball | shakers, spinning halo | sprinkler, headbang, the floss, jumping jacks |

## Controls

| | |
|---|---|
| Click / drag on the grid | place or erase notes (drag paints) |
| Robot list or click a robot on stage | select which robot you're editing |
| <kbd>Space</kbd> | play / pause |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> | undo |
| <kbd>↑</kbd>/<kbd>↓</kbd> | previous / next robot |
| Drag the stage, double-click | orbit the camera, reset the view |

## Setup

```bash
npm install
npm run dev          # http://localhost:8941
npm run build        # static site in dist/
npm test             # build + level-solvability checks + headless browser tests
```

There is no backend. `dist/` is a static site. Debug URLs: `?level=12` opens a show directly, `?free` opens Free Play, `?song=BEEP1…` loads a shared song, `?lineup` shows every robot side by side, and `?fresh` clears saved progress.

Tools: `node tests/perf.mjs` (50-robot load probe), `node tests/dspbench.mjs` (audio DSP cost, old live synths vs. samples), `node tests/dances.mjs` (dance pose screenshots) and `node tests/shots.mjs` (lineups and screens).

## Code structure

```
index.html            layout: top bar, sequencer, 3D stage, Song Maker-style control bar, menus
src/
  main.js             app glue: modes, level flow, audience meter, roster, inspector, picker, undo
  music.js            scales, note names, grid row → MIDI, seeded RNG
  catalog.js          the 50 robots (family, sound preset, dance move, accent colour, unlock show)
  presets.js          sound preset octave offsets and labels (plain data)
  song.js             Song model: robots, step patterns, settings, family-aware "Riff" writer
  levels.js           the 50 shows: robots on stage, settings, prefilled parts, audience requests
  audience.js         request types (notes, chords, beats, runs, tempo, rests…) + hints + solvers
  audio.js            sample engine: Tone.js patches pre-rendered offline, native voices, Transport clock
  dances.js           30 choreographed 8-beat dance routines (pose keyframes on the beat clock)
  songbook.js         the 10 premade happy songs as pattern scripts
  share.js            share codes: binary pack → deflate → base64url
  sequencer.js        the canvas grid (pitch rows + percussion lanes, drag painting, playhead)
  robots3d.js         procedural robot models (shared kit + 9 family builders), rigid skinning, accents
  stage.js            Three.js scene: risers, LED wall, light beams, audience, bloom, thumbnails
public/samples/piano  Salamander Grand Piano samples (CC-BY 3.0, Alexander Holm)
tests/
  logic.mjs           every level is solvable and not already solved at the start (Node)
  e2e.mjs             Puppeteer: real mouse input, all 50 shows won, audio clock, dances, 50-robot free play
  shots.mjs           renders robot lineups and key screens for visual review
```

### Performance: 50 robots on ordinary hardware

The first version ran one live Tone.js synth per robot, and those synths had always-on chorus, tremolo, delay and filter effects. With 50 robots that used about **95% of a CPU core** on the audio thread alone, so audio crackled or cut out even on fast laptops. Now:

- **Pre-rendered instruments.** When a robot first needs a pitch, its Tone.js patch is rendered once into a sample in an `OfflineAudioContext`, which runs off the main thread. Samples are spaced every 4 semitones, and notes between them are repitched by up to ±2 semitones. Each note then plays as one native `AudioBufferSourceNode` plus a gain envelope. The same 50-robot passage costs about **5% of a core**, roughly 19× less (`tests/dspbench.mjs`). Rendering all 50 robots takes a few seconds, but every robot gets one sample first, within about a second. Samples are loudness-normalized by family, so the mix stays balanced, and the master bus scales by √(band size) to leave headroom.
- **Audio scheduling.** The context uses `latencyHint: 'balanced'` with a 150 ms look-ahead, so a slow 3D frame can't make a note late.
- **Rigid skinning.** Each robot is one skinned mesh per material, and its animated joints act as bones. A 50-robot stage dropped from about 2,050 draw calls to about 740.
- **Frame cap.** Rendering is capped at 60 fps, because a 144–240 Hz laptop screen would otherwise render 2–4× as often and starve the main thread. Pixel ratio is capped at 1.5, and graphics quality drops automatically (High → Medium → Low) if frames stay slow.

### How the timing works

`audio.js` schedules one repeating Transport event per grid step. Its interval is `PPQ / stepsPerBeat` ticks, so tempo changes take effect immediately. Each event starts that step's notes at the exact audio time `t`. It also calls `Tone.Draw.schedule(..., t)`, which runs on the animation frame closest to when the sound is heard. That callback updates the grid playhead, fires each robot's note accent, and resyncs the stage's beat clock, which drives the dance routines. Between steps the beat clock runs freely, and each step corrects it, so the dancing stays locked to the audio.

GitHub Actions builds the game and runs both test suites on every push to `main`, then deploys `dist/` to GitHub Pages.
