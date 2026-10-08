#ifndef JALRAKSHAK_CONFIG_H
#define JALRAKSHAK_CONFIG_H

// ==============================================================================
// JalRakshak Garden AI — ESP32 Hardware & Network Configuration
// ==============================================================================

// Device Identification
#define DEVICE_ID "esp32-garden-01"
#define FIRMWARE_VERSION "1.2.0-iot"

// Wi-Fi Credentials
#define WIFI_SSID "Your_Garden_WiFi"
#define WIFI_PASSWORD "Your_WiFi_Password"
#define WIFI_RECONNECT_INTERVAL_MS 10000

// FastAPI Backend Endpoint (Local Network IP)
#define SERVER_HOST "192.168.1.100"
#define SERVER_PORT 8000
#define TELEMETRY_ENDPOINT "/api/iot/telemetry"
#define DEVICE_STATUS_ENDPOINT "/api/iot/devices/esp32-garden-01/status"

// Telemetry Timing (Non-blocking millis)
#define TELEMETRY_INTERVAL_MS 30000  // 30 seconds
#define SENSOR_SAMPLE_INTERVAL_MS 5000 // 5 seconds internal smoothing

// GPIO Pin Definitions
#define PIN_DHT 4             // DHT11 or DHT22 data pin
#define PIN_SOIL_ADC 34       // Analog ADC1 input for Soil Moisture (Capacitive)
#define PIN_WATER_ADC 35      // Analog ADC1 input for Tank Water Level (or float switch)
#define PIN_PUMP_RELAY 16     // Output pin to Relay / MOSFET gate driver
#define PIN_FLOW_SENSOR 14    // Input pulse pin for YF-S201 flow sensor
#define PIN_STATUS_LED 2      // On-board status LED (blue)

// DHT Sensor Type (DHT11 or DHT22)
#define DHTTYPE DHT11

// Soil Moisture ADC Calibration Defaults (ESP32 12-bit ADC: 0 - 4095)
// In air (dry): typically 3100 - 3300. In water (wet): typically 1300 - 1500.
#define DEFAULT_SOIL_DRY_ADC 3200
#define DEFAULT_SOIL_WET_ADC 1400

// Water Tank Calibration (Analog depth or float switch)
#define DEFAULT_TANK_EMPTY_ADC 500
#define DEFAULT_TANK_FULL_ADC 3000
#define MIN_SAFE_WATER_PERCENT 15.0

// Actuator & Physical Safety System (Hardware Watchdog)
#define MAX_PUMP_RUNTIME_MS 60000      // 60 seconds maximum continuous runtime
#define PUMP_COOLDOWN_MS 120000        // 120 seconds minimum cooldown between runs
#define EMERGENCY_SOIL_THRESHOLD 18.0  // Autonomous emergency trigger if server is offline

// Operational Modes:
// 0: MONITOR_ONLY
// 1: AI_RECOMMEND (Default)
// 2: SEMI_AUTOMATIC
// 3: AUTOMATIC
#define DEFAULT_OPERATION_MODE 1

// Optional MQTT Support
#define ENABLE_MQTT 0
#define MQTT_BROKER_IP "192.168.1.100"
#define MQTT_BROKER_PORT 1883
#define MQTT_TOPIC_TELEMETRY "garden/esp32-garden-01/telemetry"
#define MQTT_TOPIC_COMMAND "garden/esp32-garden-01/command"

#endif // JALRAKSHAK_CONFIG_H
