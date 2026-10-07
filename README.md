# Camp Blocks — Peeko · Chip Bot · Jarvis

A Scratch-style block builder. The facilitator walks the room through the logic of a robot
(wake up → forever → wait → decide → repeat). The students choose the parts that are theirs
(their name, the robot's name, times, faces, notes, thresholds). **⚡ Code** then produces one
complete Arduino sketch to copy into the Arduino IDE.

Open `index.html` in Chrome or Edge. It is one file and works offline (the fonts fall back to
system fonts without Wi-Fi). Nothing is installed and nothing talks to the robot over USB.

## Why the code can be trusted

The block tool never writes the robot's code from scratch. Each robot has a **tested base sketch**
in `firmware/*.base.ino`. The tool only fills in clearly marked student parts, and every student
value is bounded (numbers are clamped, text is letters/numbers only, choices come from fixed lists).

| Robot | Base is | Only changed vs. the tested original |
|---|---|---|
| Peeko | your bench-tested `~/Documents/Arduino/AT/AT.ino` (v2) | the 9-line serial loop moved into `pollSerial()` (same code) + small hooks. All 9 serial commands still work, so the Teachable Machine layer can still send `happy`, `sad`, … |
| Chip Bot | the Otto walk/turn/dance + servo + distance code from `chipbot/firmware/chipbot/chipbot.ino`, verbatim | the Studio's USB/EEPROM-program machinery is left out. Servo trims saved by Chip Bot Studio are still read. |
| Jarvis | written fresh (small) | **not bench-tested yet** |

The code view shows the tested part folded away ("✓ 327 lines of tested Peeko code"). Student lines are
tinted by the block that made them, and the student's own words and numbers are highlighted yellow.

## Facilitator flow (each robot has the same 6 steps, with a talk-track under the step bar)
1. **Name it** — student name + robot name go into the code
2. **Wake up** — what happens once at power-on
3. **Forever** — what keeps happening
4. **Add time** — `wait`
5. **Make a choice** — `if / else` (Peeko: coin flip or dice; Chip Bot: distance; Jarvis: soil or light)
6. **Repeat**

`✨ Show me an example` loads a finished reference program. `▶ Run` plays the logic on the on-screen robot
(sliders stand in for the sensors) so students can see the logic before flashing.
`💾 Save` / `📂 My saves` keep each student's work for the 4-students-per-laptop rotation.
`🔗 Share` copies a program as text to move between laptops.

## Before camp: put the examples on real hardware
`bench-test/` has one finished, compile-verified sketch per robot. Open it in the Arduino IDE
(**Board: Arduino Nano**; if upload fails, **Processor: ATmega328P (Old Bootloader)**), upload, then:

- **Peeko** — says its name, then every 3 s a coin flip shows a happy or sad face. Open Serial Monitor
  (9600, Newline) and type `celebrate`: it should still react.
- **Chip Bot** — beeps twice, then walks forward and turns left when something is closer than 15 cm.
  Servo power must come from the 4×AA pack. *Flashing this replaces the Chip Bot Studio firmware; re-flash
  `chipbot/firmware/chipbot/chipbot.ino` to go back to Studio.*
- **Jarvis** — **calibrate first**: use a `print sensor readings` block, read the raw soil number in dry air and in
  a glass of water, and enter them under *Facilitator: bench settings* on the Code tab (also set LED
  common-anode and light direction if the colours or brightness are backwards).

## Checks that have been run (laptop only, no robots)
`node tests/run_tests.js`
- 12 generated sketches (empty, example, every block, hostile input) **compile for an Arduino Nano**
  with the Arduino IDE's own toolchain.
- Peeko base differs from your `AT.ino` only by the moved serial loop; Chip Bot's Otto code is identical to `chipbot.ino`.
- Typing quotes, backslashes, emoji or `"; system(...)` into the name boxes cannot reach the code.
- Every block of every robot runs in the on-screen preview without errors.
- Peeko leaves about 267 bytes of RAM free (same as the original sketch): the student parts keep their
  words in flash memory, so more blocks do not use more RAM.

**Not tested yet:** any of this on a physical Nano / servos / OLED / sensors.

## Rebuilding
`node build.js` bundles `src/` + `firmware/` into `index.html`. Edit the tested sketches in `firmware/`;
the lines `//@@HEADER@@`, `//@@CONSTANTS@@`, `//@@SETTINGS@@`, `//@@WAKE@@`, `//@@FOREVER@@` are where student parts go.
