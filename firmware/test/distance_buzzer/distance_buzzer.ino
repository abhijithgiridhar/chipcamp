// Distance + buzzer: TRIG on D8, ECHO on D9, buzzer long leg (+) on D13, short leg to ground.
const int TRIG_PIN = 8;
const int ECHO_PIN = 9;
const int BUZZER_PIN = 13;
const int FAR_CM = 40;
const int STOP_CM = 6;

long readCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long us = pulseIn(ECHO_PIN, HIGH, 25000);
  if (us == 0) return 999;
  return us / 58;
}

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Distance + buzzer ready. Move your hand toward the sensor.");
}

void loop() {
  long cm = readCm();
  Serial.print("distance: ");
  Serial.print(cm);
  Serial.println(" cm");

  if (cm <= STOP_CM) {
    tone(BUZZER_PIN, 1000, 150);
    delay(160);
  } else if (cm < FAR_CM) {
    tone(BUZZER_PIN, 1000, 60);
    delay(60 + map(cm, STOP_CM, FAR_CM, 40, 600));
  } else {
    delay(150);
  }
}
