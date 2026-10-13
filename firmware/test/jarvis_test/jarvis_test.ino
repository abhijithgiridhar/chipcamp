/*
  JARVIS - test my robot              Board: Arduino Uno
  Run this after the wiring is done and the Circuit Lab says "complete".
  Open the Serial Monitor (9600 baud). Every part gets a test, one at a time, and the whole round repeats.

    A0 soil sensor      A1 light sensor (LDR with a 10k resistor)
    D9 red, D10 green, D11 blue: the RGB LED (a 220 ohm resistor on each colour, long leg to ground)
    D8 buzzer: long leg (+) to D8, short leg (-) to ground
    OLED screen: SDA to A4, SCL to A5, VCC to 5V, GND to ground (I2C address 0x3C)
  Libraries: Adafruit GFX Library and Adafruit SH110X.
*/
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
Adafruit_SH1106G display(128, 64, &Wire, -1);
const uint8_t PIN_SOIL = A0, PIN_LIGHT = A1, PIN_R = 9, PIN_G = 10, PIN_B = 11, PIN_BUZZER = 8;

void rgb(bool r, bool g, bool b) {
  digitalWrite(PIN_R, r ? HIGH : LOW);
  digitalWrite(PIN_G, g ? HIGH : LOW);
  digitalWrite(PIN_B, b ? HIGH : LOW);
}
void beep(unsigned int hz, unsigned int ms) { tone(PIN_BUZZER, hz, ms); delay(ms + 40); }

// returns the average and how far the readings wandered
int readAvg(uint8_t pin, int &spread) {
  long sum = 0; int lo = 1023, hi = 0;
  for (uint8_t i = 0; i < 12; i++) {
    int v = analogRead(pin);
    sum += v; if (v < lo) lo = v; if (v > hi) hi = v;
    delay(8);
  }
  spread = hi - lo;
  return (int)(sum / 12);
}

void testLed() {
  Serial.println(F("TEST 1 of 5: RGB LED. Watch the colours."));
  Serial.println(F("  RED..."));   rgb(1, 0, 0); delay(1500);
  Serial.println(F("  GREEN...")); rgb(0, 1, 0); delay(1500);
  Serial.println(F("  BLUE..."));  rgb(0, 0, 1); delay(1500);
  Serial.println(F("  WHITE (all three)...")); rgb(1, 1, 1); delay(1500);
  rgb(0, 0, 0);
  Serial.println(F("  Did you see red, green, blue, then white?"));
  Serial.println(F("  One colour missing?  That colour's 220 ohm resistor or wire is the problem."));
  Serial.println(F("  Nothing at all?  The LED's long leg must go to ground."));
  Serial.println(F("  Colours the wrong way round (off when it should be on)?  Tell your facilitator: the LED is common anode."));
}

void testSoil() {
  Serial.println(F("TEST 2 of 5: soil sensor on A0. Hold it in the air, then dip the probe in water."));
  for (uint8_t i = 0; i < 6; i++) {
    int spread; int v = readAvg(PIN_SOIL, spread);
    Serial.print(F("  soil raw ")); Serial.print(v); Serial.println(v > 700 ? F("  (dry)") : v < 400 ? F("  (wet)") : F("  (damp)"));
    delay(900);
  }
  int spread; int v = readAvg(PIN_SOIL, spread);
  if (v <= 3 || v >= 1020) Serial.println(F("[CHECK] Soil sensor: stuck at the very top or bottom. Check the signal wire on A0, and the 5V and GND wires."));
  else Serial.println(F("[PASS] Soil sensor gives a reading. The number should DROP when you dip it in water."));
}

void testLight() {
  Serial.println(F("TEST 3 of 5: light sensor on A1. Cover it with your hand, then uncover it."));
  for (uint8_t i = 0; i < 6; i++) {
    int spread; int v = readAvg(PIN_LIGHT, spread);
    Serial.print(F("  light raw ")); Serial.println(v);
    delay(900);
  }
  int spread; int v = readAvg(PIN_LIGHT, spread);
  if (v <= 3 || v >= 1020) Serial.println(F("[CHECK] Light sensor: stuck at the very top or bottom. The LDR goes between 5V and A1, and the 10k resistor between A1 and ground."));
  else if (spread > 120) Serial.println(F("[CHECK] Light sensor: readings are jumping around. A1 is probably not joined to the LDR and the 10k resistor."));
  else Serial.println(F("[PASS] Light sensor gives a steady reading. The number should change when you cover it."));
}

void testBuzzer() {
  Serial.println(F("TEST 4 of 5: buzzer on D8"));
  digitalWrite(PIN_BUZZER, HIGH); delay(400); digitalWrite(PIN_BUZZER, LOW); delay(250);
  beep(440, 300); beep(880, 300);
  Serial.println(F("  Did you hear 3 beeps?  (the Arduino cannot hear, so you decide)"));
  Serial.println(F("  Silent?  Flip the two legs: the long leg (+) goes to D8."));
  Serial.println(F("  All beeps the same pitch?  Your buzzer is the always-beep type. That is fine."));
}

void testScreen() {
  Serial.println(F("TEST 5 of 5: OLED screen. It should show the soil and light numbers."));
  if (!display.begin(0x3C, true)) {
    Serial.println(F("[CHECK] OLED screen not found. Check SDA on A4, SCL on A5, VCC on 5V and GND on ground."));
    return;
  }
  display.setTextColor(SH110X_WHITE);
  for (uint8_t i = 0; i < 6; i++) {
    int spread; int soil = readAvg(PIN_SOIL, spread); int light = readAvg(PIN_LIGHT, spread);
    display.clearDisplay();
    display.setTextSize(1); display.setCursor(0, 0);  display.print(F("SOIL  raw ")); display.print(soil);
    display.setTextSize(2); display.setCursor(0, 12); display.print(map(soil, 1023, 0, 0, 100)); display.print(F("%"));
    display.setTextSize(1); display.setCursor(0, 36); display.print(F("LIGHT raw ")); display.print(light);
    display.setTextSize(2); display.setCursor(0, 48); display.print(map(light, 0, 1023, 0, 100)); display.print(F("%"));
    display.display();
    delay(800);
  }
  Serial.println(F("[PASS] OLED screen found. Did the numbers on it change when you dipped the soil probe or covered the light sensor?"));
}

void setup() {
  Serial.begin(9600);
  pinMode(PIN_R, OUTPUT); pinMode(PIN_G, OUTPUT); pinMode(PIN_B, OUTPUT); pinMode(PIN_BUZZER, OUTPUT);
  rgb(0, 0, 0);
  delay(500);
  Serial.println(F("=== Jarvis test ==="));
}

void loop() {
  testLed();    delay(800);
  testSoil();   delay(800);
  testLight();  delay(800);
  testBuzzer(); delay(800);
  testScreen(); delay(800);
  Serial.println(F("--- round finished. Starting again in 4 seconds ---"));
  delay(4000);
}
