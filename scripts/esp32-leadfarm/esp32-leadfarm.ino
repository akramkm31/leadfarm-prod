#include <TinyGPSPlus.h>
#include <math.h>
#include <HardwareSerial.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include "secrets.h"

// Copy secrets.h.example → secrets.h (gitignored) before flashing.

// ===================== OFFLINE QUEUE (NVS) =====================
Preferences prefs;
const char* QUEUE_NS = "lf_queue";
const int MAX_QUEUE = 20;

// ===================== PINS =====================
#define FLOW1_PIN 14
#define FLOW2_PIN 26
#define GPS_RX 17
#define GPS_TX 16
#define GPS_BAUD 9600

// ===================== TFT =====================
#define TFT_CS  5
#define TFT_DC  2
#define TFT_RST 4

Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RST);

// ===================== COULEURS — WHITE THEME =====================
#define C_BG        0xFFFF
#define C_CARD      0xF79E
#define C_CARD_BRD  0xE71C
#define C_HEADER_BG 0x1483
#define C_ACCENT    0x0DA0
#define C_ACCENT_DK 0x0B40
#define C_RED       0xD8A2
#define C_RED_BG    0xFDB8
#define C_CYAN      0x0E9F
#define C_CYAN_LT   0xC7FF
#define C_ORANGE    0xFC60
#define C_ORNG_LT   0xFEF3
#define C_YELLOW    0xEEE0
#define C_YLW_LT    0xFFF8
#define C_TEXT      0x2104
#define C_TEXT_SEC  0x8410
#define C_TEXT_TER  0xB596
#define C_DIVIDER   0xDEFB
#define C_GREEN_BG  0xCFF3
#define C_WHITE     0xFFFF

// ===================== GPS (u-blox NEO-8M) =====================
TinyGPSPlus gps;
HardwareSerial GPSSerial(2);
const int TZ_HOURS = 1;

unsigned long gpsLastCharMs = 0;
unsigned long gpsTotalChars = 0;

// ===================== TIMERS =====================
unsigned long lastTftMs = 0;
unsigned long lastFlowCalcMs = 0;
unsigned long lastSendMs = 0;
unsigned long lastReportMs = 0;
const unsigned long TFT_INTERVAL_MS = 500;
const unsigned long SEND_INTERVAL_MS = 10000;

// ===================== FLOW =====================
const float PULSES_PER_LITER_1 = 450.0;
const float PULSES_PER_LITER_2 = 450.0;
const unsigned long MIN_PULSE_US = 1000;
const float FLOW_THRESHOLD = 0.3;

volatile unsigned long pulses1 = 0;
volatile unsigned long pulses2 = 0;
volatile unsigned long lastMicros1 = 0;
volatile unsigned long lastMicros2 = 0;

void IRAM_ATTR isrFlow1() {
  unsigned long now = micros();
  if (now - lastMicros1 > MIN_PULSE_US) { pulses1++; lastMicros1 = now; }
}
void IRAM_ATTR isrFlow2() {
  unsigned long now = micros();
  if (now - lastMicros2 > MIN_PULSE_US) { pulses2++; lastMicros2 = now; }
}

float flow1_Lmin = 0.0, flow2_Lmin = 0.0;
float total1_L = 0.0, total2_L = 0.0;

// ===================== SURFACE =====================
const int MAX_POINTS = 800;
double xs[MAX_POINTS], ys[MAX_POINTS];
int pointCount = 0;
bool areaRecording = false;
double refLatRad = 0, refLonRad = 0;
bool refSet = false;
const float MIN_DIST_M = 3.0;
double lastX = 0, lastY = 0;
bool lastXYSet = false;

double surfaceHa = 0.0;
bool surfaceFromGPS = false;

static inline double deg2rad(double d) { return d * M_PI / 180.0; }

void latLonToMeters(double latDeg, double lonDeg, double &x, double &y) {
  const double R = 6371000.0;
  double lat = deg2rad(latDeg);
  double lon = deg2rad(lonDeg);
  if (!refSet) { refLatRad = lat; refLonRad = lon; refSet = true; }
  x = (lon - refLonRad) * cos(refLatRad) * R;
  y = (lat - refLatRad) * R;
}

double dist2D(double x1, double y1, double x2, double y2) {
  double dx = x2 - x1, dy = y2 - y1;
  return sqrt(dx * dx + dy * dy);
}

