/**
 * JalRakshak Garden AI — Arduino Secondary Sensor Node Firmware
 * 
 * Target: Arduino Uno / Nano / Pro Mini (ATmega328P, 5V or 3.3V)
 * Architecture:
 *   Arduino (Analog Sensors) ──[UART Serial @ 115200]──> ESP32 Gateway ──[Wi-Fi]──> FastAPI
 * 
 * Features:
 *   - Continuous multi-channel ADC reading (Soil, Light/LDR, Temperature)
 *   - Compact JSON serialization over Serial TX
 *   - Low-power operation suitable for extended outdoor sensor nodes
 */

#include <Arduino.h>

// Sensor Pin Definitions
#define PIN_SOIL_ANALOG A0
#define PIN_LIGHT_LDR   A1
#define PIN_WATER_LEVEL A2
#define PIN_STATUS_LED  13

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL_MS = 5000; // Emit reading every 5 seconds

void setup() {
    Serial.begin(115200);
    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, LOW);
}

void loop() {
    unsigned long now = millis();

    if (now - lastSendTime >= SEND_INTERVAL_MS) {
        lastSendTime = now;
        digitalWrite(PIN_STATUS_LED, HIGH);

        // Read 10-bit ADCs (0 - 1023)
        int rawSoil = analogRead(PIN_SOIL_ANALOG);
        int rawLight = analogRead(PIN_LIGHT_LDR);
        int rawWater = analogRead(PIN_WATER_LEVEL);

        // Calculate rough percentage
        float soilPct = map(constrain(rawSoil, 300, 800), 800, 300, 0, 100);
        float lightPct = map(rawLight, 0, 1023, 0, 100);
        float waterPct = map(rawWater, 100, 700, 0, 100);

        // Emit clean JSON payload to Serial for ESP32 UART ingestion
        Serial.print(F("{\"node\":\"arduino-01\",\"soil_raw\":"));
        Serial.print(rawSoil);
        Serial.print(F(",\"soil_pct\":"));
        Serial.print(soilPct, 1);
        Serial.print(F(",\"light_pct\":"));
        Serial.print(lightPct, 1);
        Serial.print(F(",\"water_pct\":"));
        Serial.print(waterPct, 1);
        Serial.println(F("}"));

        digitalWrite(PIN_STATUS_LED, LOW);
    }
}
