import { db } from './database';
import type { Vehicle, DriveRecord, DrivePoint, ChargeRecord, ChargePoint, VampireDrainRecord, BatteryHealthRecord, SavedRoute } from '../types/tesla';

const DEMO_VEHICLE_ID = 'tesla_model_y_lr_01';
const DEMO_VIN = 'XP7YGCEL5PB104928';

/**
 * Elimina completamente todos los datos de demostración o datos ficticios
 * pre-cargados que no hayan sido realizados realmente por el usuario o sincronizados desde la API.
 */
export async function purgeDemoSeedData(): Promise<{ deletedDrives: number; deletedCharges: number }> {
  let deletedDrivesCount = 0;
  let deletedChargesCount = 0;

  try {
    // 1. Eliminar viajes demo y sus puntos GPS
    const demoDrives = await db.drives
      .filter(d => 
        d.vehicle_id === DEMO_VEHICLE_ID || 
        d.name === 'Subida a Navacerrada' || 
        d.name === 'Descenso Navacerrada' ||
        d.start_address === 'Paseo de la Castellana, Madrid'
      )
      .toArray();

    deletedDrivesCount = demoDrives.length;
    for (const drive of demoDrives) {
      if (drive.id) {
        await db.drive_points.where('drive_id').equals(drive.id).delete();
        await db.drives.delete(drive.id);
      }
    }

    // 2. Eliminar cargas demo y sus puntos
    const demoCharges = await db.charges
      .filter(c => 
        c.vehicle_id === DEMO_VEHICLE_ID ||
        c.location.includes('Las Rozas') ||
        c.location.includes('Wallbox 7.4 kW')
      )
      .toArray();

    deletedChargesCount = demoCharges.length;
    for (const charge of demoCharges) {
      if (charge.id) {
        await db.charge_points.where('charge_id').equals(charge.id).delete();
        await db.charges.delete(charge.id);
      }
    }

    // 3. Eliminar registros de degradación y reposo demo
    await db.battery_health.where('vehicle_id').equals(DEMO_VEHICLE_ID).delete();
    await db.vampire_drain.where('vehicle_id').equals(DEMO_VEHICLE_ID).delete();

    // 4. Eliminar rutas guardadas demo
    await db.saved_routes.filter(r => r.name === 'Ruta Panorámica Guadarrama').delete();

    // 5. Eliminar vehículo demo si existe
    await db.vehicles.delete(DEMO_VEHICLE_ID);
    const demoByVin = await db.vehicles.where('vin').equals(DEMO_VIN).first();
    if (demoByVin) {
      await db.vehicles.delete(demoByVin.id);
    }
  } catch (err) {
    console.warn('Aviso limpiando datos demo:', err);
  }

  return { deletedDrives: deletedDrivesCount, deletedCharges: deletedChargesCount };
}

/**
 * Inicialización limpia de la app: no inserta datos simulados ni ficticios.
 * En su lugar, asegura que la base de datos esté libre de rastros demo anteriores.
 */
export async function initializeSeedDataIfEmpty(): Promise<void> {
  // Limpiar cualquier residuo de demos anteriores para que sólo existan datos reales de la API
  await purgeDemoSeedData();
}
