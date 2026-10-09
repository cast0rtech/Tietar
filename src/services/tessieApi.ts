// Cliente Tessie API oficial (https://api.tessie.com)
import type { 
  Vehicle, 
  VehicleTelemetry, 
  VehicleStateEnum, 
  DriveRecord, 
  DrivePoint, 
  ChargeRecord, 
  BatteryHealthRecord 
} from '../types/tesla';
import { db } from '../db/database';

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

  // Normalizador de marcas temporales (admite segundos UNIX, milisegundos o strings ISO)
  private normalizeTs(val: any): number {
    if (!val) return Date.now();
    if (typeof val === 'string') {
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) return parsed;
      val = Number(val);
    }
    if (typeof val === 'number') {
      return val < 10000000000 ? val * 1000 : val;
    }
    return Date.now();
  }

  // 1. Obtener lista de vehículos vinculados en Tessie
  async getVehicles(): Promise<Vehicle[]> {
    const data: any = await this.fetchApi<any>('/vehicles');
    const list = data?.results || (Array.isArray(data) ? data : []);

    return list.map((v: any, index: number): Vehicle => {
      const vin = v.vin || `VIN_TESSIE_${index}`;
      const vs = v.last_state?.vehicle_state || {};
      const cs = v.last_state?.charge_state || {};
      const odometerMiles = vs.odometer || 0;
      const odometerKm = Math.round(odometerMiles * 1.60934);

      return {
        id: String(vin),
        vehicle_id: Number(v.id || index + 1),
        vin: vin,
        display_name: v.display_name || v.details?.display_name || 'Tesla',
        model: v.details?.model || 'Model Y',
        trim: v.details?.trim || 'Long Range AWD',
        color: v.details?.paint || 'Pearl White',
        car_version: vs.car_version || '2024.44',
        odometer: odometerKm,
        battery_capacity_kwh: cs.battery_capacity || 75,
        is_selected: true,
      };
    });
  }

  // 2. Obtener estado y telemetría completa en vivo de Tessie
  async getVehicleData(vin: string): Promise<VehicleTelemetry> {
    const raw: any = await this.fetchApi<any>(`/${vin}/state`);
    return this.parseTessieTelemetry(raw);
  }

  // 3. Obtener histórico de viajes (Drives) guardados en Tessie
  async getHistoricalDrives(
    vin: string, 
    options?: { from?: number; to?: number; limit?: number }
  ): Promise<DriveRecord[]> {
    const params = new URLSearchParams();
    params.set('distance_format', 'km');
    params.set('temperature_format', 'c');
    params.set('format', 'json');
    if (options?.from) params.set('from', String(Math.floor(options.from / 1000)));
    if (options?.to) params.set('to', String(Math.floor(options.to / 1000)));
    if (options?.limit) params.set('limit', String(options.limit));

    const res: any = await this.fetchApi<any>(`/${vin}/drives?${params.toString()}`);
    const list = res?.results || res?.drives || (Array.isArray(res) ? res : []);

    return list.map((d: any): DriveRecord => {
      const startTime = this.normalizeTs(d.started_at || d.start_time || d.start_date);
      const endTime = this.normalizeTs(d.ended_at || d.end_time || d.end_date || startTime);
      const distanceKm = +(Number(d.odometer_distance ?? d.distance ?? d.distance_km ?? 0)).toFixed(1);
      const durationMin = Math.max(1, Math.round((endTime - startTime) / 60000) || Math.round((d.duration || 0) / 60) || 1);
      const energyUsedKwh = +(Number(d.energy_used ?? d.energy_used_kwh ?? 0)).toFixed(1);

      let consumptionWhKm = 0;
      if (energyUsedKwh > 0 && distanceKm > 0) {
        consumptionWhKm = Math.round((energyUsedKwh * 1000) / distanceKm);
      } else if (d.consumption_wh_km) {
        consumptionWhKm = Math.round(Number(d.consumption_wh_km));
      } else {
        consumptionWhKm = 175;
      }

      const startAddr = d.starting_location || d.start_address || (
        d.starting_latitude ? `Lat: ${Number(d.starting_latitude).toFixed(3)}, Lon: ${Number(d.starting_longitude).toFixed(3)}` : 'Inicio de trayecto'
      );
      const endAddr = d.ending_location || d.end_address || (
        d.ending_latitude ? `Lat: ${Number(d.ending_latitude).toFixed(3)}, Lon: ${Number(d.ending_longitude).toFixed(3)}` : 'Fin de trayecto'
      );

      return {
        vehicle_id: String(vin),
        start_time: startTime,
        end_time: endTime,
        start_address: startAddr,
        end_address: endAddr,
        distance_km: distanceKm,
        duration_minutes: durationMin,
        energy_used_kwh: energyUsedKwh,
        consumption_wh_km: consumptionWhKm,
        start_soc: Math.round(Number(d.starting_battery ?? d.start_soc ?? 0)),
        end_soc: Math.round(Number(d.ending_battery ?? d.end_soc ?? 0)),
        speed_avg_kmh: Math.round(Number(d.average_speed ?? d.speed_avg_kmh ?? 0)),
        speed_max_kmh: Math.round(Number(d.max_speed ?? d.speed_max_kmh ?? 0)),
        power_max_kw: Math.round(Number(d.max_power ?? d.power_max_kw ?? 160)),
        power_min_kw: Math.round(Number(d.min_power ?? d.power_min_kw ?? -45)),
        outside_temp_avg: Math.round(Number(d.average_outside_temperature ?? d.outside_temp_avg ?? 20)),
        name: d.tag || d.name || '',
      };
    });
  }

  // 4. Obtener coordenadas GPS del trayecto para visualización en mapa Leaflet
  async getDrivingPath(vin: string, from: number, to: number): Promise<DrivePoint[]> {
    try {
      const fromSec = Math.floor(from / 1000);
      const toSec = Math.floor(to / 1000);
      const res: any = await this.fetchApi<any>(`/${vin}/driving_path?from=${fromSec}&to=${toSec}&format=json`);
      const rawPoints = res?.results || res?.path || (Array.isArray(res) ? res : []);

      return rawPoints.map((p: any): DrivePoint => ({
        drive_id: 0,
        timestamp: this.normalizeTs(p.timestamp || p.time),
        latitude: Number(p.latitude ?? p.lat),
        longitude: Number(p.longitude ?? p.lng ?? p.lon),
        speed_kmh: Math.round(Number(p.speed || 0) * (p.speed_is_miles ? 1.60934 : 1)),
        power_kw: Math.round(Number(p.power || 0)),
        battery_level: Math.round(Number(p.battery_level ?? p.soc ?? 0)),
        elevation_m: Math.round(Number(p.elevation ?? p.altitude ?? 650)),
        heading: Math.round(Number(p.heading || 0)),
      }));
    } catch {
      return [];
    }
  }

  // 5. Obtener histórico de sesiones de recarga (Charges) guardadas en Tessie
  async getHistoricalCharges(
    vin: string, 
    options?: { from?: number; to?: number; limit?: number }
  ): Promise<ChargeRecord[]> {
    const params = new URLSearchParams();
    params.set('format', 'json');
    if (options?.from) params.set('from', String(Math.floor(options.from / 1000)));
    if (options?.to) params.set('to', String(Math.floor(options.to / 1000)));
    if (options?.limit) params.set('limit', String(options.limit));

    const res: any = await this.fetchApi<any>(`/${vin}/charges?${params.toString()}`);
    const list = res?.results || res?.charges || (Array.isArray(res) ? res : []);

    return list.map((c: any): ChargeRecord => {
      const startTime = this.normalizeTs(c.started_at || c.start_time || c.start_date);
      const endTime = this.normalizeTs(c.ended_at || c.end_time || c.end_date || startTime);
      const energyAddedKwh = +(Number(c.energy_added ?? c.charge_energy_added ?? c.energy_added_kwh ?? 0)).toFixed(1);
      const durationMin = Math.max(1, Math.round((endTime - startTime) / 60000) || Math.round((c.duration || 0) / 60) || 1);
      const maxPowerKw = Math.round(Number(c.max_power ?? c.charger_power ?? (c.supercharger ? 150 : 11)));
      const isSupercharger = Boolean(c.supercharger || maxPowerKw > 50);
      const costEur = c.cost !== undefined ? +(Number(c.cost)).toFixed(2) : +(energyAddedKwh * (isSupercharger ? 0.38 : 0.15)).toFixed(2);

      return {
        vehicle_id: String(vin),
        start_time: startTime,
        end_time: endTime,
        location: c.location || c.address || (isSupercharger ? 'Tesla Supercharger' : 'Punto de Carga AC'),
        energy_added_kwh: energyAddedKwh,
        start_soc: Math.round(Number(c.starting_battery ?? c.start_soc ?? 0)),
        end_soc: Math.round(Number(c.ending_battery ?? c.end_soc ?? 0)),
        duration_minutes: durationMin,
        max_power_kw: maxPowerKw,
        charger_type: c.fast_charger_type || (isSupercharger ? 'Supercharger' : 'Home (AC)'),
        cost_eur: costEur,
      };
    });
  }

  // 6. Obtener salud y degradación de batería desde Tessie
  async getBatteryHealth(vin: string): Promise<any> {
    try {
      return await this.fetchApi<any>(`/${vin}/battery_health`);
    } catch {
      try {
        return await this.fetchApi<any>('/battery_health');
      } catch {
        return null;
      }
    }
  }

  // 7. Sincronizar y recoger TODOS los datos guardados en Tessie (Viajes, Cargas, Batería) y persistirlos en Dexie
  async syncAllTessieHistoricalData(
    vehicle: Vehicle, 
    onProgress?: (status: string) => void
  ): Promise<{ newDrives: number; totalDrives: number; newCharges: number; totalCharges: number }> {
    const vin = vehicle.vin || vehicle.id;
    let newDrivesCount = 0;
    let newChargesCount = 0;

    // A. Sincronizar todos los viajes guardados
    if (onProgress) onProgress('Recogiendo histórico de trayectos guardados en Tessie...');
    try {
      const historicalDrives = await this.getHistoricalDrives(vin, { limit: 100 });
      for (const drive of historicalDrives) {
        // Comprobar si ya existe en la base de datos local (evitar duplicados por rango de tiempo)
        const exists = await db.drives
          .where('vehicle_id')
          .equals(vehicle.id)
          .filter(d => Math.abs(d.start_time - drive.start_time) < 120000)
          .first();

        if (!exists) {
          const driveId = (await db.drives.add(drive)) as number;
          newDrivesCount++;

          // Para los viajes más recientes, intentar descargar la ruta de puntos GPS para Leaflet
          if (newDrivesCount <= 10) {
            try {
              const points = await this.getDrivingPath(vin, drive.start_time, drive.end_time);
              if (points.length > 0) {
                const pointsWithId = points.map(p => ({ ...p, drive_id: driveId }));
                await db.drive_points.bulkAdd(pointsWithId);
              }
            } catch {
              // Si no hay ruta GPS detallada, continúa con el registro
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('Aviso sincronizando viajes de Tessie:', err.message);
    }

    // B. Sincronizar todas las sesiones de recarga guardadas
    if (onProgress) onProgress('Recogiendo histórico de sesiones de recarga en Tessie...');
    try {
      const historicalCharges = await this.getHistoricalCharges(vin, { limit: 100 });
      for (const charge of historicalCharges) {
        const exists = await db.charges
          .where('vehicle_id')
          .equals(vehicle.id)
          .filter(c => Math.abs(c.start_time - charge.start_time) < 120000)
          .first();

        if (!exists) {
          await db.charges.add(charge);
          newChargesCount++;
        }
      }
    } catch (err: any) {
      console.warn('Aviso sincronizando cargas de Tessie:', err.message);
    }

    // C. Sincronizar métricas de degradación de batería
    if (onProgress) onProgress('Comprobando salud y degradación celular en Tessie...');
    try {
      const healthData = await this.getBatteryHealth(vin);
      if (healthData) {
        const today = new Date().toISOString().split('T')[0];
        const existingHealth = await db.battery_health
          .where('vehicle_id')
          .equals(vehicle.id)
          .filter(h => h.date === today)
          .first();

        if (!existingHealth) {
          const healthVal = Number(healthData.health ?? healthData.capacity_percentage ?? 96);
          const degPercent = +(Math.max(0, 100 - healthVal)).toFixed(1);
          const origCap = Number(healthData.original_capacity ?? vehicle.battery_capacity_kwh ?? 75);
          const nominalPack = +(origCap * (healthVal / 100)).toFixed(1);

          await db.battery_health.add({
            vehicle_id: vehicle.id,
            date: today,
            odometer_km: vehicle.odometer || 0,
            nominal_full_pack_kwh: nominalPack,
            original_capacity_kwh: origCap,
            degradation_percent: degPercent,
            max_range_100_percent_km: Math.round(Number(healthData.range_health ?? 515)),
          });
        }
      }
    } catch (err: any) {
      console.warn('Aviso sincronizando salud de batería de Tessie:', err.message);
    }

    const totalDrives = await db.drives.where('vehicle_id').equals(vehicle.id).count();
    const totalCharges = await db.charges.where('vehicle_id').equals(vehicle.id).count();

    return {
      newDrives: newDrivesCount,
      totalDrives,
      newCharges: newChargesCount,
      totalCharges,
    };
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

    let calcState: VehicleStateEnum = 'online';
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
        df: vs.df === 1 || vs.df === true,
        dr: vs.dr === 1 || vs.dr === true,
        pf: vs.pf === 1 || vs.pf === true,
        pr: vs.pr === 1 || vs.pr === true,
        ft: vs.ft === 1 || vs.ft === true,
        rt: vs.rt === 1 || vs.rt === true,
      },
    };
  }
}

export const tessieApi = new TessieApiClient();
