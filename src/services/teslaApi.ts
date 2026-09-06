// Cliente Tesla API (Tesla Fleet API & Owner API)
import type { Vehicle, VehicleTelemetry } from '../types/tesla';

export class TeslaApiClient {
  private accessToken: string | null = null;
  private baseUrl: string = 'https://fleet-api.prd.eu.vn.cloud.tesla.com'; // O proxy local

  constructor(token?: string) {
    if (token) this.accessToken = token;
  }

  setToken(token: string) {
    this.accessToken = token;
  }

  hasToken(): boolean {
    return !!this.accessToken && this.accessToken.trim().length > 10;
  }

  private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error('No se ha configurado el Token de acceso de Tesla.');
    }

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tesla API Error (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    return json.response !== undefined ? json.response : json;
  }

  // Obtener lista de vehículos (ligero, no despierta al coche)
  async getVehicles(): Promise<Vehicle[]> {
    return this.fetchApi<Vehicle[]>('/api/1/vehicles');
  }

  // Obtener estado completo del vehículo (¡Despierta al vehículo si está activo!)
  async getVehicleData(vehicleId: string | number): Promise<VehicleTelemetry> {
    const raw: any = await this.fetchApi<any>(`/api/1/vehicles/${vehicleId}/vehicle_data`);
    return this.parseRawTelemetry(raw);
  }

  // Despertar vehículo explícitamente
  async wakeUp(vehicleId: string | number): Promise<boolean> {
    const res: any = await this.fetchApi<any>(`/api/1/vehicles/${vehicleId}/wake_up`, {
      method: 'POST',
    });
    return res.state === 'online';
  }

  // Comandos del vehículo
  async sendCommand(
    vehicleId: string | number,
    command: 'door_lock' | 'door_unlock' | 'flash_lights' | 'honk_horn' | 'auto_conditioning_start' | 'auto_conditioning_stop' | 'charge_port_door_open' | 'charge_port_door_close' | 'actuate_trunk' | 'set_sentry_mode',
    params: Record<string, any> = {}
  ): Promise<{ result: boolean; reason?: string }> {
    return this.fetchApi<{ result: boolean; reason?: string }>(
      `/api/1/vehicles/${vehicleId}/command/${command}`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  }

  // Conversión de formato crudo Tesla a nuestro formato tipado
  private parseRawTelemetry(raw: any): VehicleTelemetry {
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
      est_battery_range_km: Math.round((cs.est_battery_range || cs.battery_range || 0) * 1.60934),
      charge_energy_added: cs.charge_energy_added ?? 0,
      charger_power: cs.charger_power ?? 0,
      charger_voltage: cs.charger_voltage ?? 0,
      charger_actual_current: cs.charger_actual_current ?? 0,
      charging_state: cs.charging_state || 'Disconnected',
      time_to_full_charge: cs.time_to_full_charge ?? 0,
      latitude: ds.latitude ?? 40.4168,
      longitude: ds.longitude ?? -3.7038,
      heading: ds.heading ?? 0,
      speed_kmh: Math.round((ds.speed || 0) * 1.60934),
      power_kw: ds.power ?? 0,
      shift_state: ds.shift_state || null,
      inside_temp: cls.inside_temp ?? 20,
      outside_temp: cls.outside_temp ?? 18,
      is_climate_on: cls.is_climate_on ?? false,
      locked: vs.locked ?? true,
      sentry_mode: vs.sentry_mode ?? false,
      valet_mode: vs.valet_mode ?? false,
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

export const teslaApi = new TeslaApiClient();
