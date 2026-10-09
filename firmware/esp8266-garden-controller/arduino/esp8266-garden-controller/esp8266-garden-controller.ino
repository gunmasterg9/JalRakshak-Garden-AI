#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <DHT.h>

// ==============================================================================
// JalRakshak Garden AI — LOLIN NodeMCU V3 ESP8266 Smart Garden Node
// ==============================================================================

// 1. PIN DEFINITIONS
#define DHTPIN D4        // If wired to D4 (GPIO2), or change to D2 (GPIO4)
#define DHTTYPE DHT11
#define PIN_SOIL_ADC A0  // 10-bit Analog input (0 - 1023)

// 2. WI-FI CREDENTIALS
// Replace with your actual 2.4 GHz Wi-Fi SSID and Password
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// 3. JALRAKSHAK BACKEND ENDPOINT
// Replace with your Windows PC's IPv4 address on port 8000
const char* backendUrl = "http://192.168.1.100:8000/api/iot/telemetry";

const char* deviceId = "esp8266-garden-01";
const char* firmwareVersion = "1.2.0-esp8266";

DHT dht(DHTPIN, DHTTYPE);

unsigned long lastTelemetryTime = 0;
const unsigned long telemetryIntervalMs = 15000; // Send telemetry every 15 seconds

void sendTelemetry(float temp, float humidity, int rawAdc);

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n==================================================");
  Serial.println("🌱 JalRakshak Garden AI — NodeMCU V3 ESP8266 Node");
  Serial.println("==================================================");

  dht.begin();
  Serial.printf("[SETUP] DHT11 initialized on pin %s\n", DHTPIN == D4 ? "D4" : "D2");

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  Serial.printf("[WiFi] Connecting to %s", ssid);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] Assigned ESP8266 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Connection failed. Operating in offline loop.");
  }
}

void loop() {
  // Reconnect Wi-Fi if dropped
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Reconnecting...");
    WiFi.reconnect();
    delay(2000);
  }

  unsigned long currentMillis = millis();
  if (currentMillis - lastTelemetryTime >= telemetryIntervalMs || lastTelemetryTime == 0) {
    lastTelemetryTime = currentMillis;

    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    int rawAdc = analogRead(PIN_SOIL_ADC);

    bool dhtOk = !isnan(temperature) && !isnan(humidity);

    if (dhtOk) {
      Serial.printf("[SENSOR] Temp: %.1f C | Humidity: %.1f %% | Soil ADC: %d\n", temperature, humidity, rawAdc);
    } else {
      Serial.printf("[SENSOR] DHT11 read failed on pin %s. Soil ADC: %d\n", DHTPIN == D4 ? "D4" : "D2", rawAdc);
    }

    if (WiFi.status() == WL_CONNECTED) {
      sendTelemetry(dhtOk ? temperature : -999.0, dhtOk ? humidity : -999.0, rawAdc);
    } else {
      Serial.println("[HTTP] Skipping upload — Wi-Fi offline.");
    }
  }

  delay(100);
}

void sendTelemetry(float temp, float humidity, int rawAdc) {
  WiFiClient client;
  HTTPClient http;

  http.begin(client, backendUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000);

  // Generate ISO timestamp from device uptime
  char isoTimestamp[36];
  snprintf(isoTimestamp, sizeof(isoTimestamp), "2026-10-10T%02lu:%02lu:%02luZ",
           (millis() / 3600000) % 24,
           (millis() / 60000) % 60,
           (millis() / 1000) % 60);

  // Construct JSON payload matching FastAPI TelemetryPayload schema
  char jsonPayload[512];
  char tempStr[16];
  char humStr[16];
  char soilStr[32];
  char adcStr[16];

  if (temp > -900.0) {
    snprintf(tempStr, sizeof(tempStr), "%.1f", temp);
    snprintf(humStr, sizeof(humStr), "%.1f", humidity);
  } else {
    strcpy(tempStr, "null");
    strcpy(humStr, "null");
  }

  // 10-bit ADC (0 - 1023): probe connected when reading is within valid range (50 - 1010)
  if (rawAdc > 50 && rawAdc < 1010) {
    float moisture = ((float)(800 - rawAdc) / (float)(800 - 350)) * 100.0;
    if (moisture < 0.0) moisture = 0.0;
    if (moisture > 100.0) moisture = 100.0;
    snprintf(soilStr, sizeof(soilStr), "%.1f", moisture);
    snprintf(adcStr, sizeof(adcStr), "%d", rawAdc);
  } else {
    strcpy(soilStr, "null");
    strcpy(adcStr, "null");
  }

  snprintf(jsonPayload, sizeof(jsonPayload),
    "{"
      "\"device_id\":\"%s\","
      "\"timestamp\":\"%s\","
      "\"temperature_c\":%s,"
      "\"humidity_percent\":%s,"
      "\"soil_moisture_percent\":%s,"
      "\"raw_adc\":%s,"
      "\"water_level_percent\":null,"
      "\"pump_on\":false,"
      "\"is_simulated\":false,"
      "\"firmware_version\":\"%s\","
      "\"wifi_rssi\":%d,"
      "\"ip_address\":\"%s\""
    "}",
    deviceId,
    isoTimestamp,
    tempStr,
    humStr,
    soilStr,
    adcStr,
    firmwareVersion,
    WiFi.RSSI(),
    WiFi.localIP().toString().c_str()
  );

  Serial.printf("[HTTP] POST %s\nPayload: %s\n", backendUrl, jsonPayload);

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Response %d: %s\n", httpCode, response.c_str());
  } else {
    Serial.printf("[HTTP] POST failed, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}
