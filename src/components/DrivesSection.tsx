import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Navigation, 
  Clock, 
  Gauge, 
  Zap, 
  Download, 
  Bookmark, 
  Calendar, 
  MapPin, 
  ChevronRight, 
  TrendingDown, 
  Sparkles, 
  RefreshCw, 
  Check,
  X,
  Star,
  Maximize2
} from 'lucide-react';
import type { DriveRecord, DrivePoint, SavedRoute } from '../types/tesla';
import { db } from '../db/database';
import { LeafletMapView } from './LeafletMapView';
import { CsvExporter } from '../services/csvExporter';
import { tessieApi } from '../services/tessieApi';

interface DrivesSectionProps {
  onBack: () => void;
  onSaveAsRoute?: (drive: DriveRecord, points: DrivePoint[]) => void;
  onSyncTessie?: () => Promise<{ success: boolean; message: string }>;
}

export const DrivesSection: React.FC<DrivesSectionProps> = ({ 
  onBack, 
  onSaveAsRoute,
  onSyncTessie 
}) => {
  const [drives, setDrives] = useState<DriveRecord[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<DriveRecord | null>(null);
  const [selectedDrivePoints, setSelectedDrivePoints] = useState<DrivePoint[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLoadingPoints, setIsLoadingPoints] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [savedRouteFeedback, setSavedRouteFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadDrives();
  }, []);

  const loadDrives = async () => {
    const list = await db.drives.orderBy('start_time').reverse().toArray();
    setDrives(list);
    if (list.length > 0) {
      handleSelectDrive(list[0], false);
    } else {
      setSelectedDrive(null);
      setSelectedDrivePoints([]);
    }
  };

  const handleSelectDrive = async (drive: DriveRecord, openModal = false) => {
    setSelectedDrive(drive);
    if (openModal) {
      setIsDetailModalOpen(true);
    }

    if (drive.id) {
      let points = await db.drive_points.where('drive_id').equals(drive.id).sortBy('timestamp');

      // Si no hay puntos GPS, intentar descargarlos en segundo plano desde Tessie
      if (points.length === 0) {
        setIsLoadingPoints(true);
        try {
          const tessiePoints = await tessieApi.getDrivingPath(drive.vehicle_id, drive.start_time, drive.end_time);
          if (tessiePoints.length > 0) {
            const pointsWithId = tessiePoints.map(p => ({ ...p, drive_id: drive.id! }));
            await db.drive_points.bulkAdd(pointsWithId);
            points = await db.drive_points.where('drive_id').equals(drive.id).sortBy('timestamp');
          }
        } catch (err) {
          console.warn('Error recuperando ruta de Tessie:', err);
        } finally {
          setIsLoadingPoints(false);
        }
      }

      // Si aún no hay puntos detallados pero tenemos coordenadas de salida y llegada, sintetizarlas
      if (points.length === 0 && drive.starting_latitude && drive.ending_latitude) {
        const syntheticPoints: DrivePoint[] = [
          {
            drive_id: drive.id,
            timestamp: drive.start_time,
            latitude: drive.starting_latitude,
            longitude: drive.starting_longitude || 0,
            speed_kmh: drive.speed_avg_kmh || 50,
            power_kw: 15,
            battery_level: drive.start_soc || 60,
            elevation_m: 650,
            heading: 0,
          },
          {
            drive_id: drive.id,
            timestamp: drive.end_time,
            latitude: drive.ending_latitude,
            longitude: drive.ending_longitude || 0,
            speed_kmh: 0,
            power_kw: 0,
            battery_level: drive.end_soc || 59,
            elevation_m: 650,
            heading: 0,
          }
        ];
        await db.drive_points.bulkAdd(syntheticPoints);
        points = syntheticPoints;
      }

      setSelectedDrivePoints(points);
    }
  };

  const handleFetchPointsForSelectedDrive = async () => {
    if (!selectedDrive || !selectedDrive.id) return;
    setIsLoadingPoints(true);
    try {
      const tessiePoints = await tessieApi.getDrivingPath(selectedDrive.vehicle_id, selectedDrive.start_time, selectedDrive.end_time);
      if (tessiePoints.length > 0) {
        await db.drive_points.where('drive_id').equals(selectedDrive.id).delete();
        const pointsWithId = tessiePoints.map(p => ({ ...p, drive_id: selectedDrive.id! }));
        await db.drive_points.bulkAdd(pointsWithId);
        setSelectedDrivePoints(pointsWithId);
        setSyncFeedback('¡Ruta GPS de alta precisión descargada con éxito!');
        setTimeout(() => setSyncFeedback(null), 4000);
      } else {
        setSyncFeedback('Tessie no dispone de puntos GPS detallados para este viaje histórico.');
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    } catch (err: any) {
      setSyncFeedback(err.message || 'Error al descargar puntos GPS');
    } finally {
      setIsLoadingPoints(false);
    }
  };

  const handleSaveAsFavorite = async (drive: DriveRecord) => {
    try {
      const points = selectedDrivePoints.length > 0 
        ? selectedDrivePoints 
        : (drive.id ? await db.drive_points.where('drive_id').equals(drive.id).toArray() : []);

      const routePoints = points.map(p => ({
        lat: p.latitude,
        lng: p.longitude,
        speed: p.speed_kmh,
        power: p.power_kw,
        elevation: p.elevation_m || 650,
      }));

      const newRoute: SavedRoute = {
        name: drive.name || `${drive.start_address.split(',')[0]} → ${drive.end_address.split(',')[0]}`,
        description: `Trayecto guardado (${drive.distance_km} km, ${drive.consumption_wh_km} Wh/km)`,
        created_at: Date.now(),
        distance_km: drive.distance_km,
        duration_minutes: drive.duration_minutes,
        consumption_wh_km: drive.consumption_wh_km,
        points: routePoints,
      };

      await db.saved_routes.add(newRoute);
      setSavedRouteFeedback('⭐ ¡Trayecto guardado en tus Rutas Favoritas!');
      setTimeout(() => setSavedRouteFeedback(null), 4000);
    } catch (err: any) {
      alert('Error al guardar en rutas: ' + err.message);
    }
  };

  const handleManualSync = async () => {
    if (!onSyncTessie) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await onSyncTessie();
      setSyncFeedback(res.message);
      await loadDrives();
      setTimeout(() => setSyncFeedback(null), 6000);
    } catch (err: any) {
      setSyncFeedback(err.message || 'Error al sincronizar');
    } finally {
      setIsSyncing(false);
    }
  };

  const totalKm = drives.reduce((acc, d) => acc + d.distance_km, 0);
  const avgEfficiency = drives.length > 0
    ? Math.round(drives.reduce((acc, d) => acc + d.consumption_wh_km, 0) / drives.length)
    : 0;

  return (
    <div className="space-y-4 pb-20">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-gray-300 hover:text-white transition border border-white/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white font-heading">Historial de Trayectos</h2>
            <p className="text-xs text-gray-400">Mapas gratuitos, consumo Wh/km y telemetría GPS</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSyncTessie && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Sincronizar viajes de Tessie"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 active:scale-95 text-xs font-semibold border border-cyan-500/30 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Tessie'}</span>
            </button>
          )}

          {drives.length > 0 && (
            <button
              onClick={() => CsvExporter.exportDrives()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 active:scale-95 text-xs font-semibold border border-indigo-500/30 transition"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          )}
        </div>
      </div>

      {/* Feedback de sincronización */}
      {syncFeedback && (
        <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Métricas Globales de Viajes */}
      <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
        <div className="glass-panel p-3 rounded-2xl border border-white/5">
          <div className="text-gray-400">Distancia Registrada</div>
          <div className="text-base font-bold text-white font-heading mt-0.5">{totalKm.toFixed(1)} km</div>
          <div className="text-[10px] text-gray-400">{drives.length} viajes</div>
        </div>
        <div className="glass-panel p-3 rounded-2xl border border-white/5">
          <div className="text-gray-400">Consumo Medio</div>
          <div className="text-base font-bold text-emerald-400 font-heading mt-0.5">
            {avgEfficiency > 0 ? `${avgEfficiency} Wh/km` : '--'}
          </div>
          <div className="text-[10px] text-emerald-400/80">{avgEfficiency > 0 ? 'Eficiente' : 'Sin datos'}</div>
        </div>
        <div className="glass-panel p-3 rounded-2xl border border-white/5">
          <div className="text-gray-400">Regeneración</div>
          <div className="text-base font-bold text-cyan-400 font-heading mt-0.5">
            {drives.length > 0 ? '~18%' : '--'}
          </div>
          <div className="text-[10px] text-gray-400">{drives.length > 0 ? 'recuperado' : 'Sin datos'}</div>
        </div>
      </div>

      {/* Estado vacío si no hay viajes */}
      {drives.length === 0 && (
        <div className="glass-panel p-8 rounded-2xl border border-white/10 text-center space-y-4 animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
            <Navigation className="w-7 h-7" />
          </div>
          <div className="max-w-sm mx-auto">
            <h3 className="text-base font-bold text-white font-heading">Sin trayectos registrados aún</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Tus trayectos se registrarán automáticamente mientras conduces. Si ya tienes viajes guardados en tu cuenta de Tessie, puedes importarlos todos ahora mismo.
            </p>
          </div>
          {onSyncTessie && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando viajes...' : 'Recoger viajes guardados en Tessie'}
            </button>
          )}
        </div>
      )}

      {/* Feedback de guardado en rutas */}
      {savedRouteFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 shrink-0" />
          <span>{savedRouteFeedback}</span>
        </div>
      )}

      {/* Mapa del Viaje Seleccionado */}
      {selectedDrive && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-heading">
              Trayecto Seleccionado: {selectedDrive.name || selectedDrive.end_address}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDetailModalOpen(true)}
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Maximize2 className="w-3 h-3" />
                Ampliar Mapa
              </button>
              {selectedDrive.id && (
                <button
                  onClick={() => CsvExporter.exportGpsBreadcrumbs(selectedDrive.id!)}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Descargar GPS (CSV)
                </button>
              )}
            </div>
          </div>

          <LeafletMapView
            points={selectedDrivePoints}
            startAddress={selectedDrive.start_address}
            endAddress={selectedDrive.end_address}
            heightClass="h-64"
            onFetchPoints={handleFetchPointsForSelectedDrive}
            isLoadingPoints={isLoadingPoints}
          />

          {/* Tarjeta Detallada del Viaje */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{selectedDrive.start_address} → {selectedDrive.end_address}</span>
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(selectedDrive.start_time).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <span>•</span>
                  <span>{selectedDrive.duration_minutes} min</span>
                </div>
              </div>

              <button
                onClick={() => handleSaveAsFavorite(selectedDrive)}
                className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition active:scale-95 shrink-0"
                title="Guardar en Rutas Favoritas"
              >
                <Star className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                <span className="hidden sm:inline">Guardar en Rutas</span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5 text-center text-xs">
              <div>
                <span className="text-gray-400 block text-[10px]">Distancia</span>
                <span className="font-bold text-white">{selectedDrive.distance_km} km</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Eficiencia</span>
                <span className="font-bold text-emerald-400">{selectedDrive.consumption_wh_km} Wh/km</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Energía</span>
                <span className="font-bold text-white">{selectedDrive.energy_used_kwh} kWh</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Batería</span>
                <span className="font-bold text-amber-400">{selectedDrive.start_soc}% → {selectedDrive.end_soc}%</span>
              </div>
            </div>

            <button
              onClick={() => setIsDetailModalOpen(true)}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/5 transition"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Abrir Detalles y Mapa Completo</span>
            </button>
          </div>
        </div>
      )}

      {/* Lista de Viajes */}
      {drives.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-heading">
              Todos los Viajes Registrados ({drives.length})
            </h3>
            <span className="text-[11px] text-gray-500">Toca para abrir mapa y detalles</span>
          </div>

          {drives.map((drive) => {
            const isSelected = selectedDrive?.id === drive.id;
            return (
              <div
                key={drive.id || drive.start_time}
                onClick={() => handleSelectDrive(drive, true)}
                className={`p-3.5 rounded-2xl glass-panel-interactive border cursor-pointer transition ${
                  isSelected ? 'border-indigo-500/50 bg-indigo-950/20' : 'border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white">
                      {drive.name || `${drive.start_address.split(',')[0]} → ${drive.end_address.split(',')[0]}`}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                      <span>{new Date(drive.start_time).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                      <span>•</span>
                      <span>{drive.distance_km} km</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-medium">{drive.consumption_wh_km} Wh/km</span>
                      <span>•</span>
                      <span className="text-gray-300 font-medium">{drive.duration_minutes} min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-cyan-400 font-semibold px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      Abrir
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DETALLES DEL TRAYECTO SELECCIONADO */}
      {isDetailModalOpen && selectedDrive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 safe-modal bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl glass-panel p-4 sm:p-5 border border-white/10 space-y-3.5 shadow-2xl relative max-h-[88vh] overflow-y-auto">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white font-heading truncate max-w-[260px] sm:max-w-xs">
                    {selectedDrive.name || selectedDrive.end_address.split(',')[0]}
                  </h3>
                  <div className="text-[11px] text-gray-400">
                    {new Date(selectedDrive.start_time).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })} • {selectedDrive.duration_minutes} min
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tarjeta de Direcciones */}
            <div className="bg-black/40 p-3 rounded-xl border border-white/5 text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-gray-400 shrink-0">Origen:</span>
                <span className="font-medium text-white truncate">{selectedDrive.start_address}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
                <span className="text-gray-400 shrink-0">Destino:</span>
                <span className="font-medium text-white truncate">{selectedDrive.end_address}</span>
              </div>
            </div>

            {/* Mapa Leaflet dentro del Modal */}
            <LeafletMapView
              points={selectedDrivePoints}
              startAddress={selectedDrive.start_address}
              endAddress={selectedDrive.end_address}
              heightClass="h-72"
              onFetchPoints={handleFetchPointsForSelectedDrive}
              isLoadingPoints={isLoadingPoints}
            />

            {/* Grid de Métricas Principales */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-gray-400 block">Distancia</span>
                <span className="font-bold text-white text-sm mt-0.5">{selectedDrive.distance_km} km</span>
              </div>
              <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-gray-400 block">Eficiencia</span>
                <span className="font-bold text-emerald-400 text-sm mt-0.5">{selectedDrive.consumption_wh_km} Wh/km</span>
              </div>
              <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-gray-400 block">Energía</span>
                <span className="font-bold text-white text-sm mt-0.5">{selectedDrive.energy_used_kwh} kWh</span>
              </div>
              <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-gray-400 block">Batería</span>
                <span className="font-bold text-amber-400 text-sm mt-0.5">{selectedDrive.start_soc}% → {selectedDrive.end_soc}%</span>
              </div>
            </div>

            {/* Métricas Adicionales: Velocidades y Clima */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-gray-400 block">Vel. Media</span>
                <span className="font-bold text-white">{selectedDrive.speed_avg_kmh} km/h</span>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-gray-400 block">Vel. Máxima</span>
                <span className="font-bold text-white">{selectedDrive.speed_max_kmh} km/h</span>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-gray-400 block">Temp. Ext.</span>
                <span className="font-bold text-cyan-300">{selectedDrive.outside_temp_avg} °C</span>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => handleSaveAsFavorite(selectedDrive)}
                className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-500/30 transition"
              >
                <Star className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                <span>Guardar en Rutas</span>
              </button>

              <button
                onClick={() => CsvExporter.exportGpsBreadcrumbs(selectedDrive.id!)}
                className="py-2.5 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-95 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-cyan-500/30 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
