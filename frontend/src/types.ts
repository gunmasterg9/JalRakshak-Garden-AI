export interface Plant {
  id: number;
  name: string;
  species: string;
  photo_path: string;
  location: string;
  planting_date: string;
  soil_type: string;
  sunlight: string;
  container_type: string;
  age_months: number;
  watering_preference: string;
  notes: string;
  created_at: string;
  updated_at: string;
  watering_history?: WateringLogItem[];
  journal_entries?: JournalEntry[];
  diagnoses?: DiagnosisItem[];
}

export interface WateringLogItem {
  id: number;
  plant_id: number;
  watered_at: string;
  amount_ml: number;
  method: string;
  notes: string;
}

export interface JournalEntry {
  id: number;
  plant_id: number | null;
  plant_name?: string;
  entry_type: 'note' | 'watering' | 'fertilizer' | 'growth' | 'pest' | 'flowering';
  title: string;
  note: string;
  photo_path?: string;
  moisture?: string;
  recommendation?: string;
  created_at: string;
}

export interface Mission {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration_minutes: number;
  outdoor_required: number;
}

export interface DailyMissionResponse {
  mission: Mission | null;
  completed: boolean;
  streak: number;
  date: string;
}

export interface Badge {
  name: string;
  icon: string;
  description: string;
}

export interface WaterPlan {
  title: string;
  summary: string;
  timing: string;
  amount: string;
  water_today?: 'yes' | 'no' | 'check';
  suggested_time?: string;
  checklist: string[];
  watch_for: string;
  explanation?: string;
  source?: string;
  confidence?: string;
  ai_note?: string;
}

export interface DiagnosisItem {
  id?: number;
  plant_identification: string;
  observed_symptoms: string;
  possible_causes: string;
  confidence: string;
  recommended_actions: string;
  watering_advice: string;
  prevention_tips: string;
  needs_expert_review: boolean;
  source?: string;
  vision_note?: string;
  raw_text?: string;
}

export interface AppSettings {
  language: 'en' | 'gu' | 'hi';
  region: string;
  temperature_unit: 'celsius' | 'fahrenheit';
  date_format: string;
  ollama_model: string;
  theme: string;
}

export interface HealthStatus {
  ok: boolean;
  app: string;
  version: string;
  privacy: string;
  storage: string;
  ollama_available: boolean;
  model: string;
  model_installed: boolean;
  installed_models: string[];
}

export interface PumpStatus {
  pump_on: boolean;
  runtime_seconds: number;
  remaining_seconds: number;
  cooldown_remaining_seconds: number;
  emergency_locked: boolean;
  max_runtime_limit: number;
}

export interface CalibrationData {
  device_id: string;
  dry_value: number;
  wet_value: number;
  status: string;
  updated_at: string;
}

export interface IoTDevice {
  device_id: string;
  name: string;
  device_type: string;
  ip_address: string;
  status: string;
  mode: string;
  pump_state: number;
  last_seen: string | null;
  config_json?: string;
  created_at: string;
  updated_at: string;
  live_status: 'online' | 'delayed' | 'offline';
  pump_status: PumpStatus;
  calibration?: CalibrationData;
  latest_sensors?: Array<{ sensor_type: string; value: number; unit: string; timestamp: string; is_simulated: number }>;
  latest_soil?: { moisture_percent: number; raw_adc: number; timestamp: string; is_simulated: number } | null;
}

export interface IoTSensorHistory {
  device_id: string;
  time_range: string;
  readings_count: number;
  sensor_data: Array<{
    timestamp: string;
    sensor_type: string;
    value: number;
    unit: string;
    is_simulated: number;
  }>;
  soil_data: Array<{
    timestamp: string;
    moisture_percent: number;
    raw_adc: number;
    is_simulated: number;
  }>;
  pump_events: Array<{
    timestamp: string;
    action: string;
    runtime_seconds: number;
    estimated_liters: number;
    trigger_source: string;
    reason: string;
  }>;
}

export interface IoTRecommendation {
  recommendation: 'WATER_NOW' | 'CHECK_SOIL' | 'WAIT' | 'DO_NOT_WATER';
  why: string;
  evidence: {
    soil_moisture: string;
    temperature: string;
    humidity: string;
    water_level: string;
    target_range: string;
    last_watering: string;
    drying_drop: string;
  };
  confidence: number;
  action: string;
  plant_info: {
    canonical_name: string;
    name_gu: string;
    name_hi: string;
    soil_moisture_target_min: number;
    soil_moisture_target_max: number;
    water_depth: string;
    care_notes: string;
  };
  source: string;
  is_simulated: boolean;
  device_id: string;
  ai_explanation?: string;
}

export interface GardenAnalytics {
  device_id: string;
  drying_rate: {
    drying_rate_percent_per_hour: number;
    total_drop_observed?: number;
    drying_hours_observed?: number;
    samples_analyzed: number;
    status: string;
    trend: string;
  };
  watering_effectiveness: {
    average_recovery_percent: number;
    average_pump_runtime_seconds: number;
    events_analyzed: number;
    efficiency: string;
  };
  water_savings: {
    days_window: number;
    is_measured: boolean;
    measurement_type: string;
    water_used_liters: number;
    traditional_benchmark_liters: number;
    water_saved_liters: number;
    water_savings_percent: number;
    total_pump_activations: number;
    total_pump_runtime_seconds: number;
  };
}

export interface IoTAlert {
  id: number;
  device_id: string | null;
  plant_id: number | null;
  severity: 'critical' | 'warning' | 'info';
  alert_type: string;
  message: string;
  is_active: number;
  created_at: string;
  resolved_at: string | null;
}

