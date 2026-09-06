// Servicio de Integración con Google Drive para Copia de Seguridad y Liberación de Espacio Móvil
import { db } from '../db/database';

export interface StorageStats {
  drivesCount: number;
  drivePointsCount: number;
  chargesCount: number;
  chargePointsCount: number;
  estimatedSizeBytes: number;
  estimatedSizeFormatted: string;
}

export class GoogleDriveService {
  private isConnected: boolean = false;
  private userEmail: string | null = null;

  // Obtener estadísticas de almacenamiento local
  static async getStorageStats(): Promise<StorageStats> {
    const drivesCount = await db.drives.count();
    const drivePointsCount = await db.drive_points.count();
    const chargesCount = await db.charges.count();
    const chargePointsCount = await db.charge_points.count();

    // Estimación de bytes (~120 bytes por punto GPS, ~300 por viaje/carga)
    const estimatedSizeBytes = drivePointsCount * 120 + chargePointsCount * 80 + (drivesCount + chargesCount) * 350;
    
    let formatted = `${(estimatedSizeBytes / 1024).toFixed(1)} KB`;
    if (estimatedSizeBytes > 1024 * 1024) {
      formatted = `${(estimatedSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return {
      drivesCount,
      drivePointsCount,
      chargesCount,
      chargePointsCount,
      estimatedSizeBytes,
      estimatedSizeFormatted: formatted,
    };
  }

  // Generar volcado completo de la base de datos en formato JSON
  static async createFullBackupJson(): Promise<string> {
    const backupData = {
      version: 1,
      createdAt: new Date().toISOString(),
      vehicles: await db.vehicles.toArray(),
      drives: await db.drives.toArray(),
      drive_points: await db.drive_points.toArray(),
      charges: await db.charges.toArray(),
      charge_points: await db.charge_points.toArray(),
      vampire_drain: await db.vampire_drain.toArray(),
      battery_health: await db.battery_health.toArray(),
      saved_routes: await db.saved_routes.toArray(),
    };

    return JSON.stringify(backupData, null, 2);
  }

  // Descarga local directa del archivo de copia de seguridad (compatible con Drive)
  static async downloadBackupFile(): Promise<void> {
    const jsonStr = await this.createFullBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `TeslaLocalStats_Backup_${dateStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Restaurar base de datos a partir de un archivo de copia
  static async restoreBackupFromJson(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      if (!data.vehicles || !data.drives) {
        throw new Error('El archivo no tiene el formato válido de Tesla Local Stats.');
      }

      // Limpiar y repoblar
      await db.transaction('rw', [
        db.vehicles,
        db.drives,
        db.drive_points,
        db.charges,
        db.charge_points,
        db.vampire_drain,
        db.battery_health,
        db.saved_routes,
      ], async () => {
        await db.vehicles.clear();
        await db.drives.clear();
        await db.drive_points.clear();
        await db.charges.clear();
        await db.charge_points.clear();
        await db.vampire_drain.clear();
        await db.battery_health.clear();
        await db.saved_routes.clear();

        if (data.vehicles?.length) await db.vehicles.bulkAdd(data.vehicles);
        if (data.drives?.length) await db.drives.bulkAdd(data.drives);
        if (data.drive_points?.length) await db.drive_points.bulkAdd(data.drive_points);
        if (data.charges?.length) await db.charges.bulkAdd(data.charges);
        if (data.charge_points?.length) await db.charge_points.bulkAdd(data.charge_points);
        if (data.vampire_drain?.length) await db.vampire_drain.bulkAdd(data.vampire_drain);
        if (data.battery_health?.length) await db.battery_health.bulkAdd(data.battery_health);
        if (data.saved_routes?.length) await db.saved_routes.bulkAdd(data.saved_routes);
      });

      return true;
    } catch (err: any) {
      console.error('Error restaurando backup:', err);
      throw err;
    }
  }

  // "Liberar Espacio": Archivar puntos GPS antiguos y eliminarlos del móvil conservando los resúmenes
  static async freeStorageArchiveOldPoints(olderThanDays: number = 30): Promise<{ pointsDeleted: number; spaceSavedFormatted: string }> {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    
    // Obtener los puntos a archivar
    const oldPoints = await db.drive_points.where('timestamp').below(cutoffTime).toArray();
    
    if (oldPoints.length === 0) {
      return { pointsDeleted: 0, spaceSavedFormatted: '0 KB' };
    }

    // Antes de borrarlos, generar automáticamente un archivo de exportación para Google Drive
    const archiveData = {
      archiveDate: new Date().toISOString(),
      olderThanDays,
      pointsCount: oldPoints.length,
      points: oldPoints,
    };
    
    const jsonStr = JSON.stringify(archiveData);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const fileName = `Tesla_Puntos_Archivados_Drive_${new Date().toISOString().slice(0, 10)}.json`;

    // Descargar copia de seguridad del archivo histórico
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Eliminar los puntos de la base de datos local
    const idsToDelete = oldPoints.map(p => p.id!).filter(Boolean);
    await db.drive_points.bulkDelete(idsToDelete);

    const bytesSaved = oldPoints.length * 120;
    const formatted = bytesSaved > 1024 * 1024 
      ? `${(bytesSaved / (1024 * 1024)).toFixed(1)} MB` 
      : `${(bytesSaved / 1024).toFixed(1)} KB`;

    return {
      pointsDeleted: oldPoints.length,
      spaceSavedFormatted: formatted,
    };
  }
}
