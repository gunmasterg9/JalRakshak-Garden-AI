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