double polygonAreaM2() {
  if (pointCount < 3) return 0.0;
  double sum = 0.0;
  for (int i = 0; i < pointCount; i++) {
    int j = (i + 1) % pointCount;
    sum += xs[i] * ys[j] - xs[j] * ys[i];
  }
  return fabs(sum) * 0.5;
}

void startAreaRecording() {
  pointCount = 0; refSet = false; lastXYSet = false;
  areaRecording = true;
  Serial.println("SURFACE GPS: START");
}

void stopAreaRecordingAndPrint() {
  areaRecording = false;
  double areaM2 = polygonAreaM2();
  surfaceHa = areaM2 / 10000.0;
  surfaceFromGPS = true;
  Serial.print("SURFACE GPS: "); Serial.print(areaM2, 1); Serial.print(" m2 = ");
  Serial.print(surfaceHa, 4); Serial.println(" ha");
}

void setSurfaceHa(float ha) {
  surfaceHa = ha; surfaceFromGPS = false;
  Serial.print("SURFACE: "); Serial.print(surfaceHa, 4); Serial.println(" ha");
}

void setSurfaceM2(float m2) {
  surfaceHa = m2 / 10000.0; surfaceFromGPS = false;
}

void setSurfaceDim(float longueur, float largeur) {
  float m2 = longueur * largeur;
  surfaceHa = m2 / 10000.0; surfaceFromGPS = false;
}

void handleCommand(String cmd) {
  cmd.trim();
  if (cmd == "start") { startAreaRecording(); return; }
  if (cmd == "stop")  { stopAreaRecordingAndPrint(); return; }
  if (cmd == "resetvol") { total1_L = 0; total2_L = 0; Serial.println("VOLUMES: 0"); return; }
  if (cmd == "reset") { total1_L = 0; total2_L = 0; surfaceHa = 0; Serial.println("RESET OK"); return; }

  if (cmd.startsWith("ha ")) {
    float val = cmd.substring(3).toFloat();
    if (val > 0) setSurfaceHa(val); else Serial.println("ERR: ha 2.5");
    return;
  }
  if (cmd.startsWith("m2 ")) {
    float val = cmd.substring(3).toFloat();
    if (val > 0) setSurfaceM2(val); else Serial.println("ERR: m2 25000");
    return;
  }
  if (cmd.startsWith("dim ")) {
    String p = cmd.substring(4);
    int si = p.indexOf(' ');
    if (si > 0) {
      float L = p.substring(0, si).toFloat();
      float l = p.substring(si + 1).toFloat();
      if (L > 0 && l > 0) setSurfaceDim(L, l); else Serial.println("ERR: dim 100 250");
    } else Serial.println("ERR: dim 100 250");
    return;
  }

  if (cmd == "help") {
    Serial.println("══════════════════════════════════");
    Serial.println("  ha 2.5      -> 2.5 hectares");
    Serial.println("  m2 25000    -> 25000 m2");
    Serial.println("  dim 100 250 -> 100m x 250m");
    Serial.println("  start/stop  -> GPS polygon");
    Serial.println("  resetvol    -> volumes a 0");
    Serial.println("  reset       -> tout a 0");
    Serial.println("══════════════════════════════════");
    return;
  }
  Serial.println("? tape 'help'");
}

String gpsTimeStr() {
  if (!gps.date.isValid() || !gps.time.isValid()) return "NO_TIME";
  int h = gps.time.hour() + TZ_HOURS;
  if (h >= 24) h -= 24; if (h < 0) h += 24;
  char buf[22];
  snprintf(buf, sizeof(buf), "%04d-%02d-%02d %02d:%02d:%02d",
    gps.date.year(), gps.date.month(), gps.date.day(),
    h, gps.time.minute(), gps.time.second());
  return String(buf);
}

// ===================== GRAPHIQUES TFT — WHITE THEME =====================

void drawPill(int x, int y, int w, int h, uint16_t bg, uint16_t txt, const char* label) {
  tft.fillRoundRect(x, y, w, h, h / 2, bg);
  int textW = strlen(label) * 6;
  tft.setCursor(x + (w - textW) / 2, y + (h - 7) / 2);
  tft.setTextColor(txt);
  tft.print(label);
}

