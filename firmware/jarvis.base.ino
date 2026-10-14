//@@HEADER@@
/*
  JARVIS - terrarium buddy, Arduino Uno
  ----------------------------------------------------
    A0  soil moisture sensor
    A1  light sensor (LDR with a 10k resistor)
    D9 / D10 / D11  RGB LED  (red / green / blue)
    D8  buzzer
    A4  OLED screen SDA        A5  OLED screen SCL     (VCC to 5V, GND to ground)

  The OLED screen shows the exact soil and light readings all the time, even while a "wait" block is running.
  The LED only uses ON / OFF (no PWM), so the buzzer's tone() and the LED
  can never fight over the same timer.
  Only the STUDENT PART sections are different for each student.
*/

#define PIN_SOIL   A0
#define PIN_LIGHT  A1
#define PIN_LED_R  9
#define PIN_LED_G  10
#define PIN_LED_B  11
#define PIN_BUZZER 8

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
Adafruit_SH1106G display(128, 64, &Wire, -1);
bool screenOk = false;

//@@KEEP+
// ===================== STUDENT PART: NAMES =====================
//@@CONSTANTS@@
//@@KEEP-

// ===================== BENCH SETTINGS (set once by the facilitator) =====================
//@@SETTINGS@@

// ===================== TESTED HELPERS FOR THE BLOCKS =====================
// Same for every student. Each block in Camp Blocks calls one of these.

// Average a few readings so the numbers do not jump around.
int readAverage(int pin) {
  long total = 0;
  for (int i = 0; i < 8; i++) {
    total += analogRead(pin);
    delay(2);
  }
  return (int)(total / 8);
}

// 0 = bone dry, 100 = soaking wet
int soilFromRaw(int raw) {
  if (SOIL_DRY == SOIL_WET) return 0;           // a bench setting mistake must not divide by zero
  long pct = map(raw, SOIL_DRY, SOIL_WET, 0, 100);
  return (int)constrain(pct, 0, 100);
}
int soilPercent() { return soilFromRaw(readAverage(PIN_SOIL)); }

// 0 = dark, 100 = very bright
int lightFromRaw(int raw) {
  long pct = map(raw, 0, 1023, 0, 100);
  if (!LIGHT_BRIGHT_IS_HIGH) pct = 100 - pct;
  return (int)constrain(pct, 0, 100);
}
int lightPercent() { return lightFromRaw(readAverage(PIN_LIGHT)); }

// r, g, b are 1 (on) or 0 (off)
void setColor(int r, int g, int b) {
  if (LED_COMMON_ANODE) { r = 1 - r; g = 1 - g; b = 1 - b; }
  digitalWrite(PIN_LED_R, r ? HIGH : LOW);
  digitalWrite(PIN_LED_G, g ? HIGH : LOW);
  digitalWrite(PIN_LED_B, b ? HIGH : LOW);
}

// The OLED screen: the exact soil and light readings, with a bar under each one.
void drawReading(int y, const char* label, int pct, int raw) {
  display.setTextSize(1);
  display.setCursor(0, y);
  display.print(label);
  display.setCursor(74, y);
  display.print(F("raw "));
  display.print(raw);
  display.setTextSize(2);
  display.setCursor(0, y + 10);
  display.print(pct);
  display.print(F("%"));
  display.drawRect(0, y + 27, 128, 4, SH110X_WHITE);
  display.fillRect(0, y + 27, (int)(1.28 * pct), 4, SH110X_WHITE);
}

unsigned long lastScreen = 0;
void updateScreen() {
  if (!screenOk) return;
  lastScreen = millis();
  int soilRaw = readAverage(PIN_SOIL), lightRaw = readAverage(PIN_LIGHT);
  display.clearDisplay();
  drawReading(0, "SOIL", soilFromRaw(soilRaw), soilRaw);       // the number and the percentage come from the same reading
  drawReading(33, "LIGHT", lightFromRaw(lightRaw), lightRaw);
  display.display();
}

// Waits, but keeps the screen fresh (twice a second) while it waits. Short waits are not slowed down.
void waitSecs(float secs) {
  unsigned long end = millis() + (unsigned long)(secs * 1000.0);
  while ((long)(end - millis()) > 0) {
    if (millis() - lastScreen >= 500UL) updateScreen();
    delay(20);
  }
}

void playNote(unsigned int hz, float secs) {
  unsigned long ms = (unsigned long)(secs * 1000.0);
  tone(PIN_BUZZER, hz, ms);
  delay(ms + 20);
  noTone(PIN_BUZZER);
}

void printSensors() {
  int soilRaw = readAverage(PIN_SOIL), lightRaw = readAverage(PIN_LIGHT);
  Serial.print(F("Soil: "));
  Serial.print(soilFromRaw(soilRaw));
  Serial.print(F("% (raw "));
  Serial.print(soilRaw);
  Serial.print(F(")   Light: "));
  Serial.print(lightFromRaw(lightRaw));
  Serial.print(F("% (raw "));
  Serial.print(lightRaw);
  Serial.println(F(")"));
}

//@@KEEP+
// ===================== STUDENT PART: WHAT JARVIS DOES =====================

// Runs ONCE, when Jarvis wakes up (when it is powered on).
void studentWake() {
//@@WAKE@@
}

// Runs again and again, forever.
void studentForever() {
//@@FOREVER@@
}
//@@KEEP-

// ===================== SETUP / LOOP =====================

void setup() {
  Serial.begin(9600);
  screenOk = display.begin(0x3C, true);
  if (screenOk) Wire.setClock(400000);          // faster screen updates
  if (!screenOk) Serial.println(F("No screen found. Check the 4 OLED wires (SDA to A4, SCL to A5). The robot still works."));
  display.setTextColor(SH110X_WHITE);
  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_B, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  setColor(0, 0, 0);
  studentWake();
}

void loop() {
  studentForever();
  if (millis() - lastScreen >= 500UL) updateScreen();
}
