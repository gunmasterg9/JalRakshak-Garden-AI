/**
 * JalRakshak Garden AI — ESP8266 Smart Garden Node Firmware
 * Target: LOLIN NodeMCU V3 (ESP8266EX)
 * Features:
 *   - Non-blocking millis() loop execution
 *   - DHT11 real temperature & relative humidity acquisition
 *   - Multi-sample noise rejection
 *   - Wi-Fi connection watchdog with automatic reconnection
 *   - HTTP JSON telemetry uploads to JalRakshak FastAPI endpoint
 *   - Dynamic ADC 10-bit calibration profiles (0-1023)
 *   - Actuator lock: Pump safely disabled pending hardware verification
 *   - Detailed Serial Monitor diagnostics at 115200 baud
 */

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include "config.h"

// Sensor instances
DHT dht(PIN_DHT, DHTTYPE);

// Millis scheduling timers
unsigned long lastTelemetryTime = 0;
unsigned long lastSampleTime = 0;
unsigned long lastWiFiCheckTime = 0;

// Dynamic sensor readings
float currentTemperature = NAN;
float currentHumidity = NAN;
int rawSoilADC = -1;
float currentSoilMoisture = NAN;
bool isDhtValid = false;
bool isSoilConnected = false;

void connectWiFi();
void sampleSensors();
void transmitTelemetry();

void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println("\n==================================================");
    Serial.println("🌱 JalRakshak Garden AI — NodeMCU V3 ESP8266 Node");
    Serial.printf("Device ID: %s | Firmware: %s\n", DEVICE_ID, FIRMWARE_VERSION);
    Serial.printf("ADC: 10-Bit (0-1023) | DHT11 Pin: D2 (GPIO%d)\n", PIN_DHT);
    Serial.println("Actuator status: PUMP DISABLED (Safety Lock Active)");
    Serial.println("==================================================");

    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, HIGH); // Off for active-low LED on NodeMCU

    // Initialize DHT sensor
    dht.begin();
    Serial.println("[SETUP] DHT11 sensor initialized.");

    // Initial sensor sample
    sampleSensors();

    // Connect to Wi-Fi
    connectWiFi();
}

void loop() {
    unsigned long now = millis();

    // 1. Wi-Fi reconnection watchdog
    if (now - lastWiFiCheckTime >= WIFI_RECONNECT_INTERVAL_MS) {
        lastWiFiCheckTime = now;
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[WiFi] Link down. Attempting reconnection...");
            digitalWrite(PIN_STATUS_LED, HIGH);
            WiFi.reconnect();
        } else {
            digitalWrite(PIN_STATUS_LED, LOW); // LED ON when connected
        }
    }

    // 2. Periodic sensor sampling (every 3 seconds)
    if (now - lastSampleTime >= SENSOR_SAMPLE_INTERVAL_MS) {
        lastSampleTime = now;
        sampleSensors();
    }

    // 3. Periodic telemetry transmission (every 15 seconds)
    if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
        lastTelemetryTime = now;
        if (WiFi.status() == WL_CONNECTED) {
            transmitTelemetry();
        } else {
            Serial.printf("[Telemetry] Offline: Temp=%.1f C, Humidity=%.1f %%\n",
                          isnan(currentTemperature) ? 0.0 : currentTemperature,
                          isnan(currentHumidity) ? 0.0 : currentHumidity);
        }
    }
}

void connectWiFi() {
    Serial.printf("[WiFi] Connecting to SSID: %s\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[WiFi] Connected successfully!");
        Serial.printf("[WiFi] Assigned IP : %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("[WiFi] RSSI Signal : %d dBm\n", WiFi.RSSI());
        Serial.printf("[WiFi] Gateway IP  : %s\n", WiFi.gatewayIP().toString().c_str());
        digitalWrite(PIN_STATUS_LED, LOW);
    } else {
        Serial.println("\n[WiFi] Connection timeout. Operating in standalone offline mode.");
        Serial.println("[WiFi] Telemetry will resume automatically once Wi-Fi connects.");
        digitalWrite(PIN_STATUS_LED, HIGH);
    }
}

