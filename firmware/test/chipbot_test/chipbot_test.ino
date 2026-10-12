/*
  CHIP BOT - test my robot            Board: Arduino Nano
  Run this after the wiring is done and the Circuit Lab says "complete".
  Open the Serial Monitor (9600 baud). Every part gets a test, one at a time, and the whole round repeats.

    D2 left hip    D3 right hip    D4 left foot    D5 right foot     (servos)
    D8 TRIG        D9 ECHO                                          (distance sensor)
    D13 buzzer: long leg (+) to D13, short leg (-) to ground
*/
#include <Servo.h>

const uint8_t SERVO_PIN[4] = {2, 3, 4, 5};
const char* const SERVO_NAME[4] = {"left hip (D2)", "right hip (D3)", "left foot (D4)", "right foot (D5)"};
const uint8_t PIN_TRIG = 8, PIN_ECHO = 9, PIN_BUZZER = 13;
Servo servo[4];

long readCm() {
  digitalWrite(PIN_TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long us = pulseIn(PIN_ECHO, HIGH, 25000UL);
  if (us == 0) return -1;                       // no echo came back
  return (long)(us / 58UL);
}

void beep(unsigned int hz, unsigned int ms) { tone(PIN_BUZZER, hz, ms); delay(ms + 40); }

void testBuzzer() {
  Serial.println(F("TEST 1 of 3: buzzer on D13"));
  digitalWrite(PIN_BUZZER, HIGH); delay(400); digitalWrite(PIN_BUZZER, LOW); delay(250);   // plain on / off
  beep(440, 300); beep(880, 300);                                                          // two different pitches
  Serial.println(F("  Did you hear 3 beeps?  (the Arduino cannot hear, so you decide)"));
  Serial.println(F("  Silent?  Flip the two legs: the long leg (+) goes to D13."));
  Serial.println(F("  All beeps the same pitch?  Your buzzer is the always-beep type. That is fine."));
}

void testServos() {
  Serial.println(F("TEST 2 of 3: the four servos, one at a time"));
  for (uint8_t i = 0; i < 4; i++) {
    Serial.print(F("  moving the ")); Serial.println(SERVO_NAME[i]);
    servo[i].attach(SERVO_PIN[i]);
    servo[i].write(90);  delay(400);
    servo[i].write(65);  delay(500);
    servo[i].write(115); delay(500);
    servo[i].write(90);  delay(400);
    servo[i].detach();
    delay(300);
  }
  Serial.println(F("  Did every servo move, one after the other?"));
  Serial.println(F("  One did nothing?  Check its plug: yellow wire on the S pin."));
}

void testDistance() {
  Serial.println(F("TEST 3 of 3: distance sensor. Wave your hand about 10 cm in front of it."));
  int heard = 0, close = 0;
  for (uint8_t i = 0; i < 20; i++) {
    long cm = readCm();
    if (cm < 0) {
      Serial.println(F("  no echo"));
    } else {
      heard++;
      Serial.print(F("  distance ")); Serial.print(cm); Serial.println(F(" cm"));
      if (cm < 15) { close++; beep(988, 80); }
    }
    delay(250);
  }
  if (heard == 0) Serial.println(F("[CHECK] Distance sensor: never heard an echo. Check VCC, GND, TRIG (D8) and ECHO (D9)."));
  else if (close == 0) Serial.println(F("[PASS] Distance sensor works. Wave a hand closer than 15 cm to hear it beep."));
  else Serial.println(F("[PASS] Distance sensor works and saw your hand."));
}

void setup() {
  Serial.begin(9600);
  pinMode(PIN_TRIG, OUTPUT); pinMode(PIN_ECHO, INPUT); pinMode(PIN_BUZZER, OUTPUT);
  delay(500);
  Serial.println(F("=== Chip Bot test ==="));
}

void loop() {
  testBuzzer();   delay(800);
  testServos();   delay(800);
  testDistance(); delay(800);
  Serial.println(F("--- round finished. Starting again in 4 seconds ---"));
  delay(4000);
}
