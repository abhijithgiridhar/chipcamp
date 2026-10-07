// ============================================================
//  CHIP BOT  —  built by Aarav
//  Robot name: Zippy
//  Made with Camp Blocks · 14 Oct 2026
// ============================================================
/*
  CHIP BOT  —  Arduino Nano + IO shield, Otto-style biped
  --------------------------------------------------------
  Pins (Otto defaults):
    D2 left hip   D3 right hip   D4 left foot   D5 right foot
    D8 ultrasonic TRIG   D9 ultrasonic ECHO   D13 buzzer
  Servo POWER comes from the 4xAA pack on the shield, NOT from USB.

  The walking, turning and dancing code below is the tested Otto code from
  Chip Bot Studio. Only the STUDENT PART sections are different for each student.
*/
#include <Servo.h>
#include <EEPROM.h>
#include <math.h>

const uint8_t PIN_SERVO[4] = {2, 3, 4, 5};   // YL, YR, RL, RR
#define PIN_TRIG 8
#define PIN_ECHO 9
#define PIN_BUZZER 13

Servo servo[4];
bool attached = false;
int8_t trim[4] = {0, 0, 0, 0};
float cur[4] = {90, 90, 90, 90};
uint16_t T_STEP = 1000;                       // gait period in ms (speed block changes it)
bool abortFlag = false;

// ===================== STUDENT PART: NAMES =====================
const char BUILDER_NAME[] = "Aarav";   // who built this robot
const char ROBOT_NAME[]   = "Zippy";   // what this robot is called

// ---------------------------------------------------------------- serial helpers
void pollSerial() {
  while (Serial.available()) {
    if (Serial.read() == '!') abortFlag = true;
  }
}
bool aborted() { pollSerial(); return abortFlag; }

void waitMs(uint16_t ms) {
  unsigned long end = millis() + ms;
  while (millis() < end) { if (aborted()) return; delay(5); }
}

// ---------------------------------------------------------------- servos
void attachServos() {
  if (attached) return;
  for (uint8_t i = 0; i < 4; i++) servo[i].attach(PIN_SERVO[i]);
  attached = true;
}
void detachServos() {
  if (!attached) return;
  for (uint8_t i = 0; i < 4; i++) servo[i].detach();
  attached = false;
}
void writeServo(uint8_t i, float angle) {
  cur[i] = angle;
  int a = (int)(angle + trim[i] + 0.5f);
  servo[i].write(constrain(a, 0, 180));
}

// Smoothly move all 4 servos to target[] over `time` ms (same idea as Otto::_moveServos).
void moveServos(uint16_t time, const int target[4]) {
  attachServos();
  float start[4], inc[4];
  uint16_t n = time / 10; if (n < 1) n = 1;
  for (uint8_t i = 0; i < 4; i++) { start[i] = cur[i]; inc[i] = (target[i] - cur[i]) / (float)n; }
  for (uint16_t k = 1; k <= n; k++) {
    if (aborted()) return;
    for (uint8_t i = 0; i < 4; i++) writeServo(i, start[i] + inc[i] * k);
    delay(10);
  }
  for (uint8_t i = 0; i < 4; i++) writeServo(i, target[i]);
}

// Oscillator gait (same maths as Otto::_execute): angle = 90 + O + A * sin(2*pi*t/T + phase)
void execute(const int A[4], const int O[4], const int phDeg[4], uint8_t steps) {
  attachServos();
  int first[4];
  for (uint8_t i = 0; i < 4; i++) first[i] = 90 + O[i] + (int)(A[i] * sin(phDeg[i] * PI / 180.0));
  moveServos(120, first);                          // avoid a jump at the start
  unsigned long start = millis(), total = (unsigned long)T_STEP * steps, t;
  while ((t = millis() - start) < total) {
    if (aborted()) return;
    for (uint8_t i = 0; i < 4; i++)
      writeServo(i, 90 + O[i] + A[i] * sin(2.0 * PI * t / T_STEP + phDeg[i] * PI / 180.0));
    delay(15);
  }
}

// ---------------------------------------------------------------- Otto moves
void doWalk(uint8_t dir, uint8_t steps) {          // dir 0 fwd, 1 back
  int d = dir ? -1 : 1;
  int A[4] = {30, 30, 20, 20}, O[4] = {0, 0, 4, -4};
  int ph[4] = {0, 0, d * -90, d * -90};
  execute(A, O, ph, steps);
}
void doTurn(uint8_t dir, uint8_t steps) {          // dir 0 left, 1 right
  int A[4] = {30, 30, 20, 20}, O[4] = {0, 0, 4, -4};
  int ph[4] = {0, 0, -90, -90};
  if (dir == 0) { A[0] = 30; A[1] = 10; } else { A[0] = 10; A[1] = 30; }
  execute(A, O, ph, steps);
}