void drawSignalBars(int x, int y, int sats) {
  int level = sats >= 8 ? 4 : sats >= 6 ? 3 : sats >= 4 ? 2 : sats >= 1 ? 1 : 0;
  for (int i = 0; i < 4; i++) {
    int barH = 2 + i * 2;
    tft.fillRect(x + i * 4, y + 8 - barH, 2, barH, (i < level) ? C_ACCENT : C_DIVIDER);
  }
}

void drawFlowBar(int x, int y, int w, float value, float maxVal, uint16_t trackColor, uint16_t fillColor) {
  int barW = (int)((value / maxVal) * w);
  if (barW > w) barW = w;
  tft.fillRoundRect(x, y, w, 3, 1, trackColor);
  if (barW > 1) tft.fillRoundRect(x, y, barW, 3, 1, fillColor);
}

void drawDropIcon(int x, int y, uint16_t color) {
  tft.fillTriangle(x, y - 3, x - 2, y + 1, x + 2, y + 1, color);
  tft.fillCircle(x, y + 1, 2, color);
}

void drawWifiIcon(int x, int y, bool connected) {
  uint16_t c = connected ? C_ACCENT : C_RED;
  tft.drawPixel(x, y - 4, c);
  tft.drawFastHLine(x - 1, y - 3, 3, c);
  tft.drawFastHLine(x - 2, y - 2, 5, c);
  tft.fillRect(x - 1, y, 3, 2, c);
}

void drawMiniLeaf(int x, int y, uint16_t c) {
  tft.fillRect(x, y, 5, 5, c);
  tft.fillRect(x + 2, y - 2, 3, 3, c);
  tft.fillRect(x + 3, y - 3, 2, 2, c);
}

