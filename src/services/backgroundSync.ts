// Servicio de Sincronización en Segundo Plano y Registro Automático de Viajes y Cargas
import { db } from '../db/database';
import { teslaApi } from './teslaApi';
import { tessieApi } from './tessieApi';
import { teslaSimulator } from './simulator';
import { sleepWatchdog } from './sleepWatchdog';
import type { Vehicle, VehicleTelemetry, DriveRecord, DrivePoint, ChargeRecord } from '../types/tesla';

export type SyncListener = (telemetry: VehicleTelemetry) => void;
export type VehicleListener = (vehicle: Vehicle) => void;

class BackgroundSyncService {
  private timerId: any = null;
  private isRunning: boolean = false;
  private useSimulator: boolean = false;
  private listeners: Set<SyncListener> = new Set();
  private vehicleListeners: Set<VehicleListener> = new Set();
  
  // Seguimiento de Viaje Activo
  private activeDriveId: number | null = null;
  private activeDriveStartTime: number | null = null;
  private activeDriveStartSoc: number | null = null;
  private activeDriveStartCoords: { lat: number; lng: number } | null = null;
  private activeDrivePointsCount: number = 0;

  // Seguimiento de Carga Activa
  private activeChargeId: number | null = null;
  private activeChargeStartTime: number | null = null;
  private activeChargeStartSoc: number | null = null;

  // Vehículo actual y última telemetría
  private currentVehicle: Vehicle | null = null;
  private lastTelemetry: VehicleTelemetry | null = null;

  constructor() {
    // Si no hay token de Tessie ni de Tesla configurado, usar simulador
    const hasRealToken = tessieApi.hasToken() || teslaApi.hasToken();
    this.useSimulator = !hasRealToken;
  }

  setSimulatorMode(enabled: boolean) {
    this.useSimulator = enabled;
  }

  isSimulator(): boolean {
    return this.useSimulator;
  }

  addListener(listener: SyncListener) {
    this.listeners.add(listener);
    if (this.lastTelemetry) listener(this.lastTelemetry);
    return () => this.listeners.delete(listener);
  }

  addVehicleListener(listener: VehicleListener) {
    this.vehicleListeners.add(listener);
    if (this.currentVehicle) listener(this.currentVehicle);
    return () => this.vehicleListeners.delete(listener);
  }

  getLastTelemetry(): VehicleTelemetry | null {
    return this.lastTelemetry;
  }

  getCurrentVehicle(): Vehicle | null {
    return this.currentVehicle;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.syncLoop();
  }

  stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  // Ciclo principal de sincronización
  private async syncLoop() {
    if (!this.isRunning) return;

    try {
      await this.performSyncTick();
    } catch (err) {
      console.error('Error en ciclo de sincronización:', err);
    }

    // Intervalo de consulta (mínimo 10s para proteger la batería del coche)
    const watchdog = sleepWatchdog.evaluate();
    const intervalMs = Math.max(10000, watchdog.recommendedPollIntervalMs);

    this.timerId = setTimeout(() => this.syncLoop(), intervalMs);
  }

  // Un ciclo de consulta y persistencia en vivo
  async performSyncTick(): Promise<VehicleTelemetry> {
    let telemetry: VehicleTelemetry;

    // 1. MODO SIMULADOR
    if (this.useSimulator) {
      telemetry = teslaSimulator.getTelemetry();
    } 
    // 2. MODO REAL: TESSIE API (Recomendado, directo y sin proxy)
    else if (tessieApi.hasToken()) {
      try {
        const vehicles = await tessieApi.getVehicles();
        if (!vehicles || vehicles.length === 0) {
          throw new Error('No se encontraron vehículos vinculados en tu cuenta de Tessie.');
        }

        const realVehicle = vehicles[0];
        this.currentVehicle = realVehicle;
        await db.vehicles.put(realVehicle);
        this.vehicleListeners.forEach(l => l(realVehicle));

        // Obtener estado en tiempo real sin despertar el coche si duerme
        telemetry = await tessieApi.getVehicleData(realVehicle.vin);
      } catch (err: any) {
        console.warn('Error sincronizando con Tessie API:', err.message);
        if (this.lastTelemetry) {
          telemetry = this.lastTelemetry;
        } else {
          throw err;
        }
      }
    } 
    // 3. MODO REAL: TESLA FLEET API
    else if (teslaApi.hasToken()) {
      try {
        const vehicles = await teslaApi.getVehicles();
        if (!vehicles || vehicles.length === 0) {
          throw new Error('No se encontraron vehículos en tu cuenta de Tesla.');
        }

        const realVehicle = vehicles[0];
        this.currentVehicle = realVehicle;
        await db.vehicles.put(realVehicle);
        this.vehicleListeners.forEach(l => l(realVehicle));

        const watchdog = sleepWatchdog.evaluate();
        if (watchdog.isAllowingSleep && (realVehicle as any).state === 'asleep') {
          telemetry = {
            ...(this.lastTelemetry || teslaSimulator.getTelemetry()),
            state: 'asleep',
            timestamp: Date.now(),
          };
        } else {
          telemetry = await teslaApi.getVehicleData(realVehicle.id || realVehicle.vehicle_id);
        }
      } catch (err: any) {
        console.warn('Error sincronizando con Tesla API:', err.message);
        if (this.lastTelemetry) {
          telemetry = this.lastTelemetry;
        } else {
          throw err;
        }
      }
    } 
    // Fallback: Si no hay tokens configurados, usar simulador
    else {
      this.useSimulator = true;
      telemetry = teslaSimulator.getTelemetry();
    }

    this.lastTelemetry = telemetry;
    sleepWatchdog.updateVehicleState(telemetry.state, telemetry.speed_kmh);

    // Notificar a componentes UI
    this.listeners.forEach(l => l(telemetry));

    // Registro automático de viajes y cargas
    const vehicleId = this.currentVehicle?.id || 'tesla_current';
    await this.processDriveTracking(telemetry, vehicleId);
    await this.processChargeTracking(telemetry, vehicleId);

    return telemetry;
  }

