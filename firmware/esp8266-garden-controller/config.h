#ifndef JALRAKSHAK_ESP8266_CONFIG_H
#define JALRAKSHAK_ESP8266_CONFIG_H

// ==============================================================================
// JalRakshak Garden AI — LOLIN NodeMCU V3 ESP8266 Hardware & Network Configuration
// ==============================================================================

// Device Identification
#define DEVICE_ID "esp8266-garden-01"
#define DEVICE_TYPE "esp8266"
#define FIRMWARE_VERSION "1.2.0-esp8266"

// Wi-Fi Credentials
// Configure your local 2.4 GHz Wi-Fi credentials here
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define WIFI_RECONNECT_INTERVAL_MS 10000

// FastAPI Backend Endpoint (Windows PC running JalRakshak)
#define SERVER_HOST "192.168.1.100"
#define SERVER_PORT 8000
#define TELEMETRY_ENDPOINT "/api/iot/telemetry"

// Telemetry Timing (Non-blocking millis)
#define TELEMETRY_INTERVAL_MS 15000  // 15 seconds periodic transmission
#define SENSOR_SAMPLE_INTERVAL_MS 3000 // 3 seconds sample smoothing

// NodeMCU V3 GPIO Pin Definitions
#define PIN_DHT D2            // GPIO4: DHT11 Data Pin
#define DHTTYPE DHT11         // DHT11 Sensor

#define PIN_SOIL_ADC A0       // 10-bit Analog input (0 - 1023)
#define PIN_STATUS_LED D4     // Onboard LED (Active LOW on NodeMCU)
#define PIN_PUMP_RELAY D1     // GPIO5: Reserved for pump relay/MOSFET (HARDWARE DISABLED)

// Soil Moisture Calibration Defaults (ESP8266 10-bit ADC: 0 - 1023)
#define DEFAULT_SOIL_DRY_ADC 800
#define DEFAULT_SOIL_WET_ADC 350

// Pump Actuator Safety Lock (Requirement 11)
#define PUMP_ACTUATION_ENABLED 0

#endif // JALRAKSHAK_ESP8266_CONFIG_H
