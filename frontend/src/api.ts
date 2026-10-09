import {
  Plant,
  JournalEntry,
  DailyMissionResponse,
  WaterPlan,
  DiagnosisItem,
  HealthStatus,
  AppSettings,
  Badge,
} from './types';

const API_BASE = ''; // Relative path leverages Vite dev proxy to :8000

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3500) });
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchPlants(search = '', soil = '', sunlight = ''): Promise<Plant[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (soil) params.set('soil_type', soil);
  if (sunlight) params.set('sunlight', sunlight);
  const res = await fetch(`${API_BASE}/api/plants?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load plants');
  return res.json();
}

export async function createPlant(plant: Partial<Plant>): Promise<Plant> {
  const res = await fetch(`${API_BASE}/api/plants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plant),
  });
  if (!res.ok) throw new Error('Failed to create plant');
  return res.json();
}

export async function getPlant(id: number): Promise<Plant> {
  const res = await fetch(`${API_BASE}/api/plants/${id}`);
  if (!res.ok) throw new Error('Plant not found');
  return res.json();
}

export async function updatePlant(id: number, updates: Partial<Plant>): Promise<Plant> {
  const res = await fetch(`${API_BASE}/api/plants/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update plant');
  return res.json();
}

export async function deletePlant(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/plants/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete plant');
}

export async function logWatering(plantId: number, amountMl = 0, method = '', notes = ''): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/plants/${plantId}/water?amount_ml=${amountMl}&method=${encodeURIComponent(method)}&notes=${encodeURIComponent(notes)}`,
    { method: 'POST' }
  );
  if (!res.ok) throw new Error('Failed to log watering');
}

export async function uploadPlantPhoto(plantId: number, file: File): Promise<Plant> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/plants/${plantId}/photo`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload photo');
  return res.json();
}

export async function fetchWaterPlan(gardenInput: any): Promise<WaterPlan> {
  const res = await fetch(`${API_BASE}/api/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(gardenInput),
    signal: AbortSignal.timeout(95000),
  });
  if (!res.ok) throw new Error('Recommendation request failed');
  return res.json();
}