  // Registro de Viajes en vivo
  private async processDriveTracking(telemetry: VehicleTelemetry, vehicleId: string) {
    const isDriving = telemetry.state === 'driving' || (telemetry.speed_kmh && telemetry.speed_kmh > 5);

    if (isDriving) {
      if (!this.activeDriveId) {
        const now = Date.now();
        this.activeDriveStartTime = now;
        this.activeDriveStartSoc = telemetry.battery_level;
        this.activeDriveStartCoords = { lat: telemetry.latitude, lng: telemetry.longitude };
        this.activeDrivePointsCount = 0;

        const newDrive: DriveRecord = {
          vehicle_id: vehicleId,
          start_time: now,
          end_time: now,
          start_address: `Lat: ${telemetry.latitude.toFixed(3)}, Lon: ${telemetry.longitude.toFixed(3)}`,
          end_address: 'En curso...',
          distance_km: 0,
          duration_minutes: 0,
          energy_used_kwh: 0,
          consumption_wh_km: 0,
          start_soc: telemetry.battery_level,
          end_soc: telemetry.battery_level,
          speed_avg_kmh: telemetry.speed_kmh,
          speed_max_kmh: telemetry.speed_kmh,
          power_max_kw: telemetry.power_kw,
          power_min_kw: telemetry.power_kw,
          outside_temp_avg: telemetry.outside_temp,
        };

        this.activeDriveId = (await db.drives.add(newDrive)) as number;
      }

      if (this.activeDriveId) {
        const point: DrivePoint = {
          drive_id: this.activeDriveId,
          timestamp: Date.now(),
          latitude: telemetry.latitude,
          longitude: telemetry.longitude,
          speed_kmh: telemetry.speed_kmh,
          power_kw: telemetry.power_kw,
          battery_level: telemetry.battery_level,
          elevation_m: 750,
          heading: telemetry.heading,
        };
        await db.drive_points.add(point);
        this.activeDrivePointsCount++;

        const durationMin = Math.max(1, Math.round((Date.now() - this.activeDriveStartTime!) / 60000));
        const estimatedKm = +(this.activeDrivePointsCount * 0.15).toFixed(1);
        const socDiff = Math.max(0, (this.activeDriveStartSoc || telemetry.battery_level) - telemetry.battery_level);
        const kwhUsed = +(socDiff * 0.78).toFixed(1);
        const whKm = estimatedKm > 0 ? Math.round((kwhUsed * 1000) / estimatedKm) : 180;

        await db.drives.update(this.activeDriveId, {
          end_time: Date.now(),
          end_address: `Lat: ${telemetry.latitude.toFixed(3)}, Lon: ${telemetry.longitude.toFixed(3)}`,
          distance_km: estimatedKm,
          duration_minutes: durationMin,
          energy_used_kwh: kwhUsed,
          consumption_wh_km: whKm,
          end_soc: telemetry.battery_level,
        });
      }
    } else {
      if (this.activeDriveId) {
        await db.drives.update(this.activeDriveId, {
          end_time: Date.now(),
        });
        this.activeDriveId = null;
        this.activeDriveStartTime = null;
      }
    }
  }

  // Registro de Cargas en vivo
  private async processChargeTracking(telemetry: VehicleTelemetry, vehicleId: string) {
    const isCharging = telemetry.state === 'charging' || telemetry.charging_state === 'Charging';

    if (isCharging) {
      if (!this.activeChargeId) {
        const now = Date.now();
        this.activeChargeStartTime = now;
        this.activeChargeStartSoc = telemetry.battery_level;

        const newCharge: ChargeRecord = {
          vehicle_id: vehicleId,
          start_time: now,
          end_time: now,
          location: telemetry.charger_power > 50 ? 'Tesla Supercharger' : 'Punto de Carga AC',
          energy_added_kwh: telemetry.charge_energy_added || 0.1,
          start_soc: telemetry.battery_level,
          end_soc: telemetry.battery_level,
          duration_minutes: 0,
          max_power_kw: telemetry.charger_power,
          charger_type: telemetry.charger_power > 50 ? 'Supercharger' : 'Home (AC)',
          cost_eur: 0,
        };
        this.activeChargeId = (await db.charges.add(newCharge)) as number;
      }

      if (this.activeChargeId) {
        await db.charge_points.add({
          charge_id: this.activeChargeId,
          timestamp: Date.now(),
          battery_level: telemetry.battery_level,
          charger_power_kw: telemetry.charger_power,
          charger_voltage: telemetry.charger_voltage,
          charger_actual_current: telemetry.charger_actual_current,
        });

        const durationMin = Math.round((Date.now() - this.activeChargeStartTime!) / 60000);
        const kwh = telemetry.charge_energy_added || 0.1;
        const costEur = +(kwh * 0.35).toFixed(2);

        await db.charges.update(this.activeChargeId, {
          end_time: Date.now(),
          energy_added_kwh: kwh,
          end_soc: telemetry.battery_level,
          duration_minutes: durationMin,
          max_power_kw: Math.max(telemetry.charger_power),
          cost_eur: costEur,
        });
      }
    } else {
      if (this.activeChargeId) {
        await db.charges.update(this.activeChargeId, {
          end_time: Date.now(),
        });
        this.activeChargeId = null;
        this.activeChargeStartTime = null;
      }
    }
  }
}

export const backgroundSync = new BackgroundSyncService();
