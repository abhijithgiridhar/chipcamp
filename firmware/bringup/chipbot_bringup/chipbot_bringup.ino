/*
  CHIP BOT  -  bring-up test         Board: Arduino Nano (ATmega328P)
  Flash this on every Chip Bot board BEFORE camp, so day-1 students see their robot come alive
  the moment a leg servo is plugged in. No laptop is needed in the room: any USB charger works.

  Pins (same as the real Chip Bot firmware):
    D2 left hip   D3 right hip   D4 left foot   D5 right foot      (servos, 3-pin plugs on the shield)
    D8 ultrasonic TRIG   D9 ultrasonic ECHO   D13 buzzer (bonus)

  What it does:
    0. After power-up it holds every servo at 90 degrees for 20 seconds (beeping every 5 s) so servo
       horns can be fitted straight. The reset button starts another 20 seconds.
  Then, forever:
    1. Stands every servo at 90 degrees ("stand tall").
    2. Wiggles ONE servo at a time (hips, then feet). A servo that isn't plugged in just does nothing.
    3. Listens with the distance sensor. Something closer than 15 cm = two beeps and the legs stay still.
  Servos move one at a time and are switched on with gaps, so a laptop USB port or a phone
  charger is not overloaded.
*/
#include <Servo.h>

const uint8_t SERVO_PIN[4] = {2, 3, 4, 5};
const uint8_t PIN_TRIG = 8, PIN_ECHO = 9, PIN_BUZZER = 13;
const int STAND = 90, WIGGLE = 20, CLOSE_CM = 15;
const uint8_t CENTRE_SECS = 20;   // how long the servos hold still at power-up
Servo servo[4];

long readCm() {
  digitalWrite(PIN_TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long us = pulseIn(PIN_ECHO, HIGH, 25000UL);   // 25 ms = about 4 m
  if (us == 0) return 400;                                // nothing heard back: far away
  return (long)(us / 58UL);
}

void beep(int hz, int ms) { tone(PIN_BUZZER, hz, ms); delay(ms + 30); }

void wiggle(uint8_t i) {
  servo[i].write(STAND + WIGGLE); delay(350);
  servo[i].write(STAND - WIGGLE); delay(350);
  servo[i].write(STAND);          delay(300);
}

void setup() {
  Serial.begin(9600);
  pinMode(PIN_TRIG, OUTPUT); pinMode(PIN_ECHO, INPUT); pinMode(PIN_BUZZER, OUTPUT);
  Serial.println(F("Chip Bot bring-up test"));
  for (uint8_t i = 0; i < 4; i++) {            // switch servos on one by one
    servo[i].attach(SERVO_PIN[i]);
    servo[i].write(STAND);
    delay(300);
  }
  beep(523, 120); beep(659, 120); beep(784, 200);   // "I am alive"
  // Centring window: every servo holds at 90 degrees, so a servo horn can be fitted straight.
  // Press the board's reset button to get another window.
  Serial.println(F("Holding all servos at 90 degrees: fit the horns now"));
  for (uint8_t s = 0; s < CENTRE_SECS; s++) {
    if (s % 5 == 0) beep(440, 60);
    delay(940);
  }
  Serial.println(F("Done centring: now wiggling"));
}

void loop() {
  for (uint8_t i = 0; i < 4; i++) {
    long cm = readCm();
    Serial.print(F("distance ")); Serial.print(cm); Serial.println(F(" cm"));
    if (cm < CLOSE_CM) {                        // too close: stand still and beep twice
      beep(880, 100); beep(880, 100);
      delay(600);
      continue;
    }
    Serial.print(F("wiggle servo D")); Serial.println(SERVO_PIN[i]);
    wiggle(i);
  }
}