void drawTFT() {
  tft.fillScreen(C_BG);

  // ── HEADER: Deep teal bar ──
  tft.fillRect(0, 0, 160, 19, C_HEADER_BG);

  drawMiniLeaf(4, 4, C_ACCENT);

  tft.setTextSize(1);
  tft.setCursor(12, 6);
  tft.setTextColor(C_WHITE); tft.print("LEAD");
  tft.setTextColor(C_ACCENT); tft.print("FARM");

  drawWifiIcon(60, 10, WiFi.status() == WL_CONNECTED);

  if (gps.time.isValid()) {
    char tb[6];
    int h = gps.time.hour() + TZ_HOURS;
    if (h >= 24) h -= 24; if (h < 0) h += 24;
    snprintf(tb, sizeof(tb), "%02d:%02d", h, gps.time.minute());
    tft.setCursor(100, 6);
    tft.setTextColor(0xB6DA);
    tft.print(tb);
  }

  bool sysOk = (gpsTotalChars > 10 || flow1_Lmin > 0 || flow2_Lmin > 0);
  tft.fillCircle(152, 9, 3, sysOk ? C_ACCENT : C_RED);

  tft.drawFastHLine(0, 19, 160, C_ACCENT);

  // ── CARD 1: GPS Position ──
  tft.fillRoundRect(3, 23, 154, 26, 4, C_CARD);
  tft.drawRoundRect(3, 23, 154, 26, 4, C_CARD_BRD);

  tft.fillCircle(12, 30, 3, gps.location.isValid() ? C_ACCENT : C_RED);
  tft.fillCircle(12, 30, 1, C_CARD);
  tft.fillTriangle(10, 32, 14, 32, 12, 35, gps.location.isValid() ? C_ACCENT : C_RED);

  tft.setCursor(19, 26); tft.setTextColor(C_TEXT_SEC); tft.print("Position");

  if (gps.location.isValid()) {
    drawPill(108, 25, 44, 10, C_GREEN_BG, C_ACCENT_DK, "ACTIF");
    tft.setCursor(8, 38); tft.setTextColor(C_TEXT);
    tft.print(gps.location.lat(), 4);
    tft.setTextColor(C_TEXT_TER); tft.print(", ");
    tft.setTextColor(C_TEXT); tft.print(gps.location.lng(), 4);
    if (gps.speed.isValid()) {
      tft.setCursor(118, 38); tft.setTextColor(C_TEXT_SEC);
      tft.print(gps.speed.kmph(), 0); tft.print("k");
    }
    int sats = gps.satellites.isValid() ? gps.satellites.value() : 0;
    drawSignalBars(104, 36, sats);
  } else {
    drawPill(105, 25, 48, 10, C_RED_BG, C_RED, "INACTIF");
    tft.setCursor(8, 38); tft.setTextColor(C_TEXT_TER); tft.print("Recherche...");
  }

  // ── CARD 2: Debit 1 (Water blue theme) ──
  bool d1 = (flow1_Lmin > 0.1);
  tft.fillRoundRect(3, 52, 154, 24, 4, C_CARD);
  tft.drawRoundRect(3, 52, 154, 24, 4, C_CARD_BRD);
  tft.fillRoundRect(3, 52, 3, 24, 1, C_CYAN);

  drawDropIcon(12, 59, d1 ? C_CYAN : C_TEXT_TER);
  tft.setCursor(18, 55); tft.setTextColor(C_TEXT_SEC); tft.print("Debit 1");

  if (d1) {
    drawPill(108, 54, 44, 10, C_CYAN_LT, C_CYAN, "ACTIF");
  } else {
    drawPill(108, 54, 44, 10, C_RED_BG, C_RED, "ARRET");
  }

  tft.setCursor(10, 65); tft.setTextColor(C_CYAN);
  tft.print(flow1_Lmin, 1);
  tft.setTextColor(C_TEXT_TER); tft.print(" L/m");

  tft.setCursor(76, 65); tft.setTextColor(C_TEXT_TER); tft.print("Vol ");
  tft.setTextColor(C_TEXT); tft.print(total1_L, 1);
  tft.setTextColor(C_TEXT_TER); tft.print("L");

  drawFlowBar(10, 73, 142, flow1_Lmin, 5.0, C_DIVIDER, C_CYAN);

  // ── CARD 3: Debit 2 (Orange theme) ──
  bool d2 = (flow2_Lmin > 0.1);
  tft.fillRoundRect(3, 79, 154, 24, 4, C_CARD);
  tft.drawRoundRect(3, 79, 154, 24, 4, C_CARD_BRD);
  tft.fillRoundRect(3, 79, 3, 24, 1, C_ORANGE);

  drawDropIcon(12, 86, d2 ? C_ORANGE : C_TEXT_TER);
  tft.setCursor(18, 82); tft.setTextColor(C_TEXT_SEC); tft.print("Debit 2");

  if (d2) {
    drawPill(108, 81, 44, 10, C_ORNG_LT, C_ORANGE, "ACTIF");
  } else {
    drawPill(108, 81, 44, 10, C_RED_BG, C_RED, "ARRET");
  }

  tft.setCursor(10, 92); tft.setTextColor(C_ORANGE);
  tft.print(flow2_Lmin, 1);
  tft.setTextColor(C_TEXT_TER); tft.print(" L/m");

  tft.setCursor(76, 92); tft.setTextColor(C_TEXT_TER); tft.print("Vol ");
  tft.setTextColor(C_TEXT); tft.print(total2_L, 1);
  tft.setTextColor(C_TEXT_TER); tft.print("L");

  drawFlowBar(10, 100, 142, flow2_Lmin, 5.0, C_DIVIDER, C_ORANGE);

  // ── CARD 4: Surface + L/ha (split card) ──
  tft.fillRoundRect(3, 106, 154, 22, 4, C_CARD);
  tft.drawRoundRect(3, 106, 154, 22, 4, C_CARD_BRD);

  float totalVol = total1_L + total2_L;
  float lPerHa = (surfaceHa > 0.001) ? totalVol / surfaceHa : 0.0;

  tft.setCursor(8, 109); tft.setTextColor(C_TEXT_SEC); tft.print("Surface");
  if (surfaceHa > 0.001) {
    tft.setCursor(52, 109); tft.setTextColor(C_TEXT_TER);
    tft.print(surfaceFromGPS ? "(GPS)" : "(man)");
  }
  tft.setCursor(8, 119);
  if (surfaceHa > 0.001) {
    tft.setTextColor(C_ACCENT); tft.print(surfaceHa, 2);
    tft.setTextColor(C_TEXT_SEC); tft.print(" ha");
  } else {
    tft.setTextColor(C_TEXT_TER); tft.print("-- ha");
  }

  tft.drawFastVLine(80, 109, 16, C_DIVIDER);

  tft.setCursor(86, 109); tft.setTextColor(C_TEXT_SEC); tft.print("Dose/ha");
  tft.setCursor(86, 119);
  if (lPerHa > 0.1) {
    tft.setTextColor(C_ORANGE); tft.print(lPerHa, 1);
    tft.setTextColor(C_TEXT_SEC); tft.print(" L/ha");
  } else {
    tft.setTextColor(C_TEXT_TER); tft.print("-- L/ha");
  }
}

