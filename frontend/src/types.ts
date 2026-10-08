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

export interface WeatherForecast {
  source: string;
  latitude: number;
  longitude: number;
  current: {
    temperature_c: number;
    humidity_percent: number;
    precipitation_mm: number;
    wind_speed_kmh: number;
    weather_code: number;
  };
  rain_guard: {
    active: boolean;
    expected_rain_mm: number;
    max_probability_percent: number;
    advisory: string;
  };
  heatwave_warning: boolean;
  updated_at: string;
}

export interface AutomatedProposal {
  id: string;
  device_id: string;
  plant_name: string;
  duration_seconds: number;
  reason: string;
  created_at: string;
}

export interface PlantDigitalTwin {
  plant_id: string;
  name: string;
  zone_id: string;
  device_id: string;
  species: string;
  name_gu: string;
  name_hi: string;
  soil_type: string;
  sunlight_hours: number;
  current_moisture: number;
  target_moisture_min: number;
  target_moisture_max: number;
  health_score: number;
  water_stress: 'low' | 'moderate' | 'high' | 'overwatered';
  heat_stress: 'low' | 'moderate' | 'high';
  drying_rate: number;
  last_watered: string;
  total_water_used_liters: number;
  care_notes: string;
  water_depth: string;
  last_updated: string;
}

export interface GardenZone {
  zone_id: string;
  name: string;
  description: string;
  device_id: string;
  valve_channel: number;
  target_budget_weekly_liters: number;
}

export interface ZoneDigitalTwin {
  zone_id: string;
  name: string;
  description: string;
  device_id: string;
  valve_channel: number;
  target_budget_weekly_liters: number;
  plant_count: number;
  average_moisture: number;
  average_health_score: number;
  average_drying_rate: number;
  plants: string[];
  last_updated: string;
}

export interface GardenMemoryEvent {
  id: number;
  timestamp: string;
  plant_id: string | null;
  zone_id: string | null;
  event_type: string;
  source: 'SENSOR' | 'USER' | 'AI' | 'SYSTEM' | 'WEATHER';
  data: Record<string, any>;
}

export interface DryingCurvesV2 {
  device_id: string;
  days_analyzed: number;
  sample_count: number;
  condition_rates: {
    morning_drying_rate: number;
    afternoon_drying_rate: number;
    night_drying_rate: number;
    hot_day_drying_rate: number;
    humid_day_drying_rate: number;
    rainy_day_drying_rate: number;
  };
  primary_peak_drying_window: string;
  minimal_evaporation_window: string;
  status: string;
}

export interface PredictiveWatering {
  device_id: string;
  plant_name: string;
  status: 'critical_now' | 'predicting' | 'insufficient_data';
  current_moisture: number | null;
  target_threshold: number | null;
  critical_threshold: number | null;
  hours_until_critical: number | null;
  predicted_critical_time: string | null;
  prediction_confidence: 'high' | 'medium' | 'insufficient_data';
  recommended_watering_window: string;
  predicted_moisture_in_2h?: number;
  predicted_moisture_in_4h?: number;
  predicted_moisture_in_8h?: number;
  drying_rate_applied?: number;
  message?: string;
}

export interface AdaptiveDuration {
  device_id: string;
  plant_name: string;
  current_moisture: number;
  target_sweet_spot: number;
  needed_moisture_increase: number;
  learned_recovery_percent_per_second: number;
  recommended_duration_seconds: number;
  estimated_liters_delivered: number;
  confidence: string;
  historical_events_analyzed: number;
  hardware_max_safety_limit: number;
}

export interface FlowIntelligence {
  days_analyzed: number;
  primary_source: 'MEASURED' | 'ESTIMATED' | 'UNKNOWN';
  measured_liters: number;
  estimated_liters: number;
  total_water_liters: number;
  measured_events_count: number;
  estimated_events_count: number;
  average_liters_per_watering: number;
  daily_average_liters: number;
  weekly_projected_liters: number;
}

export interface WaterBudget {
  period_type: string;
  target_liters: number;
  consumed_liters: number;
  remaining_liters: number;
  percent_consumed: number;
  status: 'NORMAL' | 'WATCH' | 'OVER_BUDGET';
  advisory: string;
  as_of: string;
}

export interface MicroclimateNode {
  device_id: string;
  name: string;
  zone_id: string;
  zone_name: string;
  exposure: string;
  temperature_c: number;
  humidity_percent: number;
  soil_moisture_percent: number;
  drying_rate_percent_per_hour: number;
  status: string;
}

export interface MicroclimateMap {
  nodes: MicroclimateNode[];
  node_count: number;
  temperature_divergence_c: number;
  humidity_divergence_percent: number;
  hotspot_zone: string;
  sheltered_zone: string;
  divergence_summary: string;
  timestamp: string;
}



