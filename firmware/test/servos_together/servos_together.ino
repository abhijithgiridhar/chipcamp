/*
  ALL FOUR SERVOS TOGETHER                Board: Arduino Nano
  D2 left hip   D3 right hip   D4 left foot   D5 right foot
  Run this from a phone charger or power bank (1 A or more), not the laptop.
  The Serial Monitor (9600 baud) says what it is about to do.
  If the board restarts, press stop: unplug and go back to one servo at a time.
*/
#include <Servo.h>

const uint8_t SERVO_PIN[4] = {2, 3, 4, 5};
const int SWING = 25;              // degrees each side of the middle
Servo servo[4];

void allTo(int angle) {
  for (uint8_t i = 0; i < 4; i++) servo[i].write(angle);
}

void setup() {
  Serial.begin(9600);
  Serial.println(F("=== All four servos together ==="));
  Serial.println(F("Starting in 3 seconds. Hold the robot in your hand."));
  delay(3000);
  for (uint8_t i = 0; i < 4; i++) {
    servo[i].attach(SERVO_PIN[i]);
    delay(250);                    // switch them on one by one so the power does not dip
  }
  allTo(90);
  Serial.println(F("Middle position. All four should be still."));
  delay(1500);
}

void loop() {
  Serial.println(F("all four: swing one way"));
  allTo(90 - SWING);
  delay(800);
  Serial.println(F("all four: swing the other way"));
  allTo(90 + SWING);
  delay(800);
  Serial.println(F("all four: back to the middle"));
  allTo(90);
  delay(1500);
}
