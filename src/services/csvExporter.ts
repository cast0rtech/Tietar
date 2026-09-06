// Exportador Universal a Formato CSV (RFC 4180) con UTF-8 BOM para Excel
import { db } from '../db/database';

export class CsvExporter {
  // Descarga o comparte un archivo CSV
  private static triggerDownload(csvContent: string, fileName: string) {
    // Añadir BOM (\uFEFF) para compatibilidad total con Excel en español
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Intentar Web Share API en dispositivos móviles
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'text/csv' })] })) {
      const file = new File([blob], fileName, { type: 'text/csv' });
      navigator.share({
        title: fileName,
        text: `Exportación de datos Tesla Local Stats: ${fileName}`,
        files: [file],
      }).catch(() => {
        // Fallback al enlace de descarga directa
        this.downloadViaLink(url, fileName);
      });
      return;
    }

    this.downloadViaLink(url, fileName);
  }

  private static downloadViaLink(url: string, fileName: string) {
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 1. Exportar Viajes / Trayectos
  static async exportDrives(): Promise<void> {
    const drives = await db.drives.toArray();
    if (drives.length === 0) {
      alert('No hay viajes registrados para exportar.');
      return;
    }

    const headers = [
      'ID',
      'Fecha Inicio',
      'Fecha Fin',
      'Origen',
      'Destino',
      'Distancia (km)',
      'Duración (min)',
      'Energía Usada (kWh)',
      'Consumo (Wh/km)',
      'Batería Inicial (%)',
      'Batería Final (%)',
      'Vel. Media (km/h)',
      'Vel. Máxima (km/h)',
      'Potencia Máx (kW)',
      'Regeneración Máx (kW)',
      'Temp. Exterior (°C)',
    ];

    const rows = drives.map(d => [
      d.id,
      `"${new Date(d.start_time).toLocaleString('es-ES')}"`,
      `"${new Date(d.end_time).toLocaleString('es-ES')}"`,
      `"${(d.start_address || '').replace(/"/g, '""')}"`,
      `"${(d.end_address || '').replace(/"/g, '""')}"`,
      d.distance_km,
      d.duration_minutes,
      d.energy_used_kwh,
      d.consumption_wh_km,
      d.start_soc,
      d.end_soc,
      d.speed_avg_kmh,
      d.speed_max_kmh,
      d.power_max_kw,
      d.power_min_kw,
      d.outside_temp_avg,
    ]);

    const csvString = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    this.triggerDownload(csvString, `Tesla_Viajes_${dateStr}.csv`);
  }

  // 2. Exportar Sesiones de Carga
  static async exportCharges(): Promise<void> {
    const charges = await db.charges.toArray();
    if (charges.length === 0) {
      alert('No hay sesiones de recarga registradas.');
      return;
    }

    const headers = [
      'ID',
      'Fecha Inicio',
      'Fecha Fin',
      'Ubicación',
      'Tipo Cargador',
      'Energía Añadida (kWh)',
      'Batería Inicial (%)',
      'Batería Final (%)',
      'Duración (min)',
      'Potencia Máx (kW)',
      'Coste (€)',
    ];

    const rows = charges.map(c => [
      c.id,
      `"${new Date(c.start_time).toLocaleString('es-ES')}"`,
      `"${new Date(c.end_time).toLocaleString('es-ES')}"`,
      `"${(c.location || '').replace(/"/g, '""')}"`,
      `"${c.charger_type}"`,
      c.energy_added_kwh,
      c.start_soc,
      c.end_soc,
      c.duration_minutes,
      c.max_power_kw,
      c.cost_eur || 0,
    ]);

    const csvString = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    this.triggerDownload(csvString, `Tesla_Recargas_${dateStr}.csv`);
  }

  // 3. Exportar Puntos GPS / Telemetría Cruda de un viaje o todos
  static async exportGpsBreadcrumbs(driveId?: number): Promise<void> {
    const query = driveId ? db.drive_points.where('drive_id').equals(driveId) : db.drive_points;
    const points = await query.toArray();

    if (points.length === 0) {
      alert('No hay coordenadas GPS para exportar.');
      return;
    }

    const headers = [
      'ID Punto',
      'ID Viaje',
      'Timestamp',
      'Fecha y Hora',
      'Latitud',
      'Longitud',
      'Velocidad (km/h)',
      'Potencia (kW)',
      'Batería (%)',
      'Altitud (m)',
      'Rumbo (°)',
    ];

    const rows = points.map(p => [
      p.id,
      p.drive_id,
      p.timestamp,
      `"${new Date(p.timestamp).toLocaleString('es-ES')}"`,
      p.latitude,
      p.longitude,
      p.speed_kmh,
      p.power_kw,
      p.battery_level,
      p.elevation_m,
      p.heading,
    ]);

    const csvString = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    const suffix = driveId ? `_Viaje_${driveId}` : '_Todos';
    this.triggerDownload(csvString, `Tesla_Telemetria_GPS${suffix}_${dateStr}.csv`);
  }

  // 4. Exportar Salud y Degradación de Batería
  static async exportBatteryHealth(): Promise<void> {
    const health = await db.battery_health.toArray();
    if (health.length === 0) {
      alert('No hay registros de degradación de batería.');
      return;
    }

    const headers = [
      'Fecha',
      'Odómetro (km)',
      'Capacidad Nominal Pack (kWh)',
      'Capacidad Original (kWh)',
      'Degradación (%)',
      'Autonomía Teórica 100% (km)',
    ];

    const rows = health.map(h => [
      h.date,
      h.odometer_km,
      h.nominal_full_pack_kwh,
      h.original_capacity_kwh,
      h.degradation_percent,
      h.max_range_100_percent_km,
    ]);

    const csvString = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    this.triggerDownload(csvString, `Tesla_Salud_Bateria_${dateStr}.csv`);
  }
}
