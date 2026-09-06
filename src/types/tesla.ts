// Tipos de datos para Tesla Local Stats

export type VehicleStateEnum = 'asleep' | 'online' | 'driving' | 'charging' | 'offline';

export interface Vehicle {
  id: string;
  vehicle_id: number;
  vin: string;
  display_name: string;
  model: 'Model 3' | 'Model Y' | 'Model S' | 'Model X' | 'Cybertruck' | string;
  trim: string;
  battery_capacity_kwh: number;
  color: string;
  car_version: string;
  odometer: number;
  is_selected?: boolean;
}

export interface VehicleTelemetry {
  timestamp: number;
  state: VehicleStateEnum;
  battery_level: number; // %
  usable_battery_level: number; // %
  battery_range_km: number;
  est_battery_range_km: number;
  charge_energy_added: number; // kWh
  charger_power: number; // kW
  charger_voltage: number; // V
  charger_actual_current: number; // A
  charging_state: 'Charging' | 'Complete' | 'Stopped' | 'Disconnected' | string;
  time_to_full_charge: number; // Hours
  latitude: number;
  longitude: number;
  heading: number;
  speed_kmh: number;
  power_kw: number; // Negative for regen, positive for acceleration
  shift_state: 'P' | 'D' | 'R' | 'N' | null;
  inside_temp: number; // °C
  outside_temp: number; // °C
  is_climate_on: boolean;
  locked: boolean;
  sentry_mode: boolean;
  valet_mode: boolean;
  doors_open: {
    df: boolean;
    dr: boolean;
    pf: boolean;
    pr: boolean;
    ft: boolean; // Frunk
    rt: boolean; // Trunk
  };
}

export interface DriveRecord {
  id?: number;
  vehicle_id: string;
  start_time: number;
  end_time: number;
  start_address: string;
  end_address: string;
  distance_km: number;
  duration_minutes: number;
  energy_used_kwh: number;
  consumption_wh_km: number;
  start_soc: number;
  end_soc: number;
  speed_avg_kmh: number;
  speed_max_kmh: number;
  power_max_kw: number;
  power_min_kw: number; // Max regen
  outside_temp_avg: number;
  is_favorite?: boolean;
  name?: string;
}

export interface DrivePoint {
  id?: number;
  drive_id: number;
  timestamp: number;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  power_kw: number;
  battery_level: number;
  elevation_m: number;
  heading: number;
}

export interface ChargeRecord {
  id?: number;
  vehicle_id: string;
  start_time: number;
  end_time: number;
  location: string;
  energy_added_kwh: number;
  start_soc: number;
  end_soc: number;
  duration_minutes: number;
  max_power_kw: number;
  charger_type: 'Supercharger' | 'Destination' | 'Home (AC)' | 'Public AC' | string;
  cost_eur?: number;
  cost_per_kwh?: number;
}

export interface ChargePoint {
  id?: number;
  charge_id: number;
  timestamp: number;
  battery_level: number;
  charger_power_kw: number;
  charger_voltage: number;
  charger_actual_current: number;
}

export interface VampireDrainRecord {
  id?: number;
  vehicle_id: string;
  start_time: number;
  end_time: number;
  duration_hours: number;
  start_soc: number;
  end_soc: number;
  loss_soc: number;
  loss_kwh: number;
  loss_km: number;
  outside_temp_avg: number;
}

export interface BatteryHealthRecord {
  id?: number;
  vehicle_id: string;
  date: string;
  odometer_km: number;
  nominal_full_pack_kwh: number;
  original_capacity_kwh: number;
  degradation_percent: number;
  max_range_100_percent_km: number;
}

export interface SavedRoute {
  id?: number;
  name: string;
  description?: string;
  created_at: number;
  distance_km: number;
  duration_minutes: number;
  consumption_wh_km: number;
  points: {
    lat: number;
    lng: number;
    speed: number;
    power: number;
    elevation: number;
  }[];
}

export interface AppSettings {
  tesla_access_token: string;
  tesla_refresh_token: string;
  tesla_client_id?: string;
  use_simulator: boolean;
  sync_interval_driving_sec: number; // default 10s
  sync_interval_charging_sec: number; // default 60s
  sync_interval_idle_min: number; // default 5m
  sync_interval_asleep_min: number; // default 30m
  vampire_sleep_timeout_min: number; // default 15m (inactividad para dejarlo dormir)
  background_service_enabled: boolean;
  google_drive_connected: boolean;
  google_drive_last_backup?: number;
  electricity_cost_home_kwh: number; // €/kWh
  electricity_cost_supercharger_kwh: number; // €/kWh
}
