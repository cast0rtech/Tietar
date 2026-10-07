// Cliente Tessie API oficial (https://api.tessie.com)
import type { Vehicle, VehicleTelemetry } from '../types/tesla';

export class TessieApiClient {
  private accessToken: string | null = null;
  private baseUrl: string = 'https://api.tessie.com';

  constructor(token?: string) {
    if (token) this.accessToken = token;
  }

  setToken(token: string) {
    this.accessToken = token;
  }

  getToken(): string | null {
    return this.accessToken;
  }

  hasToken(): boolean {
    return !!this.accessToken && this.accessToken.trim().length > 10;
  }

  private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error('No se ha configurado el Token de la API de Tessie.');
    }

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tessie API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  // Obtener lista de vehículos vinculados en Tessie
  async getVehicles(): Promise<Vehicle[]> {
    const data: any = await this.fetchApi<any>('/vehicles');
    const list = data?.results || (Array.isArray(data) ? data : []);

    return list.map((v: any, index: number) => ({
      id: v.vin || `tessie_${index}`,
      vin: v.vin || `VIN_TESSIE_${index}`,
      display_name: v.display_name || v.details?.display_name || 'Tesla (Tessie)',
      model: v.details?.model || 'Model Y',
      trim: v.details?.trim || 'Long Range AWD',
      color: v.details?.paint || 'Pearl White',
      software_version: v.last_state?.vehicle_state?.car_version || '2024.44.25',
      year: v.details?.year || 2024,
      battery_capacity_kwh: 75,
    }));
  }

  // Obtener estado y telemetría completa de Tessie
  async getVehicleData(vin: string): Promise<VehicleTelemetry> {
    const raw: any = await this.fetchApi<any>(`/${vin}/state`);
    return this.parseTessieTelemetry(raw);
  }

  // Despertar el vehículo
  async wakeUp(vin: string): Promise<boolean> {
    const res: any = await this.fetchApi<any>(`/${vin}/wake`, { method: 'POST' });
    return res.result === true || res.state === 'online';
  }

  // Enviar comandos al vehículo a través de Tessie
  async sendCommand(
    vin: string,
    command: string,
    params: Record<string, any> = {}
  ): Promise<{ result: boolean; reason?: string }> {
    // Mapeo amigable de comandos estándar a endpoints de Tessie
    const endpointMap: Record<string, string> = {
      door_lock: 'lock',
      door_unlock: 'unlock',
      auto_conditioning_start: 'start_climate',
      auto_conditioning_stop: 'stop_climate',
      flash_lights: 'flash_lights',
      honk_horn: 'honk',
      charge_port_door_open: 'open_charge_port',
      charge_port_door_close: 'close_charge_port',
      actuate_trunk: 'open_front_trunk',
      set_sentry_mode: 'set_sentry_mode',
    };

    const tessieCmd = endpointMap[command] || command;
    const res: any = await this.fetchApi<any>(`/${vin}/command/${tessieCmd}`, {
      method: 'POST',
      body: JSON.stringify(params),
    });

    return {
      result: res.result === true,
      reason: res.reason,
    };
  }

  private parseTessieTelemetry(raw: any): VehicleTelemetry {
    const cs = raw.charge_state || {};
    const ds = raw.drive_state || {};
    const cls = raw.climate_state || {};
    const vs = raw.vehicle_state || {};

    let calcState: any = 'online';
    if (ds.shift_state === 'D' || ds.shift_state === 'R') {
      calcState = 'driving';
    } else if (cs.charging_state === 'Charging') {
      calcState = 'charging';
    } else if (raw.state === 'asleep') {
      calcState = 'asleep';
    }

    return {
      timestamp: Date.now(),
      state: calcState,
      battery_level: cs.battery_level ?? 0,
      usable_battery_level: cs.usable_battery_level ?? cs.battery_level ?? 0,
      battery_range_km: Math.round((cs.battery_range || 0) * 1.60934),
      charge_limit_soc: cs.charge_limit_soc ?? 80,
      charging_state: cs.charging_state || 'Disconnected',
      charger_power_kw: cs.charger_power ?? 0,
      charger_voltage: cs.charger_voltage ?? 0,
      charger_actual_current: cs.charger_actual_current ?? 0,
      time_to_full_charge_hours: cs.time_to_full_charge ?? 0,
      speed_kmh: Math.round((ds.speed || 0) * 1.60934),
      power_kw: ds.power ?? 0,
      odometer_km: Math.round((vs.odometer || 0) * 1.60934),
      shift_state: ds.shift_state || null,
      latitude: ds.latitude || 40.4168,
      longitude: ds.longitude || -3.7038,
      heading: ds.heading || 0,
      inside_temp_c: cls.inside_temp ?? 20,
      outside_temp_c: cls.outside_temp ?? 15,
      is_climate_on: cls.is_climate_on ?? false,
      sentry_mode: vs.sentry_mode ?? false,
      locked: vs.locked ?? true,
      tire_pressure_bar: {
        front_left: (vs.tpms_pressure_fl || 2.9),
        front_right: (vs.tpms_pressure_fr || 2.9),
        rear_left: (vs.tpms_pressure_rl || 2.9),
        rear_right: (vs.tpms_pressure_rr || 2.9),
      },
      doors_open: {
        df: vs.df === 1,
        dr: vs.dr === 1,
        pf: vs.pf === 1,
        pr: vs.pr === 1,
        ft: vs.ft === 1,
        rt: vs.rt === 1,
      },
    };
  }
}

export const tessieApi = new TessieApiClient();
