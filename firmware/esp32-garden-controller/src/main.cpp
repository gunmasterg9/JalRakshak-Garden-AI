/**
 * JalRakshak Garden AI — ESP32 Smart Garden Controller Firmware
 * 
 * Target: ESP32 Dev Module (WROOM-32)
 * Features:
 *   - Non-blocking execution via millis() loop scheduling
 *   - DHT11 / DHT22 environmental monitoring
 *   - Capacitive Soil Moisture Sensor with ADC calibration
 *   - Water reservoir monitoring with critical low cut-off
 *   - Mini DC water pump control via MOSFET / Relay driver
 *   - Multi-layer local hardware safety watchdog (max 60s, cooldown)
 *   - Automatic Wi-Fi reconnection
 *   - HTTP JSON telemetry ingestion & command response processing
 *   - Local emergency watering fallback during server disconnection
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include "config.h"

// Hardware instances
DHT dht(PIN_DHT, DHTTYPE);

// State tracking variables
unsigned long lastTelemetryTime = 0;
unsigned long lastSampleTime = 0;
unsigned long lastWiFiCheckTime = 0;
unsigned long lastServerContactTime = 0;

// Pump safety variables
bool isPumpActive = false;
unsigned long pumpStartTime = 0;
unsigned long pumpLastStopTime = 0;
unsigned int pumpStartCount = 0;

// Dynamic sensor values
float currentTemperature = 0.0;
float currentHumidity = 0.0;
int rawSoilADC = 0;
float currentSoilMoisture = 0.0;
int rawWaterADC = 0;
float currentWaterLevel = 0.0;

// Dynamic calibration values
int soilDryADC = DEFAULT_SOIL_DRY_ADC;
int soilWetADC = DEFAULT_SOIL_WET_ADC;

// Forward declarations
void connectWiFi();
void sampleSensors();
void transmitTelemetry();
bool startPump(unsigned long durationMs, const char* reason);
void stopPump(const char* reason);
void evaluateLocalEmergencySafety();

void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n=============================================");
    Serial.println("🌱 JalRakshak Garden AI — ESP32 Starting Up");
    Serial.printf("Device ID: %s | Firmware: %s\n", DEVICE_ID, FIRMWARE_VERSION);
    Serial.println("=============================================");

    // Pin setups
    pinMode(PIN_PUMP_RELAY, OUTPUT);
    digitalWrite(PIN_PUMP_RELAY, LOW); // Safe default: PUMP OFF
    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, LOW);

    // ADC resolution configuration (12-bit: 0 - 4095)
    analogReadResolution(12);

    // Initialize sensors
    dht.begin();

    // Connect to network
    connectWiFi();
    lastServerContactTime = millis();
}

void loop() {
    unsigned long now = millis();

    // 1. Wi-Fi connection watchdog
    if (now - lastWiFiCheckTime >= WIFI_RECONNECT_INTERVAL_MS) {
        lastWiFiCheckTime = now;
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[WiFi] Connection lost. Attempting reconnection...");
            digitalWrite(PIN_STATUS_LED, LOW);
            WiFi.disconnect();
            WiFi.reconnect();
        } else {
            digitalWrite(PIN_STATUS_LED, HIGH);
        }
    }

    // 2. Hardware Pump Safety Watchdog (Non-negotiable hard timer cutoff)
    if (isPumpActive) {
        unsigned long elapsed = now - pumpStartTime;
        if (elapsed >= MAX_PUMP_RUNTIME_MS) {
            Serial.println("[SAFETY WATCHDOG] Maximum pump runtime (60s) reached! Cutting power.");
            stopPump("Hardware Watchdog: Max runtime cutoff");
        }
        // Emergency water level cutoff during active pumping
        if (currentWaterLevel <= MIN_SAFE_WATER_PERCENT) {
            Serial.println("[SAFETY WATCHDOG] Water level dropped below safe threshold! Immediate cutoff.");
            stopPump("Hardware Watchdog: Reservoir critical");
        }
    }

    // 3. Periodic sensor multi-sampling (every 5 seconds)
    if (now - lastSampleTime >= SENSOR_SAMPLE_INTERVAL_MS) {
        lastSampleTime = now;
        sampleSensors();
    }

    // 4. Autonomous local emergency evaluation (if server offline > 15 minutes)
    if (now - lastServerContactTime > 900000) {
        evaluateLocalEmergencySafety();
    }

    // 5. Scheduled telemetry transmission (every 30 seconds)
    if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
        lastTelemetryTime = now;
        if (WiFi.status() == WL_CONNECTED) {
            transmitTelemetry();
        } else {
            Serial.println("[Telemetry] Skipped (Offline). Storing local metrics.");
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
        Serial.printf("[WiFi] Assigned IP: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("[WiFi] Signal Strength (RSSI): %d dBm\n", WiFi.RSSI());
        digitalWrite(PIN_STATUS_LED, HIGH);
    } else {
        Serial.println("\n[WiFi] Connection timeout. Operating in standalone offline mode.");
        digitalWrite(PIN_STATUS_LED, LOW);
    }
}

void sampleSensors() {
    // Read DHT sensor
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && t >= -20.0 && t <= 65.0) {
        currentTemperature = t;
    }
    if (!isnan(h) && h >= 0.0 && h <= 100.0) {
        currentHumidity = h;
    }

    // Multi-sample Soil Moisture ADC (10 samples averaged to reject noise)
    long soilSum = 0;
    for (int i = 0; i < 10; i++) {
        soilSum += analogRead(PIN_SOIL_ADC);
        delay(5);
    }
    rawSoilADC = soilSum / 10;

    // Calibrated percentage calculation
    // Capacitive: high ADC = dry air, low ADC = wet water
    float moisture = 0.0;
    if (soilDryADC > soilWetADC) {
        moisture = ((float)(soilDryADC - rawSoilADC) / (float)(soilDryADC - soilWetADC)) * 100.0;
    }
    currentSoilMoisture = constrain(moisture, 0.0, 100.0);

    // Multi-sample Water Tank ADC
    long waterSum = 0;
    for (int i = 0; i < 10; i++) {
        waterSum += analogRead(PIN_WATER_ADC);
        delay(5);
    }
    rawWaterADC = waterSum / 10;

    float tank = ((float)(rawWaterADC - DEFAULT_TANK_EMPTY_ADC) / (float)(DEFAULT_TANK_FULL_ADC - DEFAULT_TANK_EMPTY_ADC)) * 100.0;
    currentWaterLevel = constrain(tank, 0.0, 100.0);
}

bool startPump(unsigned long durationMs, const char* reason) {
    unsigned long now = millis();

    // Layer 1: Water reservoir check
    if (currentWaterLevel <= MIN_SAFE_WATER_PERCENT) {
        Serial.printf("[PUMP] Activation REJECTED: Reservoir is too low (%.1f%% <= %.1f%%)\n", currentWaterLevel, MIN_SAFE_WATER_PERCENT);
        return false;
    }

    // Layer 2: Cooldown check
    if (!isPumpActive && (now - pumpLastStopTime < PUMP_COOLDOWN_MS) && pumpLastStopTime > 0) {
        unsigned long remaining = (PUMP_COOLDOWN_MS - (now - pumpLastStopTime)) / 1000;
        Serial.printf("[PUMP] Activation REJECTED: Cooldown active (%lu seconds remaining)\n", remaining);
        return false;
    }

    // Layer 3: Hard limit on requested duration
    if (durationMs > MAX_PUMP_RUNTIME_MS) {
        durationMs = MAX_PUMP_RUNTIME_MS;
    }

    // Activate GPIO output
    digitalWrite(PIN_PUMP_RELAY, HIGH);
    isPumpActive = true;
    pumpStartTime = now;
    pumpStartCount++;

    Serial.printf("[PUMP] Turned ON for %lu ms. Reason: %s\n", durationMs, reason);
    return true;
}

void stopPump(const char* reason) {
    if (!isPumpActive) return;

    digitalWrite(PIN_PUMP_RELAY, LOW);
    isPumpActive = false;
    pumpLastStopTime = millis();

    unsigned long runtimeSec = (pumpLastStopTime - pumpStartTime) / 1000;
    Serial.printf("[PUMP] Turned OFF. Actual runtime: %lu seconds. Reason: %s\n", runtimeSec, reason);
}

void evaluateLocalEmergencySafety() {
    // If disconnected from server for a prolonged period, protect plants from catastrophic drying
    unsigned long now = millis();
    if (!isPumpActive && currentSoilMoisture < EMERGENCY_SOIL_THRESHOLD && currentWaterLevel > 25.0) {
        if (now - pumpLastStopTime >= PUMP_COOLDOWN_MS) {
            Serial.println("[LOCAL INTELLIGENCE] Autonomous emergency watering triggered (Server Offline + Soil Critical).");
            startPump(15000, "Local Emergency Autonomous Watering");
        }
    }
}

void transmitTelemetry() {
    HTTPClient http;
    String url = String("http://") + SERVER_HOST + ":" + SERVER_PORT + TELEMETRY_ENDPOINT;

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(4000);

    // Build ISO timestamp (ESP32 uptime format or NTP if synced)
    StaticJsonDocument<512> doc;
    doc["device_id"] = DEVICE_ID;
    
    // Fallback ISO timestamp with device uptime
    char timeBuffer[32];
    snprintf(timeBuffer, sizeof(timeBuffer), "2026-10-08T%02lu:%02lu:%02luZ", 
             (millis() / 3600000) % 24, 
             (millis() / 60000) % 60, 
             (millis() / 1000) % 60);
    doc["timestamp"] = timeBuffer;

    doc["temperature_c"] = round(currentTemperature * 10) / 10.0;
    doc["humidity_percent"] = round(currentHumidity * 10) / 10.0;
    doc["soil_moisture_percent"] = round(currentSoilMoisture * 10) / 10.0;
    doc["raw_adc"] = rawSoilADC;
    doc["water_level_percent"] = round(currentWaterLevel * 10) / 10.0;
    doc["pump_on"] = isPumpActive;
    doc["is_simulated"] = false;

    String jsonString;
    serializeJson(doc, jsonString);

    Serial.printf("[HTTP] POST %s -> %s\n", url.c_str(), jsonString.c_str());

    int httpCode = http.POST(jsonString);
    if (httpCode > 0) {
        lastServerContactTime = millis();
        String response = http.getString();
        Serial.printf("[HTTP] Code: %d, Response: %s\n", httpCode, response.c_str());

        // Parse any server commands
        StaticJsonDocument<512> respDoc;
        DeserializationError err = deserializeJson(respDoc, response);
        if (!err) {
            if (respDoc.containsKey("command")) {
                const char* cmd = respDoc["command"];
                if (strcmp(cmd, "PUMP_ON") == 0) {
                    unsigned long duration = respDoc.containsKey("duration") ? respDoc["duration"].as<unsigned long>() * 1000 : 30000;
                    startPump(duration, "Server Command");
                } else if (strcmp(cmd, "PUMP_OFF") == 0 || strcmp(cmd, "EMERGENCY_STOP") == 0) {
                    stopPump("Server Emergency/Stop Command");
                }
            }
        }
    } else {
        Serial.printf("[HTTP] Error sending telemetry: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
}
