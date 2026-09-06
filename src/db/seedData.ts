import { db } from './database';
import type { Vehicle, DriveRecord, DrivePoint, ChargeRecord, ChargePoint, VampireDrainRecord, BatteryHealthRecord, SavedRoute } from '../types/tesla';

export async function initializeSeedDataIfEmpty() {
  const vehicleCount = await db.vehicles.count();
  if (vehicleCount > 0) return; // Ya contiene datos

  // 1. Vehículo Principal
  const defaultVehicle: Vehicle = {
    id: 'tesla_model_y_lr_01',
    vehicle_id: 149292019,
    vin: 'XP7YGCEL5PB104928',
    display_name: 'Halcón Milenario',
    model: 'Model Y',
    trim: 'Long Range AWD',
    battery_capacity_kwh: 78.1,
    color: 'Solid Black',
    car_version: '2026.2.6',
    odometer: 43280,
    is_selected: true,
  };
  await db.vehicles.add(defaultVehicle);

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const oneHourMs = 60 * 60 * 1000;

  // 2. Histórico de Viajes (Drives) con coordenadas reales (Ruta Madrid - Sierra de Guadarrama)
  const drive1: DriveRecord = {
    vehicle_id: defaultVehicle.id,
    start_time: now - 3 * oneHourMs,
    end_time: now - 2 * oneHourMs,
    start_address: 'Paseo de la Castellana, Madrid',
    end_address: 'Puerto de Navacerrada, Madrid',
    distance_km: 56.4,
    duration_minutes: 54,
    energy_used_kwh: 11.2,
    consumption_wh_km: 198,
    start_soc: 82,
    end_soc: 68,
    speed_avg_kmh: 62.6,
    speed_max_kmh: 124,
    power_max_kw: 185,
    power_min_kw: -48, // Freno regenerativo
    outside_temp_avg: 18,
    is_favorite: true,
    name: 'Subida a Navacerrada',
  };
  const drive1Id = await db.drives.add(drive1);

  // Puntos GPS del trayecto 1 (Leaflet polilíneas)
  // Coordenadas aproximadas Madrid -> M-607 -> Navacerrada
  const rawCoords = [
    { lat: 40.465, lng: -3.688, speed: 45, p: 25, b: 82, alt: 720 },
    { lat: 40.490, lng: -3.705, speed: 90, p: 40, b: 81, alt: 740 },
    { lat: 40.540, lng: -3.730, speed: 115, p: 35, b: 80, alt: 760 },
    { lat: 40.600, lng: -3.765, speed: 120, p: 38, b: 78, alt: 800 },
    { lat: 40.660, lng: -3.820, speed: 100, p: 45, b: 76, alt: 910 },
    { lat: 40.710, lng: -3.900, speed: 75, p: 70, b: 73, alt: 1150 },
    { lat: 40.740, lng: -3.980, speed: 60, p: 95, b: 70, alt: 1450 },
    { lat: 40.788, lng: -4.004, speed: 45, p: 85, b: 68, alt: 1860 },
  ];

  const drive1Points: DrivePoint[] = rawCoords.map((c, i) => ({
    drive_id: drive1Id as number,
    timestamp: drive1.start_time + i * 7 * 60 * 1000,
    latitude: c.lat,
    longitude: c.lng,
    speed_kmh: c.speed,
    power_kw: c.p,
    battery_level: c.b,
    elevation_m: c.alt,
    heading: 330,
  }));
  await db.drive_points.bulkAdd(drive1Points);

  // Viaje 2 (Bajada con fuerte frenada regenerativa!)
  const drive2: DriveRecord = {
    vehicle_id: defaultVehicle.id,
    start_time: now - 1 * oneHourMs,
    end_time: now - 15 * 60 * 1000,
    start_address: 'Puerto de Navacerrada, Madrid',
    end_address: 'Collado Villalba, Madrid',
    distance_km: 24.8,
    duration_minutes: 28,
    energy_used_kwh: 1.4,
    consumption_wh_km: 56, // Muy bajo gracias a regeneración en bajada
    start_soc: 68,
    end_soc: 67, // Apenas consumió batería por regenerar
    speed_avg_kmh: 53.1,
    speed_max_kmh: 92,
    power_max_kw: 35,
    power_min_kw: -65,
    outside_temp_avg: 19,
    is_favorite: false,
    name: 'Descenso Navacerrada',
  };
  const drive2Id = await db.drives.add(drive2);

  const rawCoordsDown = [
    { lat: 40.788, lng: -4.004, speed: 40, p: -25, b: 68, alt: 1860 },
    { lat: 40.760, lng: -4.001, speed: 55, p: -45, b: 68, alt: 1600 },
    { lat: 40.730, lng: -3.980, speed: 65, p: -30, b: 68, alt: 1350 },
    { lat: 40.690, lng: -3.960, speed: 70, p: -15, b: 68, alt: 1100 },
    { lat: 40.635, lng: -3.990, speed: 85, p: 10, b: 67, alt: 910 },
  ];
  await db.drive_points.bulkAdd(
    rawCoordsDown.map((c, i) => ({
      drive_id: drive2Id as number,
      timestamp: drive2.start_time + i * 5 * 60 * 1000,
      latitude: c.lat,
      longitude: c.lng,
      speed_kmh: c.speed,
      power_kw: c.p,
      battery_level: c.b,
      elevation_m: c.alt,
      heading: 180,
    }))
  );

  // 3. Sesiones de Carga (Supercharger y Carga Doméstica)
  const charge1: ChargeRecord = {
    vehicle_id: defaultVehicle.id,
    start_time: now - 1 * oneDayMs,
    end_time: now - 1 * oneDayMs + 32 * 60 * 1000,
    location: 'Tesla Supercharger Las Rozas (V3 250kW)',
    energy_added_kwh: 48.5,
    start_soc: 16,
    end_soc: 80,
    duration_minutes: 32,
    max_power_kw: 248,
    charger_type: 'Supercharger',
    cost_eur: 18.91,
    cost_per_kwh: 0.39,
  };
  const charge1Id = await db.charges.add(charge1);

  // Curva de carga Supercharger (V3 empieza a 250kW y va modulando)
  const charge1Points: ChargePoint[] = [
    { charge_id: charge1Id as number, timestamp: charge1.start_time, battery_level: 16, charger_power_kw: 140, charger_voltage: 380, charger_actual_current: 370 },
    { charge_id: charge1Id as number, timestamp: charge1.start_time + 4 * 60000, battery_level: 25, charger_power_kw: 248, charger_voltage: 390, charger_actual_current: 635 },
    { charge_id: charge1Id as number, timestamp: charge1.start_time + 10 * 60000, battery_level: 42, charger_power_kw: 185, charger_voltage: 395, charger_actual_current: 470 },
    { charge_id: charge1Id as number, timestamp: charge1.start_time + 18 * 60000, battery_level: 60, charger_power_kw: 110, charger_voltage: 400, charger_actual_current: 275 },
    { charge_id: charge1Id as number, timestamp: charge1.start_time + 26 * 60000, battery_level: 72, charger_power_kw: 65, charger_voltage: 405, charger_actual_current: 160 },
    { charge_id: charge1Id as number, timestamp: charge1.end_time, battery_level: 80, charger_power_kw: 42, charger_voltage: 408, charger_actual_current: 102 },
  ];
  await db.charge_points.bulkAdd(charge1Points);

  const charge2: ChargeRecord = {
    vehicle_id: defaultVehicle.id,
    start_time: now - 3 * oneDayMs,
    end_time: now - 3 * oneDayMs + 6 * oneHourMs,
    location: 'Cargador Casa (Wallbox 7.4 kW)',
    energy_added_kwh: 36.2,
    start_soc: 34,
    end_soc: 80,
    duration_minutes: 360,
    max_power_kw: 7.4,
    charger_type: 'Home (AC)',
    cost_eur: 4.34, // 0.12 €/kWh tarifa valle
    cost_per_kwh: 0.12,
  };
  await db.charges.add(charge2);

  // 4. Registros de Pérdida en Reposo (Vampire Drain)
  const drains: VampireDrainRecord[] = [
    {
      vehicle_id: defaultVehicle.id,
      start_time: now - 2 * oneDayMs,
      end_time: now - 2 * oneDayMs + 18 * oneHourMs,
      duration_hours: 18,
      start_soc: 80,
      end_soc: 79,
      loss_soc: 1.0,
      loss_kwh: 0.78,
      loss_km: 4.8,
      outside_temp_avg: 15,
    },
    {
      vehicle_id: defaultVehicle.id,
      start_time: now - 5 * oneDayMs,
      end_time: now - 4 * oneDayMs,
      duration_hours: 24,
      start_soc: 65,
      end_soc: 63.5,
      loss_soc: 1.5,
      loss_kwh: 1.17,
      loss_km: 7.2,
      outside_temp_avg: 11,
    },
  ];
  await db.vampire_drain.bulkAdd(drains);

  // 5. Histórico de Salud de Batería (Degradación)
  const healthRecords: BatteryHealthRecord[] = [
    { vehicle_id: defaultVehicle.id, date: '2024-03-15', odometer_km: 50, nominal_full_pack_kwh: 78.1, original_capacity_kwh: 78.1, degradation_percent: 0.0, max_range_100_percent_km: 533 },
    { vehicle_id: defaultVehicle.id, date: '2024-09-20', odometer_km: 12400, nominal_full_pack_kwh: 77.0, original_capacity_kwh: 78.1, degradation_percent: 1.4, max_range_100_percent_km: 525 },
    { vehicle_id: defaultVehicle.id, date: '2025-04-10', odometer_km: 24800, nominal_full_pack_kwh: 76.1, original_capacity_kwh: 78.1, degradation_percent: 2.5, max_range_100_percent_km: 519 },
    { vehicle_id: defaultVehicle.id, date: '2025-11-05', odometer_km: 35100, nominal_full_pack_kwh: 75.4, original_capacity_kwh: 78.1, degradation_percent: 3.4, max_range_100_percent_km: 514 },
    { vehicle_id: defaultVehicle.id, date: '2026-06-18', odometer_km: 43280, nominal_full_pack_kwh: 74.9, original_capacity_kwh: 78.1, degradation_percent: 4.1, max_range_100_percent_km: 511 },
  ];
  await db.battery_health.bulkAdd(healthRecords);

  // 6. Rutas Guardadas (Favoritos del usuario)
  const savedRoute1: SavedRoute = {
    name: 'Ruta Panorámica Guadarrama',
    description: 'Subida desde Madrid por M-607 con preciosas vistas a la sierra',
    created_at: now - 3 * oneHourMs,
    distance_km: 56.4,
    duration_minutes: 54,
    consumption_wh_km: 198,
    points: rawCoords.map(c => ({
      lat: c.lat,
      lng: c.lng,
      speed: c.speed,
      power: c.p,
      elevation: c.alt,
    })),
  };
  await db.saved_routes.add(savedRoute1);
}
