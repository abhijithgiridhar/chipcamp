// ============================================================
//  PEEKO  —  built by Aarav
//  Robot name: Zippy
//  Made with Camp Blocks · 14 Oct 2026
// ============================================================
/*
  PEEKO — final action layer (v2: distinct, animated faces)
  ---------------------------------------------------------
  Same command protocol as before — send one of:
  happy / sad / surprised / angry / sleepy / left / right / neutral / celebrate
  followed by a newline, over Serial.

  What changed: each face is now its own shape (not just a bigger/
  smaller circle), and each one plays out as a short animation —
  a few frames drawn in sequence — instead of one static image.
*/

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <Servo.h>

Adafruit_SH1106G display(128, 64, &Wire, -1);
Servo headServo;

const int buzzerPin = 8;
const int HEAD_CENTER = 90;
const int HEAD_LEFT   = 50;
const int HEAD_RIGHT  = 130;

unsigned long lastBlinkTime = 0;
unsigned long blinkInterval = 4000;
bool isPlayingAction = false;
String inputLine = "";

// ===================== STUDENT PART: NAMES =====================
// PROGMEM keeps these words in flash memory, so they do not use up RAM.
const char BUILDER_NAME[] PROGMEM = "Aarav";   // who built this robot
const char ROBOT_NAME[]   PROGMEM = "Zippy";   // what this robot is called

// ===================== DRAWING HELPERS =====================
// Small reusable pieces — an eye shape, a mouth curve — built once,
// then combined differently for each expression.

void drawRoundEye(int cx, int cy, int r) {
  display.fillCircle(cx, cy, r, SH110X_WHITE);
}

void drawHappyEye(int cx, int cy) {
  // upward-curving "^" eye, drawn as two thickened diagonal lines
  display.drawLine(cx - 9, cy + 5, cx, cy - 5, SH110X_WHITE);
  display.drawLine(cx - 9, cy + 6, cx, cy - 4, SH110X_WHITE);
  display.drawLine(cx, cy - 5, cx + 9, cy + 5, SH110X_WHITE);
  display.drawLine(cx, cy - 4, cx + 9, cy + 6, SH110X_WHITE);
}

void drawSadEye(int cx, int cy) {
  // downward-drooping eye, opposite curve of the happy eye
  display.drawLine(cx - 9, cy - 3, cx, cy + 6, SH110X_WHITE);
  display.drawLine(cx - 9, cy - 2, cx, cy + 7, SH110X_WHITE);
  display.drawLine(cx, cy + 6, cx + 9, cy - 3, SH110X_WHITE);
  display.drawLine(cx, cy + 7, cx + 9, cy - 2, SH110X_WHITE);
}

void drawAngryEye(int cx, int cy) {
  // narrow eye + angled eyebrow above it
  display.fillRoundRect(cx - 8, cy - 2, 16, 6, 2, SH110X_WHITE);
  if (cx < 64) display.drawLine(cx - 9, cy - 12, cx + 9, cy - 6, SH110X_WHITE);
  else         display.drawLine(cx + 9, cy - 12, cx - 9, cy - 6, SH110X_WHITE);
}

void drawSmile(int yBase, int width) {
  for (int x = 64 - width; x <= 64 + width; x += 2) {
    int y = yBase + ((x - 64) * (x - 64)) / 55;
    display.drawPixel(x, y, SH110X_WHITE);
    display.drawPixel(x, y + 1, SH110X_WHITE);
  }
}

void drawFrown(int yBase, int width) {
  for (int x = 64 - width; x <= 64 + width; x += 2) {
    int y = yBase - ((x - 64) * (x - 64)) / 55;
    display.drawPixel(x, y, SH110X_WHITE);
    display.drawPixel(x, y + 1, SH110X_WHITE);
  }
}

void drawTear(int cx, int cy) {
  display.fillCircle(cx, cy, 3, SH110X_WHITE);
}

void drawOMouth(int cx, int cy, int r) {
  display.drawCircle(cx, cy, r, SH110X_WHITE);
  display.drawCircle(cx, cy, r - 1, SH110X_WHITE);
}

// ===================== FACES (each one is a short animation) =====================

void faceNeutral() {
  display.clearDisplay();
  drawRoundEye(40, 28, 9);
  drawRoundEye(88, 28, 9);
  display.display();
}

