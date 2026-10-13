/*
  NANO CHECK - is my Nano healthy?        Board: Arduino Nano
  Upload with NOTHING else connected. Open the Serial Monitor at 9600 baud.

  What it does
    - The L light blinks once a second (a steady, even blink means the Nano is running).
    - Every second it prints: how long it has been running, the power voltage, and how many times it has started.
  How to read it
    - Power 4.7 to 5.2 V and "starts" stays the same: the Nano and the USB power are fine.
    - "starts" goes up by one every few seconds: the Nano keeps restarting (a power problem or a short).
    - Power below 4.5 V: the USB port or cable is too weak for what is connected.
*/
#include <EEPROM.h>

const int ADDR = 0;                 // one byte in EEPROM counts the starts
unsigned long last = 0;
bool on = false;

// Measures the real supply voltage using the chip's internal 1.1 V reference.
long readVccMv() {
  ADMUX = _BV(REFS0) | _BV(MUX3) | _BV(MUX2) | _BV(MUX1);
  delay(3);
  ADCSRA |= _BV(ADSC);
  while (bit_is_set(ADCSRA, ADSC)) {}
  long v = ADCL;
  v |= ADCH << 8;
  return 1125300L / v;              // millivolts
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  delay(300);
  byte starts = EEPROM.read(ADDR);
  if (starts == 255) starts = 0;    // a fresh chip reads 255
  starts++;
  EEPROM.write(ADDR, starts);
  Serial.println(F("=== Nano check ==="));
  Serial.print(F("This is start number ")); Serial.println(starts);
  Serial.println(F("Unplugging and replugging adds one. Anything more than that means it restarted by itself."));
}

void loop() {
  if (millis() - last >= 1000) {
    last = millis();
    on = !on;
    digitalWrite(LED_BUILTIN, on);
    long mv = readVccMv();
    Serial.print(F("running ")); Serial.print(millis() / 1000); Serial.print(F(" s   power "));
    Serial.print(mv / 1000); Serial.print('.'); Serial.print((mv % 1000) / 10 < 10 ? "0" : ""); Serial.print((mv % 1000) / 10);
    Serial.print(F(" V   "));
    if (mv < 4500) Serial.println(F("[CHECK] power is low"));
    else Serial.println(F("[PASS] power is good"));
  }
}