void sampleSensors() {
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (!isnan(t) && t >= -20.0 && t <= 65.0) {
        currentTemperature = t;
        isDhtValid = true;
    } else {
        isDhtValid = false;
    }

    if (!isnan(h) && h >= 0.0 && h <= 100.0) {
        currentHumidity = h;
    } else {
        isDhtValid = false;
    }

    if (isDhtValid) {
        Serial.printf("[DHT11] Temp: %.1f °C | Humidity: %.1f %% [OK]\n", currentTemperature, currentHumidity);
    } else {
        Serial.println("[DHT11] Reading: sensor waiting or check wiring (VCC->3V3, GND->GND, DATA->D2).");
    }

    // Read ADC on A0 (10-bit: 0 - 1023)
    long adcSum = 0;
    for (int i = 0; i < 8; i++) {
        adcSum += analogRead(PIN_SOIL_ADC);
        delay(3);
    }
    int avgAdc = adcSum / 8;

    // Check if LM393 probe is connected (within valid electrical operating range)
    if (avgAdc > 50 && avgAdc < 1010) {
        rawSoilADC = avgAdc;
        isSoilConnected = true;
        float moisture = ((float)(DEFAULT_SOIL_DRY_ADC - rawSoilADC) / (float)(DEFAULT_SOIL_DRY_ADC - DEFAULT_SOIL_WET_ADC)) * 100.0;
        currentSoilMoisture = constrain(moisture, 0.0, 100.0);
        Serial.printf("[SOIL] Raw ADC: %d (10-bit) | Calibrated: %.1f %%\n", rawSoilADC, currentSoilMoisture);
    } else {
        rawSoilADC = -1;
        isSoilConnected = false;
        currentSoilMoisture = NAN;
    }
}

void transmitTelemetry() {
    WiFiClient client;
    HTTPClient http;

    String url = String("http://") + SERVER_HOST + ":" + SERVER_PORT + TELEMETRY_ENDPOINT;
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(4000);

    #if ARDUINOJSON_VERSION_MAJOR >= 7
        JsonDocument doc;
    #else
        StaticJsonDocument<512> doc;
    #endif

    doc["device_id"] = DEVICE_ID;

    // Fallback ISO timestamp using device uptime
    char timeBuffer[36];
    snprintf(timeBuffer, sizeof(timeBuffer), "2026-10-10T%02lu:%02lu:%02luZ",
             (millis() / 3600000) % 24,
             (millis() / 60000) % 60,
             (millis() / 1000) % 60);
    doc["timestamp"] = timeBuffer;

    if (isDhtValid) {
        doc["temperature_c"] = round(currentTemperature * 10) / 10.0;
        doc["humidity_percent"] = round(currentHumidity * 10) / 10.0;
    } else {
        doc["temperature_c"] = nullptr;
        doc["humidity_percent"] = nullptr;
    }

    if (isSoilConnected) {
        doc["soil_moisture_percent"] = round(currentSoilMoisture * 10) / 10.0;
        doc["raw_adc"] = rawSoilADC;
    } else {
        doc["soil_moisture_percent"] = nullptr;
        doc["raw_adc"] = nullptr;
    }

    doc["water_level_percent"] = nullptr;
    doc["pump_on"] = false;
    doc["is_simulated"] = false;
    doc["firmware_version"] = FIRMWARE_VERSION;
    doc["wifi_rssi"] = WiFi.RSSI();
    doc["ip_address"] = WiFi.localIP().toString();

    JsonObject sensorStatus = doc.createNestedObject("sensor_status");
    sensorStatus["dht11"] = isDhtValid ? "connected" : "not_connected";
    sensorStatus["soil_moisture"] = isSoilConnected ? "connected" : "not_connected";
    sensorStatus["water_tank"] = "not_connected";
    sensorStatus["pump_actuator"] = "disabled_safety_lock";

    String jsonString;
    serializeJson(doc, jsonString);

    Serial.printf("[HTTP] POST %s -> %s\n", url.c_str(), jsonString.c_str());

    int httpCode = http.POST(jsonString);
    if (httpCode > 0) {
        String resp = http.getString();
        Serial.printf("[HTTP] Response %d: %s\n", httpCode, resp.c_str());
    } else {
        Serial.printf("[HTTP] POST failed, code: %d, err: %s\n", httpCode, http.errorToString(httpCode).c_str());
    }
    http.end();
}