void faceClosed() {
  display.clearDisplay();
  display.fillRect(31, 26, 18, 4, SH110X_WHITE);
  display.fillRect(79, 26, 18, 4, SH110X_WHITE);
  display.display();
}

void faceHappy() {
  // Frame 1: eyes still round, no mouth yet
  display.clearDisplay();
  drawRoundEye(40, 28, 9);
  drawRoundEye(88, 28, 9);
  display.display();
  delay(150);

  // Frame 2: eyes curve upward into "^ ^", small smile appears
  display.clearDisplay();
  drawHappyEye(40, 28);
  drawHappyEye(88, 28);
  drawSmile(46, 12);
  display.display();
  delay(150);

  // Frame 3: full wide smile, held
  display.clearDisplay();
  drawHappyEye(40, 28);
  drawHappyEye(88, 28);
  drawSmile(44, 20);
  display.display();
}

void faceSad() {
  // Frame 1: eyes still round
  display.clearDisplay();
  drawRoundEye(40, 28, 9);
  drawRoundEye(88, 28, 9);
  display.display();
  delay(150);

  // Frame 2: eyes droop downward, frown appears
  display.clearDisplay();
  drawSadEye(40, 28);
  drawSadEye(88, 28);
  drawFrown(54, 18);
  display.display();
  delay(200);

  // Frame 3: a tear appears, held
  display.clearDisplay();
  drawSadEye(40, 28);
  drawSadEye(88, 28);
  drawFrown(54, 18);
  drawTear(34, 40);
  display.display();
}

void faceSurprised() {
  display.clearDisplay();
  drawRoundEye(40, 28, 9);
  drawRoundEye(88, 28, 9);
  display.display();
  delay(100);

  display.clearDisplay();
  drawRoundEye(40, 28, 15); // eyes snap wide open
  drawRoundEye(88, 28, 15);
  drawOMouth(64, 50, 6);    // small "o" mouth
  display.display();
}

void faceAngry() {
  display.clearDisplay();
  drawRoundEye(40, 28, 9);
  drawRoundEye(88, 28, 9);
  display.display();
  delay(100);

  display.clearDisplay();
  drawAngryEye(40, 28);
  drawAngryEye(88, 28);
  drawFrown(52, 14);
  display.display();
}

// ===================== SOUNDS =====================

void soundHappy() {
  tone(buzzerPin, 523, 150); delay(160);
  tone(buzzerPin, 659, 150); delay(160);
  tone(buzzerPin, 784, 250); delay(260);
  noTone(buzzerPin);
}
void soundSad() {
  tone(buzzerPin, 400, 300); delay(320);
  tone(buzzerPin, 300, 300); delay(320);
  tone(buzzerPin, 200, 500); delay(520);
  noTone(buzzerPin);
}
void soundSurprised() {
  tone(buzzerPin, 1200, 120); delay(130);
  noTone(buzzerPin);
}
void soundAngry() {
  tone(buzzerPin, 150, 400); delay(420);
  noTone(buzzerPin);
}

// ===================== REACTIONS =====================

void reactHappy() {
  isPlayingAction = true;
  faceHappy();
  headServo.write(HEAD_CENTER + 15);
  soundHappy();
  headServo.write(HEAD_CENTER);
  isPlayingAction = false;
}
void reactSad() {
  isPlayingAction = true;
  faceSad();
  headServo.write(HEAD_CENTER - 20);
  soundSad();
  headServo.write(HEAD_CENTER);
  isPlayingAction = false;
}
void reactSurprised() {
  isPlayingAction = true;
  faceSurprised();
  headServo.write(HEAD_CENTER - 25);
  soundSurprised();
  delay(200);
  headServo.write(HEAD_CENTER);
  isPlayingAction = false;
}
void reactAngry() {
  isPlayingAction = true;
  faceAngry();
  for (int i = 0; i < 3; i++) {
    headServo.write(HEAD_LEFT + 20); delay(80);
    headServo.write(HEAD_RIGHT - 20); delay(80);
  }
  headServo.write(HEAD_CENTER);
  soundAngry();
  isPlayingAction = false;
}
void reactSleepy() {
  isPlayingAction = true;
  faceClosed();
  delay(600);
  faceNeutral();
  isPlayingAction = false;
}
void reactLeft() {
  isPlayingAction = true;
  headServo.write(HEAD_LEFT);
  delay(400);
  headServo.write(HEAD_CENTER);
  isPlayingAction = false;
}
void reactRight() {
  isPlayingAction = true;
  headServo.write(HEAD_RIGHT);
  delay(400);
  headServo.write(HEAD_CENTER);
  isPlayingAction = false;
}
void reactNeutral() {
  isPlayingAction = true;
  faceNeutral();
  headServo.write(HEAD_CENTER);
  isPlayingAction = false;
}
void reactCelebrate() {
  isPlayingAction = true;
  for (int i = 0; i < 2; i++) {
    faceHappy();
    headServo.write(HEAD_LEFT + 20);
    tone(buzzerPin, 784, 100);
    delay(120);
    headServo.write(HEAD_RIGHT - 20);
    tone(buzzerPin, 988, 100);
    delay(120);
  }
  headServo.write(HEAD_CENTER);
  noTone(buzzerPin);
  isPlayingAction = false;
}