export async function analyzePlantPhoto(input: {
  image_data_url: string;
  plant_id?: number | null;
  plant_context?: string;
  location?: string;
  symptoms?: string;
}): Promise<DiagnosisItem> {
  const res = await fetch(`${API_BASE}/api/analyze-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(95000),
  });
  if (!res.ok) throw new Error('Analysis request failed');
  return res.json();
}

export async function fetchJournal(plantId?: number, entryType?: string): Promise<JournalEntry[]> {
  const params = new URLSearchParams();
  if (plantId) params.set('plant_id', String(plantId));
  if (entryType) params.set('entry_type', entryType);
  const res = await fetch(`${API_BASE}/api/journal?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch journal');
  return res.json();
}

export async function createJournalEntry(entry: Partial<JournalEntry>): Promise<JournalEntry> {
  const res = await fetch(`${API_BASE}/api/journal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error('Failed to create journal entry');
  return res.json();
}

export async function fetchTodayMission(): Promise<DailyMissionResponse> {
  const res = await fetch(`${API_BASE}/api/missions/today`);
  if (!res.ok) throw new Error('Failed to fetch today mission');
  return res.json();
}

export async function completeMission(missionId: number, notes = ''): Promise<DailyMissionResponse> {
  const res = await fetch(`${API_BASE}/api/missions/${missionId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error('Failed to complete mission');
  return res.json();
}

export async function fetchBadges(): Promise<{ badges: Badge[]; total_completions: number }> {
  const res = await fetch(`${API_BASE}/api/missions/badges`);
  if (!res.ok) throw new Error('Failed to fetch badges');
  return res.json();
}

export async function fetchSettings(): Promise<{
  settings: AppSettings;
  ollama: any;
  supported_languages: any[];
  suggested_models: any[];
}> {
  const res = await fetch(`${API_BASE}/api/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<any> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

// ---------------------------------------------------------------------------
// IoT Hardware & Telemetry API Calls
// ---------------------------------------------------------------------------

export async function fetchIoTDevices(): Promise<import('./types').IoTDevice[]> {
  const res = await fetch(`${API_BASE}/api/iot/devices`);
  if (!res.ok) throw new Error('Failed to fetch IoT devices');
  return res.json();
}

export async function fetchIoTDevice(deviceId: string): Promise<import('./types').IoTDevice> {
  const res = await fetch(`${API_BASE}/api/iot/devices/${deviceId}`);
  if (!res.ok) throw new Error('Failed to fetch device details');
  return res.json();
}

export async function fetchDeviceStatus(deviceId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/iot/devices/${deviceId}/status`);
  if (!res.ok) throw new Error('Failed to fetch device status');
  return res.json();
}


export async function sendDeviceCommand(
  deviceId: string,
  command: string,
  runtime_seconds = 30,
  reason = 'Manual UI command'
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/iot/devices/${deviceId}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, runtime_seconds, reason }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to dispatch device command');
  }
  return res.json();
}

export async function fetchSensorHistory(
  deviceId: string,
  range = '24h'
): Promise<import('./types').IoTSensorHistory> {
  const res = await fetch(`${API_BASE}/api/iot/devices/${deviceId}/history?range=${range}`);
  if (!res.ok) throw new Error('Failed to fetch sensor history');
  return res.json();
}

export async function calibrateSoil(
  deviceId: string,
  payload: { step?: string; dry_value?: number; wet_value?: number; raw_reading?: number }
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/iot/devices/${deviceId}/calibrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save calibration');
  return res.json();
}

export async function fetchIoTRecommendation(
  deviceId = 'esp32-garden-01',
  plantName = 'Tomato'
): Promise<import('./types').IoTRecommendation> {
  const res = await fetch(
    `${API_BASE}/api/iot/recommendation?device_id=${encodeURIComponent(deviceId)}&plant_name=${encodeURIComponent(plantName)}`,
    { signal: AbortSignal.timeout(95000) }
  );
  if (!res.ok) throw new Error('Failed to fetch IoT recommendation');
  return res.json();
}

export async function sendGardenChat(
  query: string,
  deviceId = 'esp32-garden-01',
  plantName = 'Tomato',
  language = 'en'
): Promise<{ reply: string; source: string; evidence: any }> {
  const res = await fetch(`${API_BASE}/api/iot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, device_id: deviceId, plant_name: plantName, language }),
    signal: AbortSignal.timeout(95000),
  });
  if (!res.ok) throw new Error('Chat failed');
  return res.json();
}

export async function fetchGardenAnalytics(deviceId = 'esp32-garden-01'): Promise<import('./types').GardenAnalytics> {
  const res = await fetch(`${API_BASE}/api/iot/analytics?device_id=${encodeURIComponent(deviceId)}`);
  if (!res.ok) throw new Error('Failed to fetch garden analytics');
  return res.json();
}

export async function fetchIoTAlerts(activeOnly = true): Promise<import('./types').IoTAlert[]> {
  const res = await fetch(`${API_BASE}/api/iot/alerts?active_only=${activeOnly}`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function resolveIoTAlert(alertId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/api/iot/alerts/${alertId}/resolve`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to resolve alert');
  return res.json();
}

export async function sendDemoTelemetry(
  deviceId = 'esp32-garden-01',
  scenario = 'hot_afternoon'
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/iot/demo/telemetry?device_id=${deviceId}&scenario=${scenario}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to send demo telemetry');
  return res.json();
}

export async function fetchSupportedPlants(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/iot/plants/supported`);
  if (!res.ok) throw new Error('Failed to fetch supported plants');
  return res.json();
}

export async function fetchWeatherForecast(lat = 23.0225, lon = 72.5714): Promise<import('./types').WeatherForecast> {
  const res = await fetch(`${API_BASE}/api/iot/weather?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error('Failed to fetch weather forecast');
  return res.json();
}

export async function fetchPendingProposals(): Promise<import('./types').AutomatedProposal[]> {
  const res = await fetch(`${API_BASE}/api/iot/proposals/pending`);
  if (!res.ok) throw new Error('Failed to fetch proposals');
  return res.json();
}

export async function actionProposal(proposalId: string, approve = true): Promise<any> {
  const res = await fetch(`${API_BASE}/api/iot/proposals/${proposalId}/action?approve=${approve}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to action proposal');
  return res.json();
}

export function getReadingsExportUrl(deviceId = 'esp32-garden-01'): string {
  return `${API_BASE}/api/iot/export/readings.csv?device_id=${encodeURIComponent(deviceId)}`;
}

export function getPumpEventsExportUrl(deviceId = 'esp32-garden-01'): string {
  return `${API_BASE}/api/iot/export/pump_events.csv?device_id=${encodeURIComponent(deviceId)}`;
}

export async function fetchDigitalTwins(): Promise<import('./types').PlantDigitalTwin[]> {
  const res = await fetch(`${API_BASE}/api/iot/digital-twins`);
  if (!res.ok) throw new Error('Failed to fetch digital twins');
  return res.json();
}

export async function fetchSingleDigitalTwin(plantId: string): Promise<import('./types').PlantDigitalTwin> {
  const res = await fetch(`${API_BASE}/api/iot/digital-twins/${encodeURIComponent(plantId)}`);
  if (!res.ok) throw new Error('Failed to fetch digital twin');
  return res.json();
}

export async function fetchGardenZones(): Promise<import('./types').GardenZone[]> {
  const res = await fetch(`${API_BASE}/api/iot/zones`);
  if (!res.ok) throw new Error('Failed to fetch garden zones');
  return res.json();
}

export async function fetchZoneDigitalTwin(zoneId: string): Promise<import('./types').ZoneDigitalTwin> {
  const res = await fetch(`${API_BASE}/api/iot/zones/${encodeURIComponent(zoneId)}`);
  if (!res.ok) throw new Error('Failed to fetch zone digital twin');
  return res.json();
}

export async function fetchGardenMemory(hours = 72, limit = 50): Promise<import('./types').GardenMemoryEvent[]> {
  const res = await fetch(`${API_BASE}/api/iot/memory?hours=${hours}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch garden memory');
  return res.json();
}

export async function recordGardenMemory(payload: {
  event_type: string;
  source: string;
  plant_id?: string;
  zone_id?: string;
  data?: Record<string, any>;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/iot/memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to record garden memory');
  return res.json();
}

export async function fetchDryingCurvesV2(
  deviceId = 'esp32-garden-01',
  days = 7
): Promise<import('./types').DryingCurvesV2> {
  const res = await fetch(`${API_BASE}/api/iot/drying-curves?device_id=${encodeURIComponent(deviceId)}&days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch drying curves v2');
  return res.json();
}

export async function fetchPredictiveWatering(
  deviceId = 'esp32-garden-01',
  plantName = 'Tomato'
): Promise<import('./types').PredictiveWatering> {
  const res = await fetch(
    `${API_BASE}/api/iot/predictive-watering?device_id=${encodeURIComponent(deviceId)}&plant_name=${encodeURIComponent(plantName)}`
  );
  if (!res.ok) throw new Error('Failed to fetch predictive watering');
  return res.json();
}

export async function fetchAdaptiveDuration(
  deviceId = 'esp32-garden-01',
  plantName = 'Tomato',
  currentMoisture?: number
): Promise<import('./types').AdaptiveDuration> {
  const q = currentMoisture !== undefined ? `&current_moisture=${currentMoisture}` : '';
  const res = await fetch(
    `${API_BASE}/api/iot/adaptive-duration?device_id=${encodeURIComponent(deviceId)}&plant_name=${encodeURIComponent(plantName)}${q}`
  );
  if (!res.ok) throw new Error('Failed to fetch adaptive duration');
  return res.json();
}

export async function fetchFlowIntelligence(
  deviceId?: string,
  days = 30
): Promise<import('./types').FlowIntelligence> {
  const devParam = deviceId ? `?device_id=${encodeURIComponent(deviceId)}&days=${days}` : `?days=${days}`;
  const res = await fetch(`${API_BASE}/api/iot/flow-intelligence${devParam}`);
  if (!res.ok) throw new Error('Failed to fetch flow intelligence');
  return res.json();
}

export async function fetchWaterBudget(): Promise<import('./types').WaterBudget> {
  const res = await fetch(`${API_BASE}/api/iot/water-budget`);
  if (!res.ok) throw new Error('Failed to fetch water budget');
  return res.json();
}

export async function updateWaterBudget(targetLiters: number): Promise<any> {
  const res = await fetch(`${API_BASE}/api/iot/water-budget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_liters: targetLiters }),
  });
  if (!res.ok) throw new Error('Failed to update water budget');
  return res.json();
}

export async function fetchMicroclimateMap(): Promise<import('./types').MicroclimateMap> {
  const res = await fetch(`${API_BASE}/api/iot/microclimate`);
  if (!res.ok) throw new Error('Failed to fetch microclimate map');
  return res.json();
}

export async function fetchDeviceDiagnostics(deviceId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/iot/devices/${encodeURIComponent(deviceId)}/diagnostics`);
  if (!res.ok) throw new Error('Failed to fetch device diagnostics');
  return res.json();
}



