# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/ridhofatahillah2004-byte/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/ridhofatahillah2004-byte/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**NOVA KEEPER** — an original arcade wave-defense game for make.fun's
best-game-01 ($1,000). Defend the star core at the center of the screen
from 5 enemy types across 10 waves, with upgrade cards between waves, a
combo multiplier up to x5, and a Nova blast that clears the screen. All art
is drawn from code (canvas 2D), all sound is synthesized WebAudio — no
external assets, no network. Plain static files a desktop browser loads
offline.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

---

<sub>Entered on [make.fun](https://make.fun/?ref=xbc8h78c&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

## How to play

- **Aim** with the mouse, **hold click** to shoot.
- **Shift** — Nova blast: destroys every enemy on screen (limited charges).
- **1 / 2 / 3** or click a card — pick 1 of 3 upgrades between waves.
- **P** pause, **M** mute, **R** restart.

Win by clearing all 10 waves; lose if the core's HP runs out. Enemies:
mote, darter, splitter (splits into 2), weaver, and the bulwark tank.
Upgrades: fire rate, damage, multi-shot, pierce, nova, repair, bolt speed.

## Screenshots

Rendered from the real game in Chrome (1280×800):

- `screenshots/1-start.jpg` — title screen
- `screenshots/2-play.jpg` — Wave 2 in progress
- `screenshots/3-upgrade.jpg` — upgrade card choice
- `screenshots/4-end.jpg` — game over screen

## How it was verified

- `main.ts` (the entrypoint) copies `game/` and `screenshots/` to the
  output and writes `dossier.json`; run twice, the dossier is byte-identical.
- No network references anywhere in `game/`; everything is local and static.
- Win and lose paths verified by simulation: a perfect autopilot clears
  wave 10, a human-like autopilot wins all 5 seeds (core HP down to 44 on
  one), and a non-shooting autopilot dies and reaches the game-over screen.
