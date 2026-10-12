# Robot Orchestra: Perform for the Audience

A 3D rhythm-puzzle game built around a sequencer grid in the style of Chrome Music Lab's Song Maker. You program a band of up to 50 robots to win over a crowd. Each robot dances, exactly on the beat, whenever one of its notes plays.

**Play:** https://fanaustinca.github.io/robot-orchestra/

- **50-show campaign.** Shows 1–5 start with Pip the piano robot and 1–4 robots. Shows 6–20 bring in keys, synths, chord pads, brass, strings and bass. Shows 21–40 have 15–30 robots with tempo changes and harder rhythms. Shows 41–50 are orchestrations with 32–50 robots.
- **Audience requests.** Fans ask for things like *"Play a happy piano bass melody!"*, *"Make a fast, energetic beat!"* or *"Build a chord progression with 3 robots!"*. Once every request is met, play the loop all the way through to fill the meter and get a standing ovation. 💡 explains a request, and "Show me" solves it for you at the cost of a star.
- **Free Play.** Always open from the main menu. All 50 robots, up to 50 on stage at once. Every control is available: tempo, beats per bar, steps per beat, bars, 7 scales, start note and range. Your song is saved automatically.
- **9 robot families, 50 robots.** All robots share one design language: glossy pearl or graphite shells, a black-glass visor with a neon eye strip, and neon seams. Each family has its own silhouette and instrument:

| Family | Body | Instrument | Typical moves |
|---|---|---|---|
| 🎹 Piano | slim, tapered torso, tailcoat fins, bow tie | keyboard chest plate, long tapping fingers | nod & key-tap, keyboard sweep |
| 🎛️ Keys | boxy, headphones | floating keytar | sway, shimmy, pop & lock |
| 📡 Lead Synth | tall, streamlined, swept fins | glowing antennae, 3×3 flashing chest panel | fist pump, backflip, disco point |
| 🪐 Chord Pad | hovering sphere, thruster | orbit rings that swell with each chord | orbit float, spin |
| 🎺 Brass | barrel chest, valves | sousaphone bell that flares | horn raise, slide push |
| 🎸 Strings | lanky, cyclops eye | guitar / harp / banjo / koto / ukulele | strum lean, wave |
| 🔊 Bassline | low and wide, tank treads | glowing subwoofer cone that pulses | bass pulse squat, stomp walk |
| 🥁 Drums | heavy, bulky, shoulder pads | kick / snare / tom drum, sticks | foot stomp, drum roll, big clap |
| 🪇 Percussion | four arms on a gyro ball | shakers, spinning halo | arm spin, head shake, jump |

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

There is no backend. `dist/` is a static site. Debug URLs: `?level=12` opens a show directly, `?free` opens Free Play, `?lineup` shows every robot side by side, and `?fresh` clears saved progress.

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
  audio.js            Tone.js: one instrument per robot, Transport step clock, Tone.Draw → visuals
  sequencer.js        the canvas grid (pitch rows + percussion lanes, drag painting, playhead)
  robots3d.js         procedural robot models (shared kit + 9 family builders) and the dance moves
  stage.js            Three.js scene: risers, LED wall, light beams, audience, bloom, thumbnails
public/samples/piano  Salamander Grand Piano samples (CC-BY 3.0, Alexander Holm)
tests/
  logic.mjs           every level is solvable and not already solved at the start (Node)
  e2e.mjs             Puppeteer: real mouse input, all 50 shows won, audio clock, dances, 50-robot free play
  shots.mjs           renders robot lineups and key screens for visual review
```

### How the timing works

`audio.js` schedules one repeating Transport event per grid step. Its interval is `PPQ / stepsPerBeat` ticks, so tempo changes take effect immediately. Each event starts that step's notes at the exact audio time `t`. It also calls `Tone.Draw.schedule(..., t)`, which runs the robots' `hit()` (dance move, glow, instrument reaction) and the grid playhead on the animation frame closest to when the sound is heard. Robot animation is driven only by these callbacks, so the visuals can't drift away from the audio.

GitHub Actions builds the game and runs both test suites on every push to `main`, then deploys `dist/` to GitHub Pages.