// ===================== WIFI =====================
void setupWiFi() {
  Serial.print("WiFi: Connexion a ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("WiFi: OK IP = ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi: ECHEC - retry en arriere-plan");
  }
}

void queuePayload(const char* json) {
  prefs.begin(QUEUE_NS, false);
  int count = prefs.getInt("count", 0);
  if (count >= MAX_QUEUE) count = MAX_QUEUE - 1;
  char key[8];
  snprintf(key, sizeof(key), "p%d", count);
  prefs.putString(key, json);
  prefs.putInt("count", count + 1);
  prefs.end();
  Serial.println("QUEUE: payload buffered");
}

bool flushQueue() {
  if (WiFi.status() != WL_CONNECTED) return false;
  prefs.begin(QUEUE_NS, false);
  int count = prefs.getInt("count", 0);
  bool sentAny = false;
  for (int i = 0; i < count; i++) {
    char key[8];
    snprintf(key, sizeof(key), "p%d", i);
    String payload = prefs.getString(key, "");
    if (payload.length() == 0) continue;

    HTTPClient http;
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-key", DEVICE_KEY);
    int code = http.POST(payload);
    http.end();
    if (code == 200) sentAny = true;
    else break;
  }
  if (sentAny) {
    prefs.clear();
    prefs.putInt("count", 0);
  }
  prefs.end();
  return sentAny;
}

void sendToAPI() {
  flushQueue();

  if (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    return;
  }

  char json[512];
  snprintf(json, sizeof(json),
    "{"
    "\"device_id\":\"%s\","
    "\"flow1\":%.2f,"
    "\"flow2\":%.2f,"
    "\"vol1\":%.3f,"
    "\"vol2\":%.3f,"
    "\"lat\":%.6f,"
    "\"lon\":%.6f,"
    "\"speed\":%.2f,"
    "\"hdop\":%.1f,"
    "\"sats\":%d,"
    "\"area_m2\":%.1f,"
    "\"timestamp\":\"%s\""
    "}",
    DEVICE_ID,
    flow1_Lmin, flow2_Lmin,
    total1_L, total2_L,
    gps.location.isValid() ? gps.location.lat() : 0.0,
    gps.location.isValid() ? gps.location.lng() : 0.0,
    gps.speed.isValid() ? gps.speed.kmph() : 0.0,
    gps.hdop.isValid() ? gps.hdop.hdop() : 99.9,
    gps.satellites.isValid() ? (int)gps.satellites.value() : 0,
    polygonAreaM2(),
    gpsTimeStr().c_str()
  );

  HTTPClient http;
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);
  int httpCode = http.POST(json);

  if (httpCode == 200) {
    Serial.println("API: OK");
  } else {
    Serial.print("API: ERR ");
    Serial.println(httpCode);
    queuePayload(json);
  }
  http.end();
}

// ===================== SETUP =====================
void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(FLOW1_PIN, INPUT_PULLUP);
  pinMode(FLOW2_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW1_PIN), isrFlow1, FALLING);
  attachInterrupt(digitalPinToInterrupt(FLOW2_PIN), isrFlow2, FALLING);

  GPSSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX, GPS_TX);

  tft.initR(INITR_BLACKTAB);
  tft.setRotation(1);
  tft.fillScreen(C_BG);

  // ── SPLASH ──
  tft.fillScreen(C_BG);

  tft.fillRoundRect(62, 15, 36, 36, 8, C_ACCENT);
  tft.fillRect(72, 22, 16, 16, C_WHITE);
  tft.fillRect(76, 18, 10, 10, C_WHITE);
  tft.fillRect(79, 15, 5, 6, C_WHITE);
  tft.fillRect(74, 24, 12, 12, C_ACCENT);
  tft.fillRect(77, 20, 8, 8, C_ACCENT);
  tft.fillRect(80, 16, 4, 5, C_ACCENT);

  tft.setTextSize(2);
  tft.setCursor(22, 60);
  tft.setTextColor(C_TEXT); tft.print("Lead");
  tft.setTextColor(C_ACCENT); tft.print("Farm");

  tft.setTextSize(1);
  tft.setCursor(20, 82);
  tft.setTextColor(C_TEXT_SEC);
  tft.print("Precision Agri-IoT");

  tft.drawFastHLine(30, 95, 100, C_DIVIDER);

  for (int i = 0; i <= 100; i += 5) {
    tft.fillRoundRect(30, 102, 100, 4, 2, C_DIVIDER);
    tft.fillRoundRect(30, 102, i, 4, 2, C_ACCENT);
    delay(20);
  }

  tft.setCursor(48, 112);
  tft.setTextColor(C_TEXT_TER);
  tft.print("Starting...");
  delay(400);

  setupWiFi();
  drawTFT();

  Serial.println("══════════════════════════════════");
  Serial.println("  LeadFarm - Precision Agri-IoT");
  Serial.print("  WiFi: "); Serial.println(WiFi.status() == WL_CONNECTED ? "OK" : "ECHEC");
  Serial.println("  Tape 'help' pour commandes");
  Serial.println("══════════════════════════════════");

  lastFlowCalcMs = millis();
  lastSendMs = millis();
  lastTftMs = millis();
  lastReportMs = millis();
}

