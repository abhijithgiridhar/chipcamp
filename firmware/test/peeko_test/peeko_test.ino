/*
  PEEKO - test my robot               Board: Arduino Uno
  Run this after the wiring is done and the Circuit Lab says "complete".
  Open the Serial Monitor (9600 baud). Every part gets a test, one at a time, and the whole round repeats.
  Libraries: Adafruit GFX Library and Adafruit SH110X.

    OLED screen: SDA to A4, SCL to A5, VCC to 5V, GND to ground (I2C address 0x3C)
    Head servo: signal to D9
    Buzzer on D8: long leg (+) to D8, short leg (-) to ground
*/
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <Servo.h>

Adafruit_SH1106G display(128, 64, &Wire, -1);
Servo headServo;
const uint8_t PIN_HEAD = 9, PIN_BUZZER = 8;
bool screenOk = false;

void beep(unsigned int hz, unsigned int ms) { tone(PIN_BUZZER, hz, ms); delay(ms + 40); }

void showText(const __FlashStringHelper* line1, const __FlashStringHelper* line2) {
  if (!screenOk) return;
  display.clearDisplay();
  display.setTextColor(SH110X_WHITE);
  display.setTextSize(2); display.setCursor(4, 8);  display.print(line1);
  display.setTextSize(1); display.setCursor(4, 40); display.print(line2);
  display.display();
}

void testScreen() {
  Serial.println(F("TEST 1 of 3: OLED screen"));
  Wire.beginTransmission(0x3C);
  bool found = (Wire.endTransmission() == 0);          // does anything answer at the screen's address?
  if (!found) {
    screenOk = false;
    Serial.println(F("[CHECK] OLED: nothing answered. Check SDA (A4), SCL (A5), VCC (5V) and GND."));
    Serial.println(F("        Swapped SDA and SCL is the most common mistake."));
    return;
  }
  if (!screenOk) { display.begin(0x3C, true); screenOk = true; }
  Serial.println(F("[PASS] OLED answered. Look at the screen: it should say HELLO and show two eyes."));
  display.clearDisplay();
  display.setTextColor(SH110X_WHITE); display.setTextSize(2); display.setCursor(30, 4); display.print(F("HELLO"));
  display.fillCircle(40, 40, 10, SH110X_WHITE); display.fillCircle(88, 40, 10, SH110X_WHITE);
  display.display();
  delay(2500);
}

void testHead() {
  Serial.println(F("TEST 2 of 3: head servo on D9"));
  showText(F("HEAD"), F("watch it turn"));
  headServo.attach(PIN_HEAD);
  headServo.write(90);  delay(500);
  headServo.write(50);  delay(700);
  headServo.write(130); delay(900);
  headServo.write(90);  delay(500);
  headServo.detach();
  Serial.println(F("  Did the head turn left, then right, then back to the middle?"));
  Serial.println(F("  Nothing?  Check the servo plug (signal on D9, power on 5V, ground on GND)."));
}

void testBuzzer() {
  Serial.println(F("TEST 3 of 3: buzzer on D8"));
  showText(F("BEEP"), F("listen"));
  digitalWrite(PIN_BUZZER, HIGH); delay(400); digitalWrite(PIN_BUZZER, LOW); delay(250);
  beep(440, 300); beep(880, 300);
  Serial.println(F("  Did you hear 3 beeps?  (the Arduino cannot hear, so you decide)"));
  Serial.println(F("  Silent?  Flip the two legs: the long leg (+) goes to D8."));
  Serial.println(F("  All beeps the same pitch?  Your buzzer is the always-beep type. That is fine."));
}

void setup() {
  Serial.begin(9600);
  pinMode(PIN_BUZZER, OUTPUT);
  Wire.begin();
  delay(500);
  Serial.println(F("=== Peeko test ==="));
}

void loop() {
  testScreen(); delay(800);
  testHead();   delay(800);
  testBuzzer(); delay(800);
  showText(F("DONE"), F("again soon"));
  Serial.println(F("--- round finished. Starting again in 4 seconds ---"));
  delay(4000);
}