static const int DH = 25;  // Otto "h" for the dance moves
void doDance(uint8_t id, uint8_t reps) {
  attachServos();
  int homes[4] = {90, 90, 90, 90};
  switch (id) {
    case 0: { int A[4] = {0, 0, DH, DH}, O[4] = {0, 0, DH / 2, -DH / 2}, ph[4] = {0, 0, 0, 0}; execute(A, O, ph, reps); break; }   // swing
    case 1: { int A[4] = {0, 0, DH, DH}, O[4] = {0, 0, DH, -DH}, ph[4] = {0, 0, 0, 0}; execute(A, O, ph, reps); break; }             // tiptoe swing
    case 2: { int A[4] = {0, 0, DH, DH}, O[4] = {0, 0, DH, -DH}, ph[4] = {0, 0, -90, 90}; execute(A, O, ph, reps); break; }          // up-down
    case 3: { int A[4] = {25, 25, 0, 0}, O[4] = {0, 0, 0, 0}, ph[4] = {-90, 90, 0, 0}; execute(A, O, ph, reps); break; }         // jitter
    case 4:
    case 5: {                                                                                                                     // moonwalker L / R
      int dir = (id == 4) ? 1 : -1, phi = -dir * 90;
      int A[4] = {0, 0, DH, DH}, O[4] = {0, 0, DH / 2 + 2, -DH / 2 - 2}, ph[4] = {0, 0, phi, -60 * dir + phi};
      execute(A, O, ph, reps); break; }
    case 6: { int A[4] = {12, 12, DH, DH}, O[4] = {0, 0, DH - 10, -DH + 10}, ph[4] = {0, 180, -90, 90}; execute(A, O, ph, reps); break; } // flapping
    case 7:
    case 8: {                                                                                                                     // shake leg R / L
      int s1[4] = {90, 90, 58, 35}, s2[4] = {90, 90, 58, 120}, s3[4] = {90, 90, 58, 60};
      if (id == 8) { s1[2] = 180 - 35; s1[3] = 180 - 58; s2[2] = 180 - 120; s2[3] = 180 - 58; s3[2] = 180 - 60; s3[3] = 180 - 58; }
      for (uint8_t j = 0; j < reps && !aborted(); j++) {
        moveServos(500, s1); moveServos(500, s2);
        for (uint8_t i = 0; i < 2; i++) { moveServos(200, s3); moveServos(200, s2); }
        moveServos(500, homes);
      }
      break; }
    case 9:
    case 10: {                                                                                                                    // bend R / L
      int b1[4] = {90, 90, 62, 35}, b2[4] = {90, 90, 62, 105};
      if (id == 10) { b1[2] = 180 - 35; b1[3] = 180 - 60; b2[2] = 180 - 105; b2[3] = 180 - 60; }
      for (uint8_t i = 0; i < reps && !aborted(); i++) {
        moveServos(400, b1); moveServos(400, b2); waitMs(T_STEP * 8 / 10); moveServos(500, homes);
      }
      break; }
  }
}

void doPose(uint8_t a, uint8_t b, uint8_t c, uint8_t d) {
  int t[4] = {constrain(a, 45, 135), constrain(b, 45, 135), constrain(c, 45, 135), constrain(d, 45, 135)};
  moveServos(400, t);
}
void doRest() { int h[4] = {90, 90, 90, 90}; moveServos(500, h); detachServos(); }
void doBeep(uint8_t f20, uint8_t d10) {
  tone(PIN_BUZZER, (unsigned int)f20 * 20, (unsigned long)d10 * 10);
  waitMs((uint16_t)d10 * 10);
}
void doSpeed(uint8_t level) { T_STEP = (level == 0) ? 1400 : (level == 2) ? 700 : 1000; }
void doWait(uint8_t tenths) { waitMs((uint16_t)tenths * 100); }

// ---------------------------------------------------------------- sensing
uint8_t readDistance() {
  digitalWrite(PIN_TRIG, LOW); delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long us = pulseIn(PIN_ECHO, HIGH, 6000UL);
  if (us == 0) return 50;
  unsigned long cm = us / 58;
  return cm > 50 ? 50 : (uint8_t)cm;
}

// ===================== TESTED HELPERS FOR THE BLOCKS =====================
// Same for every student. Each block in Camp Blocks calls one of these.

// Uses the servo calibration saved by Chip Bot Studio (if any). Never writes anything.
void loadTrims() {
  if (EEPROM.read(0) == 0xC5) {
    for (uint8_t i = 0; i < 4; i++) trim[i] = (int8_t)EEPROM.read(1 + i);
  }
}

void waitSecs(float secs) { waitMs((uint16_t)(secs * 1000.0)); }

void beepNote(unsigned int hz, float secs) {
  tone(PIN_BUZZER, hz, (unsigned long)(secs * 1000.0));
  waitSecs(secs);
}

// ===================== STUDENT PART: WHAT CHIP BOT DOES =====================

// Runs ONCE, when Chip Bot wakes up (when it is powered on).
void studentWake() {
  Serial.print(F("Hi! I'm "));
  Serial.print(ROBOT_NAME);
  Serial.print(F(", built by "));
  Serial.println(BUILDER_NAME);
  for (int i = 0; i < 2; i++) {
    beepNote(523, 0.2);  // high C
    waitSecs(0.1);
  }
}

// Runs again and again, forever.
void studentForever() {
  if (readDistance() < 15) {
    doTurn(0, 3);
    beepNote(392, 0.2);  // G
  } else {
    doWalk(0, 4);
  }
  waitSecs(0.5);
}

// ===================== SETUP / LOOP =====================

void setup() {
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  Serial.begin(9600);
  loadTrims();
  doRest();
  studentWake();
}

void loop() {
  studentForever();
}
