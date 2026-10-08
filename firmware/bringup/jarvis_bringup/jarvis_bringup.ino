/*
  JARVIS  -  bring-up test           Board: Arduino Uno
  Flash this on every Jarvis board BEFORE camp, so day-1 students see their robot come alive
  as soon as the light and the sensors are wired. No laptop is needed in the room: any USB charger works.

  Pins (same as the real Jarvis sketch):
    Soil sensor A0      Light sensor (LDR + 10k resistor divider) A1
    RGB LED  D9 = red, D10 = green, D11 = blue (common cathode, a 220 ohm resistor on each colour)
    Buzzer D8

  What it does, forever:
    1. Start-up: the LED runs red, green, blue so every colour leg is checked.
    2. Then the LED shows the plant mood: soil dry = red, soil damp = green, and it goes blue when the room is dark.
    3. The raw numbers go to the Serial Monitor (9600) so the facilitator can calibrate.
  Numbers: soil in dry air is about 520 or more, in water about 280. Change DRY_ABOVE if your sensor reads differently.
*/
const uint8_t PIN_SOIL = A0, PIN_LIGHT = A1, PIN_R = 9, PIN_G = 10, PIN_B = 11, PIN_BUZZER = 8;
const int DRY_ABOVE = 400;     // soil raw reading above this = dry
const int DARK_BELOW = 150;    // light raw reading below this = dark (LDR on the ground side of the divider)

void rgb(bool r, bool g, bool b) {
  digitalWrite(PIN_R, r ? HIGH : LOW);
  digitalWrite(PIN_G, g ? HIGH : LOW);
  digitalWrite(PIN_B, b ? HIGH : LOW);
}
int readAvg(uint8_t pin) {
  long sum = 0;
  for (uint8_t i = 0; i < 8; i++) { sum += analogRead(pin); delay(3); }
  return (int)(sum / 8);
}

void setup() {
  Serial.begin(9600);
  pinMode(PIN_R, OUTPUT); pinMode(PIN_G, OUTPUT); pinMode(PIN_B, OUTPUT); pinMode(PIN_BUZZER, OUTPUT);
  Serial.println(F("Jarvis bring-up test"));
  rgb(1, 0, 0); delay(400);
  rgb(0, 1, 0); delay(400);
  rgb(0, 0, 1); delay(400);
  rgb(0, 0, 0);
  tone(PIN_BUZZER, 523, 120); delay(180);
  tone(PIN_BUZZER, 784, 180); delay(260);
}

void loop() {
  int soil = readAvg(PIN_SOIL), light = readAvg(PIN_LIGHT);
  Serial.print(F("soil ")); Serial.print(soil);
  Serial.print(F("   light ")); Serial.println(light);
  if (light < DARK_BELOW) rgb(0, 0, 1);          // dark room
  else if (soil > DRY_ABOVE) rgb(1, 0, 0);       // dry soil
  else rgb(0, 1, 0);                             // happy plant
  delay(500);
}
