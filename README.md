# Micron Chip Camp

Teaching tools for the CHIP Camp at SPV Delhi (13 and 14 October), run with Lend A Hand India. Students build one of three robots: Chip Bot, Peeko or Jarvis. Open `index.html` in Chrome or Edge. Nothing to install.

## Pages

| Page | What it does |
|---|---|
| `index.html` | Welcome screen. Name and robot are remembered by every other page. |
| `logic.html` | The CHIP Challenge. 10 levels on sequences, loops, if and else, and debugging, with a skin for each robot. |
| `circuits.html` | Circuit Lab. Drag the kit parts together, plug servos into the shield, wire sensors, and get a checklist that says what is wrong. |
| `studio.html` | Face Studio (Peeko), Dance Studio (Chip Bot), Light Studio (Jarvis). Design what the robot does and send it to the Code Builder. |
| `blocks.html` | Code Builder. Build the logic with blocks and copy the Arduino sketch. |
| `brain.html` | Peeko's Brain. Load a Teachable Machine model and Peeko reacts to the camera. Needs the internet and Chrome or Edge. |
| `plans.html` | Facilitator area, behind a password. |

## Boards

Every robot runs from the laptop's USB cable. No batteries.

- Chip Bot: Arduino Nano on an IO sensor shield. Servos on D2 to D5, HC-SR04 on D8 and D9, buzzer on D13. Board in the IDE: Nano. If the upload fails, Processor: ATmega328P (Old Bootloader).
- Peeko: Arduino Uno. OLED on A4 and A5, head servo on D9, buzzer on D8.
- Jarvis: Arduino Uno and a breadboard. Soil on A0, LDR on A1, RGB LED on D9, D10 and D11, buzzer on D8.

## How the generated code works

The Code Builder does not write sketches from scratch. Each robot has a base sketch in `firmware/` and the builder only fills in the marked student parts: names, times, thresholds, faces, notes. Every value is bounded (numbers clamped, text limited to letters and digits, choices from fixed lists).

- Peeko is built on the sketch that was bench-tested on the real robot. The only change is that the serial reading loop moved into `pollSerial()`.
- Chip Bot uses the Otto walk, turn and dance code from `chipbot/firmware/chipbot/chipbot.ino` as it is.
- Jarvis is new and has not been tested on the bench yet. The soil and light numbers are set in the bench settings of the Code Builder.

`bench-test/` has one finished example sketch per robot to try on real hardware before the camp.

## Tests

`node tests/run_all.js` runs everything. The sketch compile needs the Arduino IDE app and the sketch libraries on the machine. On another machine run it with `--no-compile`.

- `run_tests.js`: generated sketches for every robot, including hostile input, compiled for the right board.
- `logic_tests.js`: every CHIP Challenge level is solvable within its block limit.
- `lab_tests.js`: the Circuit Lab checker accepts the finished circuit and catches broken ones.
- `studio_tests.js`: every Studio design turns into valid blocks and a sketch that compiles.
- `brain_tests.js`: when Peeko's Brain sends a command and when it doesn't.

Not tested yet: any of this on real boards, servos, the OLED or sensors, on a touch screen, or with a real webcam and Teachable Machine model.

## Rebuilding

`node build.js` bundles `src/` and `firmware/` into the HTML files. The logos in `assets/` are cut from the sticker artwork.

The session plan lives in `session-plan/`, which is not in this repo. `build.js` encrypts it into `plans.html`. The password comes from the `PLANS_PIN` environment variable or a local `.plans-pin` file.
