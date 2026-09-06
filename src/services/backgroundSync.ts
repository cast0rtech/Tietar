// Servicio de Sincronización en Segundo Plano y Registro Automático de Viajes y Cargas
import { db } from '../db/database';
import { teslaApi } from './teslaApi';
import { teslaSimulator } from './simulator';
import { sleepWatchdog } from './sleepWatchdog';
import type { VehicleTelemetry, DriveRecord, DrivePoint, ChargeRecord } from '../types/tesla';

export type SyncListener = (telemetry: VehicleTelemetry) => void;

class BackgroundSyncService {
  private timerId: any = null;
  private isRunning: boolean = false;
  private useSimulator: boolean = true;
  private listeners: Set<SyncListener> = new Set();
  
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

  // Última telemetría en memoria
  private lastTelemetry: VehicleTelemetry | null = null;

  constructor() {
    // Iniciar con simulador por defecto
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

  getLastTelemetry(): VehicleTelemetry | null {
    return this.lastTelemetry;
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

    // Calcular siguiente intervalo según el watchdog de sueño
    const watchdog = sleepWatchdog.evaluate();
    const intervalMs = Math.max(5000, watchdog.recommendedPollIntervalMs);

    this.timerId = setTimeout(() => this.syncLoop(), intervalMs);
  }

  // Un ciclo de consulta y persistencia
  async performSyncTick(): Promise<VehicleTelemetry> {
    let telemetry: VehicleTelemetry;

    if (this.useSimulator) {
      telemetry = teslaSimulator.getTelemetry();
    } else {
      if (!teslaApi.hasToken()) {
        throw new Error('Sin credenciales Tesla');
      }
      // Si el watchdog indica silencio para dormir y no estamos conduciendo/cargando, no despertar
      const watchdog = sleepWatchdog.evaluate();
      if (watchdog.isAllowingSleep) {
        // Solo consulta la lista rápida de vehículos que no despierta al coche
        const vehicles = await teslaApi.getVehicles();
        const v: any = vehicles[0];
        if (v && v.state === 'asleep') {
          telemetry = {
            ...this.lastTelemetry!,
            state: 'asleep',
            timestamp: Date.now(),
          };
        } else {
          telemetry = await teslaApi.getVehicleData(v.id || v.vehicle_id);
        }
      } else {
        const vehicles = await teslaApi.getVehicles();
        const v: any = vehicles[0];
        telemetry = await teslaApi.getVehicleData(v.id || v.vehicle_id);
      }
    }

    this.lastTelemetry = telemetry;
    sleepWatchdog.updateVehicleState(telemetry.state, telemetry.speed_kmh);

    // Notificar observadores (UI)
    this.listeners.forEach(l => l(telemetry));

    // Lógica de grabación automática de viajes y cargas en base de datos local
    await this.processDriveTracking(telemetry);
    await this.processChargeTracking(telemetry);

    return telemetry;
  }

  // Registro de Viajes
  private async processDriveTracking(telemetry: VehicleTelemetry) {
    const isDriving = telemetry.state === 'driving' || (telemetry.speed_kmh && telemetry.speed_kmh > 5);

    if (isDriving) {
      if (!this.activeDriveId) {
        // Iniciar nuevo viaje
        const now = Date.now();
        this.activeDriveStartTime = now;
        this.activeDriveStartSoc = telemetry.battery_level;
        this.activeDriveStartCoords = { lat: telemetry.latitude, lng: telemetry.longitude };
        this.activeDrivePointsCount = 0;

        const newDrive: DriveRecord = {
          vehicle_id: 'tesla_model_y_lr_01',
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

      // Guardar punto GPS del viaje
      if (this.activeDriveId) {
        const point: DrivePoint = {
          drive_id: this.activeDriveId,
          timestamp: Date.now(),
          latitude: telemetry.latitude,
          longitude: telemetry.longitude,
          speed_kmh: telemetry.speed_kmh,
          power_kw: telemetry.power_kw,
          battery_level: telemetry.battery_level,
          elevation_m: 750, // Estimada
          heading: telemetry.heading,
        };
        await db.drive_points.add(point);
        this.activeDrivePointsCount++;

        // Actualizar datos acumulados del viaje
        const durationMin = Math.max(1, Math.round((Date.now() - this.activeDriveStartTime!) / 60000));
        const estimatedKm = +(this.activeDrivePointsCount * 0.15).toFixed(1); // Incremento aproximado
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
      // El coche ya no está conduciendo: si había un viaje activo, cerrarlo
      if (this.activeDriveId) {
        await db.drives.update(this.activeDriveId, {
          end_time: Date.now(),
        });
        this.activeDriveId = null;
        this.activeDriveStartTime = null;
      }
    }
  }

  // Registro de Cargas
  private async processChargeTracking(telemetry: VehicleTelemetry) {
    const isCharging = telemetry.state === 'charging' || telemetry.charging_state === 'Charging';

    if (isCharging) {
      if (!this.activeChargeId) {
        const now = Date.now();
        this.activeChargeStartTime = now;
        this.activeChargeStartSoc = telemetry.battery_level;

        const newCharge: ChargeRecord = {
          vehicle_id: 'tesla_model_y_lr_01',
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
        // Guardar punto de curva
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