// ===================== LOOP =====================
void loop() {
  while (GPSSerial.available()) {
    char c = GPSSerial.read();
    gpsTotalChars++;
    gpsLastCharMs = millis();
    gps.encode(c);
  }

  unsigned long now = millis();

  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    handleCommand(cmd);
  }

  // Flow calc every 1s
  if (now - lastFlowCalcMs >= 1000) {
    noInterrupts();
    unsigned long p1 = pulses1; pulses1 = 0;
    unsigned long p2 = pulses2; pulses2 = 0;
    interrupts();

    float l1 = (float)p1 / PULSES_PER_LITER_1;
    float l2 = (float)p2 / PULSES_PER_LITER_2;
    flow1_Lmin = l1 * 60.0;
    flow2_Lmin = l2 * 60.0;
    if (flow1_Lmin < FLOW_THRESHOLD) { flow1_Lmin = 0.0; l1 = 0.0; }
    if (flow2_Lmin < FLOW_THRESHOLD) { flow2_Lmin = 0.0; l2 = 0.0; }
    total1_L += l1;
    total2_L += l2;
    lastFlowCalcMs = now;
  }

  // Serial report every 1s
  if (now - lastReportMs >= 1000) {
    lastReportMs = now;
    Serial.print("D1:"); Serial.print(flow1_Lmin, 2); Serial.print(" ");
    Serial.print("V1:"); Serial.print(total1_L, 3); Serial.print(" | ");
    Serial.print("D2:"); Serial.print(flow2_Lmin, 2); Serial.print(" ");
    Serial.print("V2:"); Serial.print(total2_L, 3); Serial.print(" | ");
    Serial.print("S:"); Serial.print(surfaceHa, 3); Serial.print("ha");

    if (gps.location.isValid()) {
      Serial.print(" GPS:"); Serial.print(gps.location.lat(), 6);
      Serial.print(","); Serial.print(gps.location.lng(), 6);
      Serial.print(" Sat:"); Serial.print(gps.satellites.value());
    }
    Serial.print(" WiFi:"); Serial.print(WiFi.status() == WL_CONNECTED ? "OK" : "NO");
    Serial.print(" GPS-chars:"); Serial.print(gpsTotalChars);
    Serial.print(" Fix:"); Serial.println(gps.location.isValid() ? "YES" : "NO");
  }

  // GPS surface recording
  if (areaRecording && gps.location.isValid() && gps.hdop.isValid() && gps.hdop.hdop() < 3.0) {
    double x, y;
    latLonToMeters(gps.location.lat(), gps.location.lng(), x, y);
    if (!lastXYSet) {
      lastX = x; lastY = y; lastXYSet = true;
      if (pointCount < MAX_POINTS) { xs[pointCount] = x; ys[pointCount] = y; pointCount++; }
    } else {
      double d = dist2D(lastX, lastY, x, y);
      if (d >= MIN_DIST_M && pointCount < MAX_POINTS) {
        xs[pointCount] = x; ys[pointCount] = y; pointCount++;
        lastX = x; lastY = y;
      }
    }
  }

  // Send to API every 10s
  if (now - lastSendMs >= SEND_INTERVAL_MS) {
    sendToAPI();
    lastSendMs = now;
  }

  // TFT refresh
  if (now - lastTftMs >= TFT_INTERVAL_MS) {
    drawTFT();
    lastTftMs = now;
  }
}
