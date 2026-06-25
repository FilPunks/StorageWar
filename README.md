# Storage War — A FilPunks Survival Game

A retro-style Vampire Survivors-like browser game built with vanilla JavaScript and HTML5 Canvas. Fight waves of computer-hardware-themed enemies, collect XP, level up, and survive as long as you can.

**Current version: 1.5**

## Gameplay

Survive endless waves of computer-themed enemies. Move with WASD or arrow keys, your weapons auto-fire. Collect XP coins to level up and choose from a pool of powerful skills. Six bosses will challenge you at set intervals. Connect your wallet to unlock exclusive NFT features. How long can you last?

## Features

- **8 Active Weapons** — arc slashes, homing projectiles, laser beams, orbiting pulse balls, black holes, fire auras, chain lightning, and cooling fan blades
- **7 Passive Skills** — boost HP regen, attack power, move speed, XP gain, pickup range, cooldown reduction, and damage reduction
- **Skill Evolution** — each weapon evolves into a powerful new form at Level 5
- **10 Enemy Types** — Floppy Disk, SSD, Hard Disk, USB Stick, RAID Array, CD/DVD, Child Process, plus 6 unique Bosses
- **6 Boss Fights** — see table below for spawn times and behaviors
- **Wallet & NFT Integration** — connect MetaMask/Rabby (Filecoin mainnet) to replace player sprite with your FilPunks NFT and unlock the Q-key ultimate "GC Sweep"
- **Q Ultimate: GC Sweep** — NFT holders only, instant screen-wide enemy clear with chain verification, 30s cooldown, charge-up effects and massive audio-visual feedback
- **Retro Pixel-Art Aesthetic** — procedurally generated pixel sprites, screen shake, particle effects
- **Sound Effects** — Web Audio API procedural retro sounds for every weapon, enemy death, and boss attack
- **Bilingual** — toggle between Chinese and English

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrow Keys | Move |
| 1 / 2 / 3 or Click | Select upgrade |
| Q | Ultimate: GC Sweep (NFT holders only) |
| P | Pause / Resume |
| Space / Enter | Start / Restart |

## Enemies

| Enemy | Behavior |
| --- | --- |
| Floppy Disk | Basic chaser |
| USB Stick | Keeps distance, fires projectiles |
| SSD | Charges at player when close, explodes on contact |
| Hard Disk | Slow but tanky |
| CD/DVD | Fast and agile |
| RAID Array | Very tanky, high damage |
| Child Process | Fast chaser, spawned by Kernel Panic |
| **Overclocked CPU** (1:30) | Boss — heat waves, periodic charge |
| **Ransomware Rootkit** (4:00) | Boss — orbits player, spawns minions, projectile barrage |
| **NVIDIA RTX 9090** (7:30) | Boss — rotating laser beam, fan vortex pull, bullet volley, rage mode |
| **Kernel Panic** (11:00) | Boss — Core Dump (360° dense projectile barrages), System Crash (input reversal or random teleport), BSOD-themed |
| **Pump & Dump** (13:30) | Boss — three-phase crypto cycle: Pump (inflates, chases, vacuums XP), Dump (dual-ring shockwave explosion), Crash (shrinks & flees); countdown warns before next Pump |
| **Doge Coin** (16:00) | Boss — bouncing movement, Dogecoin projectiles, meme attack phrases (wow / much damage / very fast / such danger) |

## Skills

### Active Weapons

| Weapon | Evolution (Lv5) |
| --- | --- |
| Sector Sweep | Format Drive — 360° slash + knockback |
| Bit Blaster | Quantum Stream — lock-on + 360° volleys |
| 404 Particle Beam | 502 Gateway Blast — dual/cross lasers |
| Ping Pulse Charge | Latency Storm — dual-layer orbiting balls |
| Zip Black Hole | Tarball Singularity — instakill on expiry |
| Firewall | Next-Gen Firewall — double range + slow |
| USB Chain Lightning | Thunderbolt Protocol — 8 bounces + AOE |
| Cooling Fan Blades | Absolute Zero — periodic time freeze |

### Passive Skills

RAID Redundancy, ECC Memory, NVMe Bus, Machine Learning, Cloud Backup, Overclock, Firewall Rules — each has 5 levels with a powerful Lv5 bonus.

## Run Locally

Open `index.html` in any modern browser. No build step, no dependencies.

Or play on [GitHub Pages](https://github.com/your-username/your-repo).

## Tech Stack

- HTML5 Canvas 2D
- Vanilla JavaScript (ES Modules)
- Web Audio API (procedural sound)
- ethers.js v6 (wallet integration)
- Filecoin mainnet (FilPunks NFT verification)
- Zero external build dependencies

## Credits

Built with [DeepSeek V4](https://deepseek.com) and [Proma.ai](https://github.com/proma-ai/Proma)
