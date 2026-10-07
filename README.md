# Micron Chip Camp — Peeko · Chip Bot · Jarvis

One offline-capable website (open `index.html` in Chrome or Edge; nothing to install). The welcome screen follows
**Option 2** of the sticker deck and links to three tools:

| Page | What it is | Day it fits (from the agendas) |
|---|---|---|
| `index.html` | **Welcome screen.** Student types their name and picks their robot (Chip Bot / Peeko / Jarvis). Those choices carry into every tool. Shows progress. | Day 1 kickoff |
| `logic.html` | **The CHIP Challenge** — 10 Blockly-Games-style levels that teach computational logic. The same puzzles are skinned for each room (Chip Bot walks to a microchip, Peeko finds a smile, Jarvis's water drop reaches a thirsty plant). | Day 1 "CHIP Challenge" and the Day 2 recap warm-up |
| `circuits.html` | **Circuit Lab** (Tinkercad-style) — drag parts out of the kit, plug servos into the shield, wire sensors, seat parts in a breadboard. A live checklist tells students exactly what is wrong ("TRIG is connected to D9, but it needs to go to D8"). | "Wire it up" / "Add the senses" |
| `blocks.html` | **Code Builder** (Camp Blocks) — students build the logic with blocks and copy a tested Arduino sketch. | "First spark" and all of Day 2 |

## The CHIP Challenge (10 levels)
1 Sequence · 2 Sequence + turning · 3 Loops · 4 Loops with several blocks · 5 Nested loops · 6 Repeat until ·
7 If · 8 If/else · 9 Bug hunt (fix a broken program) · 10 The right-hand-rule wall follower.

Each level has a block limit, so loops and `if` are genuinely *required* (tests prove the long way never fits).
Failures are deliberately funny and reinforce "machines do exactly what you tell them". After two failed runs a
"Show me a solution" button appears; peeking caps the stars at 1. A "See it as real robot code" panel shows the
Arduino-style code the blocks would become.

## Circuit Lab — what it assumes about the kit
Arduino **Nano on an IO sensor shield** (the decision in the project notes). Header pins are S (signal, yellow),
V (power, red), G (ground, black). 3-pin parts (servo, buzzer, soil sensor) plug onto a header; **click a plug to flip it** —
a reversed plug is a classic real-life mistake and the checker explains it. 4-pin parts (HC-SR04, OLED) are wired with
jumpers. Jarvis uses a breadboard for the LDR divider (10 kΩ) and the RGB LED (three 220 Ω resistors).

Pins are the ones in the real firmware: Chip Bot servos D2/D3/D4/D5, TRIG D8, ECHO D9, buzzer D13, servo battery on the
EXT terminal; Peeko OLED on I2C (A4/A5), head servo D9, buzzer D8; Jarvis soil A0, LDR A1, RGB D9/D10/D11, buzzer D8.
Bonus parts (the buzzers on Chip Bot and Peeko) are optional but must be right if placed.
Facilitators have a **"Show finished circuit"** button to compare against.

## Code Builder — why the code can be trusted
The tool never writes a robot's code from scratch. Each robot has a **tested base sketch** in `firmware/*.base.ino` and
the tool only fills in the marked student parts. Every student value is bounded (numbers clamped, text letters/numbers
only, choices from fixed lists).

| Robot | Base is | Changed vs. the tested original |
|---|---|---|
| Peeko | your bench-tested `~/Documents/Arduino/AT/AT.ino` (v2) | the 9-line serial loop moved into `pollSerial()` (same code) + small hooks. All 9 serial commands still work, so Teachable Machine can still send `happy`, `sad`, … |
| Chip Bot | Otto walk/turn/dance + servo + distance code from `chipbot/firmware/chipbot/chipbot.ino`, verbatim | Studio's USB/EEPROM-program machinery left out. Servo trims saved by Chip Bot Studio are still read. |
| Jarvis | written fresh (small) | **not bench-tested yet** |

## Before camp: put the examples on real hardware
`bench-test/` has one finished, compile-verified sketch per robot (Arduino IDE, **Board: Arduino Nano**; if upload
fails, **Processor: ATmega328P (Old Bootloader)**).
- **Peeko** — says its name, then a coin flip shows a happy or sad face every 3 s. Serial Monitor (9600, Newline): type `celebrate`.
- **Chip Bot** — beeps twice, walks forward, turns left when something is closer than 15 cm. Servo power from the 4×AA pack.
  *Flashing this replaces the Chip Bot Studio firmware; re-flash `chipbot/firmware/chipbot/chipbot.ino` to go back.*
- **Jarvis** — calibrate first with a `print sensor readings` block, then enter the raw dry/wet soil numbers under
  *Facilitator: bench settings* on the Code tab (also LED common-anode and light direction).

## Checks that have been run (laptop only, no robots)
`node tests/run_all.js` (needs Node; the sketch compile also needs the Arduino IDE app, and the base files from your
Arduino folder, so on another machine use `--no-compile`)
- **Code Builder (198)** — 12 generated sketches compile for a Nano with the Arduino IDE's own toolchain; Peeko base differs
  from `AT.ino` only by the moved serial loop; hostile text (quotes, emoji, `"; system(...)`) cannot reach the code.
- **CHIP Challenge (143)** — every level solvable inside its block limit; the flat solution never fits levels 3–10; the
  level-9 bug really fails; the level-10 maze defeats the simpler programs.
- **Circuit Lab (447)** — the finished circuit for each robot passes; removing any wire/part, unplugging, flipping,
  wrong pin, swapped TRIG/ECHO or SDA/SCL, reversed power, missing or wrong resistors, shorts and joined pins are all caught
  with a helpful message; breadboard column/trench/rail rules.
- In a real browser: mouse drag-and-drop for blocks (including nested), plugs onto headers, wires, seating parts in the
  breadboard, and no horizontal scrolling down to phone width.

**Not tested yet:** any of this on physical Nano / servos / OLED / sensors, or on a touch screen.

## Rebuilding
`node build.js` bundles `src/` + `firmware/` into the four HTML files. Brand assets are in `assets/` (the Micron and Lend A
Hand India logos were cut from the sticker artwork as white-on-transparent PNGs).
