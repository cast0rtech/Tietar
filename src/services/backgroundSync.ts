// Servicio de Sincronización en Segundo Plano y Registro Automático de Viajes y Cargas
import { db } from '../db/database';
import { teslaApi } from './teslaApi';
import { tessieApi } from './tessieApi';
import { teslaSimulator } from './simulator';
import { sleepWatchdog } from './sleepWatchdog';
import type { Vehicle, VehicleTelemetry, DriveRecord, DrivePoint, ChargeRecord, VampireDrainRecord } from '../types/tesla';

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
  private activeDriveLastCoords: { lat: number; lng: number } | null = null;
  private activeDriveAccumulatedKm: number = 0;
  private activeDrivePointsCount: number = 0;

  // Seguimiento de Carga Activa
  private activeChargeId: number | null = null;
  private activeChargeStartTime: number | null = null;
  private activeChargeStartSoc: number | null = null;

  // Seguimiento de Reposo (Vampire Drain)
  private sleepStartTime: number | null = null;
  private sleepStartSoc: number | null = null;

  // Control de sincronización periódica de históricos de Tessie
  private lastHistoricalSyncTime: number = 0;

  // Vehículo actual y última telemetría
  private currentVehicle: Vehicle | null = null;
  private lastTelemetry: VehicleTelemetry | null = null;

  constructor() {
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

    // Intervalo de consulta adaptativo para proteger la batería del coche
    const watchdog = sleepWatchdog.evaluate();
    const intervalMs = Math.max(10000, watchdog.recommendedPollIntervalMs);

    this.timerId = setTimeout(() => this.syncLoop(), intervalMs);
  }

  // Un ciclo completo de consulta y persistencia en vivo
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
        realVehicle.is_selected = true;

        // Preservar configuración personalizada de batería si ya existía en la base de datos local
        const existingVehicle = await db.vehicles.get(realVehicle.id);
        if (existingVehicle) {
          realVehicle.battery_capacity_kwh = existingVehicle.battery_capacity_kwh || 60;
          realVehicle.battery_type = existingVehicle.battery_type || 'LFP';
        } else {
          realVehicle.battery_capacity_kwh = 60;
          realVehicle.battery_type = 'LFP';
        }

        this.currentVehicle = realVehicle;
        await db.vehicles.put(realVehicle);
        this.vehicleListeners.forEach(l => l(realVehicle));

        // Obtener estado en tiempo real sin despertar el coche si duerme
        telemetry = await tessieApi.getVehicleData(realVehicle.vin);

        // Actualizar odómetro si está disponible
        if (telemetry && (telemetry as any).odometer) {
          realVehicle.odometer = (telemetry as any).odometer;
          await db.vehicles.put(realVehicle);
        }

        // Sincronizar periódicamente viajes y cargas finalizados en Tessie (cada 3 min o al inicio)
        const now = Date.now();
        if (now - this.lastHistoricalSyncTime > 180000) {
          this.lastHistoricalSyncTime = now;
          tessieApi.syncAllTessieHistoricalData(realVehicle).catch(err => {
            console.warn('Sync de histórico en segundo plano:', err.message);
          });
        }
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
        realVehicle.is_selected = true;
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

    // Registro automático de viajes, cargas, degradación y reposo
    const vehicleId = this.currentVehicle?.id || 'tesla_current';
    await this.processDriveTracking(telemetry, vehicleId);
    await this.processChargeTracking(telemetry, vehicleId);
    await this.processVampireTracking(telemetry, vehicleId);
    await this.recordBatterySnapshot(this.currentVehicle, telemetry);

    return telemetry;
  }

  // Cálculo de distancia geográfica precisa (Fórmula de Haversine)
  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio terrestre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Registro de Viajes en vivo
  private async processDriveTracking(telemetry: VehicleTelemetry, vehicleId: string) {
    const isDriving = telemetry.state === 'driving' || (telemetry.speed_kmh && telemetry.speed_kmh > 5);

    if (isDriving) {
      const now = Date.now();
      const currentCoords = { lat: telemetry.latitude, lng: telemetry.longitude };

      if (!this.activeDriveId) {
        this.activeDriveStartTime = now;
        this.activeDriveStartSoc = telemetry.battery_level;
        this.activeDriveLastCoords = currentCoords;
        this.activeDriveAccumulatedKm = 0;
        this.activeDrivePointsCount = 0;

        const newDrive: DriveRecord = {
          vehicle_id: vehicleId,
          start_time: now,
          end_time: now,
          start_address: `Lat: ${telemetry.latitude.toFixed(3)}, Lon: ${telemetry.longitude.toFixed(3)}`,
          end_address: 'En curso...',
          distance_km: 0,
          duration_minutes: 1,
          energy_used_kwh: 0,
          consumption_wh_km: 175,
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
        // Acumular distancia si nos hemos desplazado
        if (this.activeDriveLastCoords) {
          const deltaKm = this.calculateDistanceKm(
            this.activeDriveLastCoords.lat,
            this.activeDriveLastCoords.lng,
            currentCoords.lat,
            currentCoords.lng
          );
          if (deltaKm > 0.02 && deltaKm < 5.0) { // Filtrar saltos de GPS anómalos
            this.activeDriveAccumulatedKm += deltaKm;
            this.activeDriveLastCoords = currentCoords;
          }
        }

        const point: DrivePoint = {
          drive_id: this.activeDriveId,
          timestamp: now,
          latitude: telemetry.latitude,
          longitude: telemetry.longitude,
          speed_kmh: telemetry.speed_kmh,
          power_kw: telemetry.power_kw,
          battery_level: telemetry.battery_level,
          elevation_m: 650,
          heading: telemetry.heading,
        };
        await db.drive_points.add(point);
        this.activeDrivePointsCount++;

        const durationMin = Math.max(1, Math.round((now - this.activeDriveStartTime!) / 60000));
        const estimatedKm = +(this.activeDriveAccumulatedKm).toFixed(1);
        const socDiff = Math.max(0, (this.activeDriveStartSoc || telemetry.battery_level) - telemetry.battery_level);
        const packKwh = this.currentVehicle?.battery_capacity_kwh || 60;
        const kwhUsed = +((socDiff / 100) * packKwh).toFixed(1);
        const whKm = estimatedKm > 0.2 ? Math.round((kwhUsed * 1000) / estimatedKm) : 175;

        await db.drives.update(this.activeDriveId, {
          end_time: now,
          end_address: `Lat: ${telemetry.latitude.toFixed(3)}, Lon: ${telemetry.longitude.toFixed(3)}`,
          distance_km: estimatedKm,
          duration_minutes: durationMin,
          energy_used_kwh: kwhUsed,
          consumption_wh_km: whKm,
          end_soc: telemetry.battery_level,
          speed_max_kmh: Math.max(telemetry.speed_kmh, 0),
        });
      }
    } else {
      if (this.activeDriveId) {
        await db.drives.update(this.activeDriveId, {
          end_time: Date.now(),
        });
        this.activeDriveId = null;
        this.activeDriveStartTime = null;
        this.activeDriveLastCoords = null;
        this.activeDriveAccumulatedKm = 0;
      }
    }
  }

  // Registro de Cargas en vivo
  private async processChargeTracking(telemetry: VehicleTelemetry, vehicleId: string) {
    const isCharging = telemetry.state === 'charging' || telemetry.charging_state === 'Charging';

    if (isCharging) {
      const now = Date.now();
      if (!this.activeChargeId) {
        this.activeChargeStartTime = now;
        this.activeChargeStartSoc = telemetry.battery_level;

        const isSupercharger = telemetry.charger_power > 50;
        const newCharge: ChargeRecord = {
          vehicle_id: vehicleId,
          start_time: now,
          end_time: now,
          location: isSupercharger ? 'Tesla Supercharger' : 'Punto de Carga AC',
          energy_added_kwh: telemetry.charge_energy_added || 0.1,
          start_soc: telemetry.battery_level,
          end_soc: telemetry.battery_level,
          duration_minutes: 0,
          max_power_kw: telemetry.charger_power,
          charger_type: isSupercharger ? 'Supercharger' : 'Home (AC)',
          cost_eur: 0,
        };
        this.activeChargeId = (await db.charges.add(newCharge)) as number;
      }

      if (this.activeChargeId) {
        await db.charge_points.add({
          charge_id: this.activeChargeId,
          timestamp: now,
          battery_level: telemetry.battery_level,
          charger_power_kw: telemetry.charger_power,
          charger_voltage: telemetry.charger_voltage,
          charger_actual_current: telemetry.charger_actual_current,
        });

        const durationMin = Math.round((now - this.activeChargeStartTime!) / 60000);
        const kwh = +(telemetry.charge_energy_added || 0.1).toFixed(1);
        const isSupercharger = telemetry.charger_power > 50;
        const costEur = +(kwh * (isSupercharger ? 0.38 : 0.15)).toFixed(2);

        await db.charges.update(this.activeChargeId, {
          end_time: now,
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

  // Registro de Pérdida en Reposo (Vampire Drain)
  private async processVampireTracking(telemetry: VehicleTelemetry, vehicleId: string) {
    const isSleeping = telemetry.state === 'asleep';
    const now = Date.now();

    if (isSleeping) {
      if (!this.sleepStartTime) {
        this.sleepStartTime = now;
        this.sleepStartSoc = telemetry.battery_level;
      }
    } else {
      if (this.sleepStartTime && this.sleepStartSoc !== null) {
        const durationHours = +((now - this.sleepStartTime) / 3600000).toFixed(1);
        const lossSoc = +(Math.max(0, this.sleepStartSoc - telemetry.battery_level)).toFixed(1);

        // Registrar solo si durmió más de 45 minutos y hubo pérdida detectable
        if (durationHours >= 0.75 && lossSoc > 0) {
          const packCap = this.currentVehicle?.battery_capacity_kwh || 60;
          const lossKwh = +((lossSoc / 100) * packCap).toFixed(2);
          const lossKm = Math.round(lossSoc * 5.2);

          const drainRecord: VampireDrainRecord = {
            vehicle_id: vehicleId,
            start_time: this.sleepStartTime,
            end_time: now,
            duration_hours: durationHours,
            start_soc: this.sleepStartSoc,
            end_soc: telemetry.battery_level,
            loss_soc: lossSoc,
            loss_kwh: lossKwh,
            loss_km: lossKm,
            outside_temp_avg: telemetry.outside_temp,
          };
          await db.vampire_drain.add(drainRecord);
        }

        this.sleepStartTime = null;
        this.sleepStartSoc = null;
      }
    }
  }

  // Registro diario de estado de salud celular (Battery Health)
  private async recordBatterySnapshot(vehicle: Vehicle | null, telemetry: VehicleTelemetry) {
    if (!vehicle || telemetry.battery_level <= 0) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const existingToday = await db.battery_health
        .where('vehicle_id')
        .equals(vehicle.id)
        .filter(h => h.date === today)
        .first();

      if (!existingToday) {
        const originalCap = vehicle.battery_capacity_kwh || 60;
        const estFullRange = telemetry.battery_range_km && telemetry.battery_level > 0
          ? Math.round((telemetry.battery_range_km / (telemetry.battery_level / 100)))
          : 418;
        const baselineRange = originalCap <= 65 ? 418 : 533; // Estándar oficial EPA para LFP 60kWh vs NMC 75kWh
        const degPercent = Math.max(0, Math.min(25, +((1 - (estFullRange / baselineRange)) * 100).toFixed(1)));
        const nominalPack = +(originalCap * (1 - (degPercent / 100))).toFixed(1);

        await db.battery_health.add({
          vehicle_id: vehicle.id,
          date: today,
          odometer_km: vehicle.odometer || 0,
          nominal_full_pack_kwh: nominalPack,
          original_capacity_kwh: originalCap,
          degradation_percent: degPercent,
          max_range_100_percent_km: estFullRange,
        });
      }
    } catch (err) {
      console.warn('Error registrando snapshot de batería:', err);
    }
  }
}

export const backgroundSync = new BackgroundSyncService();
