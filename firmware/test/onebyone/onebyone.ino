/*
  CHIP BOT, one servo at a time          Board: Arduino Nano + Nano shield
  D2 left hip   D3 right hip   D4 left foot   D5 right foot   D13 buzzer
  Only ONE servo moves at any moment, and slowly, so the power from USB is enough.
  Hold the robot in your hand for the first run.
  If a leg moves the wrong way, change its DIR from 1 to -1.
*/
#include <Servo.h>

const uint8_t PIN[4] = {2, 3, 4, 5};          // 0 left hip, 1 right hip, 2 left foot, 3 right foot
const int DIR[4]     = {1, 1, 1, 1};          // flip to -1 if that servo goes the wrong way
const int BUZZER = 13;
Servo servo[4];
int pos[4] = {90, 90, 90, 90};

void glide(uint8_t i, int target) {            // moves ONE servo, one degree at a time
  while (pos[i] != target) {
    pos[i] += (target > pos[i]) ? 1 : -1;
    servo[i].write(pos[i]);
    delay(12);
  }
}

void offset(uint8_t i, int degrees) {          // go to the middle plus an offset
  glide(i, 90 + DIR[i] * degrees);
}

void setup() {
  pinMode(BUZZER, OUTPUT);
  Serial.begin(9600);
  Serial.println(F("=== Chip Bot, one servo at a time ==="));
  tone(BUZZER, 1000, 100);
  delay(2000);
  for (uint8_t i = 0; i < 4; i++) {            // switch on one at a time, 0.5 s apart
    servo[i].write(90);
    servo[i].attach(PIN[i]);
    delay(500);
  }
  tone(BUZZER, 1500, 100);
  delay(1000);
}

void loop() {
  // lean on the right foot, swing the left leg forward
  offset(2, 20);  offset(3, 20);
  offset(0, 25);
  // lean on the left foot, swing the right leg forward
  offset(2, -20); offset(3, -20);
  offset(1, -25);
  // lean back, bring both legs to the middle
  offset(2, 20);  offset(3, 20);
  offset(0, 0);
  offset(2, 0);   offset(3, 0);
  offset(1, 0);
  delay(1000);
}
