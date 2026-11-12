/**
 * Smart Irrigation System – ESP32 Firmware (Phase 2 hardware)
 *
 * Architecture (command poll model):
 *  1. Connect to Wi-Fi
 *  2. Read sensors (soil moisture, tank, optional DHT22)
 *  3. POST readings to Express API with X-Device-Key
 *  4. Poll GET /api/pump/pending for authorized commands
 *  5. Execute ON/OFF safely via relay driver (never drive pump from GPIO directly)
 *  6. Acknowledge commands and report actual pump state
 *  7. Local max-runtime and safety stop if server unreachable
 *
 * STATUS: This sketch is provided for future hardware integration.
 * It has NOT been compiled or tested on physical ESP32 hardware in this project.
 *
 * Wiring (document only – follow safe low-voltage practices):
 *  - Capacitive soil moisture AOUT -> GPIO 34 (ADC1)
 *  - Tank float / level sensor   -> GPIO 35 (or digital float switch)
 *  - DHT22 data                  -> GPIO 4
 *  - Relay IN (active LOW typical)-> GPIO 26  (controls pump driver, NOT the pump itself)
 *  - Pump powered from separate PSU through properly rated relay/driver
 *  - Keep water away from ESP32 and exposed wiring
 *
 * Required Arduino libraries: WiFi, HTTPClient, ArduinoJson, DHT sensor library
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ---------- USER CONFIG ----------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_BASE      = "http://192.168.1.10:5000/api";  // your PC LAN IP
const char* DEVICE_CODE   = "RWA-FARM-001";
const char* DEVICE_API_KEY = "replace_with_same_key_as_backend_DEVICE_API_KEY";

const int PIN_SOIL   = 34;
const int PIN_TANK   = 35;
const int PIN_RELAY  = 26;
const int PIN_DHT    = 4;   // optional

const unsigned long READ_INTERVAL_MS   = 10000;
const unsigned long POLL_INTERVAL_MS   = 5000;
const unsigned long MAX_RUNTIME_MS     = 600000; // 10 min local hard limit
const int SOIL_DRY_ADC   = 2800;  // calibrate on your sensor
const int SOIL_WET_ADC   = 1200;

// ---------- STATE ----------
bool pumpOn = false;
unsigned long pumpStartedAt = 0;
unsigned long lastRead = 0;
unsigned long lastPoll = 0;

float mapMoisture(int adc) {
  float pct = 100.0f * (SOIL_DRY_ADC - adc) / float(SOIL_DRY_ADC - SOIL_WET_ADC);
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  return pct;
}

void setPump(bool on) {
  // Active-LOW relay example – adjust if your module is active-HIGH
  digitalWrite(PIN_RELAY, on ? LOW : HIGH);
  pumpOn = on;
  if (on) pumpStartedAt = millis();
}

void ensureLocalSafety() {
  if (pumpOn && (millis() - pumpStartedAt > MAX_RUNTIME_MS)) {
    setPump(false);
    Serial.println("[SAFE] Local max runtime reached – pump OFF");
  }
}

bool postReading(float moisture, float tank, float temp, float humidity, bool valid) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  String url = String(API_BASE) + "/sensors/readings";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);

  StaticJsonDocument<256> doc;
  doc["device_code"] = DEVICE_CODE;
  doc["soil_moisture"] = moisture;
  doc["tank_level"] = tank;
  if (!isnan(temp)) doc["air_temperature"] = temp;
  if (!isnan(humidity)) doc["air_humidity"] = humidity;
  doc["sensor_valid"] = valid;
  doc["source"] = "HARDWARE";

  String body;
  serializeJson(doc, body);
  int code = http.POST(body);
  http.end();
  Serial.printf("[HTTP] POST reading -> %d\n", code);
  return code >= 200 && code < 300;
}

void pollCommands() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  String url = String(API_BASE) + "/pump/pending?device_code=" + String(DEVICE_CODE);
  http.begin(url);
  http.addHeader("X-Device-Key", DEVICE_API_KEY);
  int code = http.GET();
  if (code == 200) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    if (!deserializeJson(doc, payload)) {
      JsonArray arr = doc["data"].as<JsonArray>();
      for (JsonObject cmd : arr) {
        long id = cmd["id"];
        const char* command = cmd["command"];
        if (strcmp(command, "ON") == 0) setPump(true);
        else if (strcmp(command, "OFF") == 0 || strcmp(command, "EMERGENCY_STOP") == 0) setPump(false);

        // Acknowledge
        HTTPClient ack;
        String ackUrl = String(API_BASE) + "/pump/commands/" + String(id) + "/ack";
        ack.begin(ackUrl);
        ack.addHeader("Content-Type", "application/json");
        ack.addHeader("X-Device-Key", DEVICE_API_KEY);
        StaticJsonDocument<128> a;
        a["acknowledgement"] = "OK";
        a["actual_pump_status"] = pumpOn ? "ON" : "OFF";
        String ab;
        serializeJson(a, ab);
        ack.POST(ab);
        ack.end();
      }
    }
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELAY, OUTPUT);
  setPump(false);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" connected");
  Serial.println(WiFi.localIP());
}

void loop() {
  ensureLocalSafety();

  unsigned long now = millis();
  if (now - lastRead >= READ_INTERVAL_MS) {
    lastRead = now;
    int soilAdc = analogRead(PIN_SOIL);
    float moisture = mapMoisture(soilAdc);
    // Simple tank: treat analog as percentage or digital float
    int tankAdc = analogRead(PIN_TANK);
    float tank = constrain(map(tankAdc, 0, 4095, 0, 100), 0, 100);
    bool valid = soilAdc > 100 && soilAdc < 4000;
    postReading(moisture, tank, NAN, NAN, valid);
  }

  if (now - lastPoll >= POLL_INTERVAL_MS) {
    lastPoll = now;
    pollCommands();
  }
}