// ===================== COMMAND DISPATCH =====================

void runCommand(String cmd) {
  cmd.trim();
  cmd.toLowerCase();

  if (cmd == "happy") reactHappy();
  else if (cmd == "sad") reactSad();
  else if (cmd == "surprised") reactSurprised();
  else if (cmd == "angry") reactAngry();
  else if (cmd == "sleepy") reactSleepy();
  else if (cmd == "left") reactLeft();
  else if (cmd == "right") reactRight();
  else if (cmd == "neutral") reactNeutral();
  else if (cmd == "celebrate") reactCelebrate();
  else {
    Serial.print("Peeko didn't understand: ");
    Serial.println(cmd);
  }

  lastBlinkTime = millis();
}

// ===================== TESTED HELPERS FOR THE BLOCKS =====================
// Same for every student. Each block in Camp Blocks calls one of these.

void pollSerial() {
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n') {
      runCommand(inputLine);
      inputLine = "";
    } else {
      inputLine += c;
    }
  }
}

// Wait without freezing: Peeko still listens to the computer while it waits.
void waitSecs(float secs) {
  unsigned long ms = (unsigned long)(secs * 1000.0);
  unsigned long start = millis();
  while (millis() - start < ms) {
    pollSerial();
  }
}

// Show words on the OLED screen. msg lives in flash memory (PROGMEM / PSTR).
void sayText(const char* msg, float secs) {
  char buf[21];
  strncpy_P(buf, msg, 20);
  buf[20] = 0;
  int len = strlen(buf);
  int size = (len <= 10) ? 2 : 1;
  isPlayingAction = true;
  display.clearDisplay();
  display.setTextColor(SH110X_WHITE);
  display.setTextSize(size);
  display.setCursor((128 - len * 6 * size) / 2, (64 - 8 * size) / 2);
  display.print(buf);
  display.display();
  waitSecs(secs);
  faceNeutral();
  lastBlinkTime = millis();
  isPlayingAction = false;
}

void playNote(unsigned int hz, float secs) {
  tone(buzzerPin, hz, (unsigned long)(secs * 1000.0));
  waitSecs(secs);
  noTone(buzzerPin);
}

// ===================== STUDENT PART: WHAT PEEKO DOES =====================

// Runs ONCE, when Peeko wakes up (when it is powered on).
void studentWake() {
  sayText(ROBOT_NAME, 2.0);
  runCommand(F("happy"));
}

// Runs again and again, forever.
void studentForever() {
  if (random(2) == 0) {
    runCommand(F("happy"));
    for (int j = 0; j < 2; j++) {
      playNote(330, 0.2);  // E
      playNote(392, 0.2);  // G
    }
  } else {
    runCommand(F("sad"));
  }
  waitSecs(3.0);
}

// ===================== SETUP / LOOP =====================

void setup() {
  Serial.begin(9600);
  display.begin(0x3C, true);
  headServo.attach(9);
  pinMode(buzzerPin, OUTPUT);
  randomSeed(analogRead(A0));   // so coin flips are different every time
  reactNeutral();
  studentWake();
}

void loop() {
  pollSerial();
  studentForever();

  if (!isPlayingAction && millis() - lastBlinkTime > blinkInterval) {
    faceClosed();
    delay(150);
    faceNeutral();
    lastBlinkTime = millis();
  }
}