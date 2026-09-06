import Dexie, { type EntityTable } from 'dexie';
import type { 
  Vehicle, 
  DriveRecord, 
  DrivePoint, 
  ChargeRecord, 
  ChargePoint, 
  VampireDrainRecord, 
  BatteryHealthRecord, 
  SavedRoute 
} from '../types/tesla';

export class TeslaStatsDatabase extends Dexie {
  vehicles!: EntityTable<Vehicle, 'id'>;
  drives!: EntityTable<DriveRecord, 'id'>;
  drive_points!: EntityTable<DrivePoint, 'id'>;
  charges!: EntityTable<ChargeRecord, 'id'>;
  charge_points!: EntityTable<ChargePoint, 'id'>;
  vampire_drain!: EntityTable<VampireDrainRecord, 'id'>;
  battery_health!: EntityTable<BatteryHealthRecord, 'id'>;
  saved_routes!: EntityTable<SavedRoute, 'id'>;

  constructor() {
    super('TeslaLocalStatsDB');
    this.version(1).stores({
      vehicles: 'id, vin, display_name',
      drives: '++id, vehicle_id, start_time, end_time, distance_km, is_favorite',
      drive_points: '++id, drive_id, timestamp',
      charges: '++id, vehicle_id, start_time, end_time, energy_added_kwh',
      charge_points: '++id, charge_id, timestamp',
      vampire_drain: '++id, vehicle_id, start_time, end_time',
      battery_health: '++id, vehicle_id, date, odometer_km',
      saved_routes: '++id, name, created_at'
    });
  }
}

export const db = new TeslaStatsDatabase();
