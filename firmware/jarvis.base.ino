//@@HEADER@@
/*
  JARVIS  —  terrarium buddy, Arduino Nano + IO shield
  ----------------------------------------------------
    A0  soil moisture sensor
    A1  light sensor (LDR with a 10k resistor)
    D9 / D10 / D11  RGB LED  (red / green / blue)
    D8  buzzer

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
int soilPercent() {
  long pct = map(readAverage(PIN_SOIL), SOIL_DRY, SOIL_WET, 0, 100);
  return (int)constrain(pct, 0, 100);
}

// 0 = dark, 100 = very bright
int lightPercent() {
  long pct = map(readAverage(PIN_LIGHT), 0, 1023, 0, 100);
  if (!LIGHT_BRIGHT_IS_HIGH) pct = 100 - pct;
  return (int)constrain(pct, 0, 100);
}

// r, g, b are 1 (on) or 0 (off)
void setColor(int r, int g, int b) {
  if (LED_COMMON_ANODE) { r = 1 - r; g = 1 - g; b = 1 - b; }
  digitalWrite(PIN_LED_R, r ? HIGH : LOW);
  digitalWrite(PIN_LED_G, g ? HIGH : LOW);
  digitalWrite(PIN_LED_B, b ? HIGH : LOW);
}

void waitSecs(float secs) {
  delay((unsigned long)(secs * 1000.0));
}

void playNote(unsigned int hz, float secs) {
  unsigned long ms = (unsigned long)(secs * 1000.0);
  tone(PIN_BUZZER, hz, ms);
  delay(ms + 20);
  noTone(PIN_BUZZER);
}

void printSensors() {
  Serial.print(F("Soil: "));
  Serial.print(soilPercent());
  Serial.print(F("% (raw "));
  Serial.print(readAverage(PIN_SOIL));
  Serial.print(F(")   Light: "));
  Serial.print(lightPercent());
  Serial.print(F("% (raw "));
  Serial.print(readAverage(PIN_LIGHT));
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
  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_B, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  setColor(0, 0, 0);
  studentWake();
}

void loop() {
  studentForever();
}
