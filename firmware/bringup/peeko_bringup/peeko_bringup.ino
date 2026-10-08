/*
  PEEKO  -  bring-up test            Board: Arduino Uno
  Flash this on every Peeko board BEFORE camp, so day-1 students see their robot come alive
  as soon as the screen and the servo are wired. No laptop is needed in the room: any USB charger works.

  Pins (same as the real Peeko sketch):
    OLED (SH1106, I2C address 0x3C)   SDA = A4   SCL = A5   VCC = 5V   GND
    Head servo signal D9              Buzzer D8 (bonus)
  Libraries: Adafruit GFX Library and Adafruit SH110X.

  What it does, forever: draws two eyes, blinks, then a happy face, and the head looks left, right and back to centre.
  If no screen is found it keeps the head moving and says so on the Serial Monitor (9600).
*/
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <Servo.h>

Adafruit_SH1106G display(128, 64, &Wire, -1);
Servo headServo;
const uint8_t PIN_HEAD = 9, PIN_BUZZER = 8;
bool screenOk = false;

void eyes(int r) {
  display.clearDisplay();
  display.fillCircle(40, 28, r, SH110X_WHITE);
  display.fillCircle(88, 28, r, SH110X_WHITE);
  display.display();
}
void blinkEyes() {
  display.clearDisplay();
  display.fillRect(31, 26, 18, 4, SH110X_WHITE);
  display.fillRect(79, 26, 18, 4, SH110X_WHITE);
  display.display();
}
void happyFace() {
  display.clearDisplay();
  for (int s = 0; s < 2; s++) {
    int cx = s ? 88 : 40;
    display.drawLine(cx - 9, 33, cx, 23, SH110X_WHITE);
    display.drawLine(cx, 23, cx + 9, 33, SH110X_WHITE);
  }
  for (int x = 44; x <= 84; x += 2) {
    int y = 44 + ((x - 64) * (x - 64)) / 55;
    display.drawPixel(x, y, SH110X_WHITE);
    display.drawPixel(x, y + 1, SH110X_WHITE);
  }
  display.display();
}
void say(const __FlashStringHelper *msg) { Serial.println(msg); }

void setup() {
  Serial.begin(9600);
  pinMode(PIN_BUZZER, OUTPUT);
  say(F("Peeko bring-up test"));
  Wire.begin();
  Wire.beginTransmission(0x3C);
  screenOk = (Wire.endTransmission() == 0);
  if (screenOk) { display.begin(0x3C, true); eyes(9); } else say(F("No screen found at 0x3C: check SDA (A4), SCL (A5), 5V and GND"));
  headServo.attach(PIN_HEAD);
  headServo.write(90);
  tone(PIN_BUZZER, 784, 150); delay(250);
}

void loop() {
  if (screenOk) { eyes(9); }
  delay(1200);
  if (screenOk) { blinkEyes(); }
  delay(150);
  if (screenOk) { eyes(9); }
  headServo.write(50);  delay(500);   // look left
  headServo.write(130); delay(800);   // look right
  headServo.write(90);  delay(400);   // back to centre
  if (screenOk) { happyFace(); }
  tone(PIN_BUZZER, 659, 120); delay(160);
  tone(PIN_BUZZER, 880, 180); delay(1500);
}
