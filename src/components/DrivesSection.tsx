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
  Sparkles
} from 'lucide-react';
import type { DriveRecord, DrivePoint } from '../types/tesla';
import { db } from '../db/database';
import { LeafletMapView } from './LeafletMapView';
import { CsvExporter } from '../services/csvExporter';

interface DrivesSectionProps {
  onBack: () => void;
  onSaveAsRoute?: (drive: DriveRecord, points: DrivePoint[]) => void;
}

export const DrivesSection: React.FC<DrivesSectionProps> = ({ onBack, onSaveAsRoute }) => {
  const [drives, setDrives] = useState<DriveRecord[]>([]);
  const [selectedDrive, setSelectedDrive] = useState<DriveRecord | null>(null);
  const [selectedDrivePoints, setSelectedDrivePoints] = useState<DrivePoint[]>([]);

  useEffect(() => {
    loadDrives();
  }, []);

  const loadDrives = async () => {
    const list = await db.drives.orderBy('start_time').reverse().toArray();
    setDrives(list);
    if (list.length > 0) {
      handleSelectDrive(list[0]);
    }
  };

  const handleSelectDrive = async (drive: DriveRecord) => {
    setSelectedDrive(drive);
    if (drive.id) {
      const points = await db.drive_points.where('drive_id').equals(drive.id).sortBy('timestamp');
      setSelectedDrivePoints(points);
    }
  };

  const totalKm = drives.reduce((acc, d) => acc + d.distance_km, 0);
  const avgEfficiency = drives.length > 0
    ? Math.round(drives.reduce((acc, d) => acc + d.consumption_wh_km, 0) / drives.length)
    : 175;

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

        <button
          onClick={() => CsvExporter.exportDrives()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 active:scale-95 text-xs font-semibold border border-indigo-500/30 transition"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
      </div>

      {/* Métricas Globales de Viajes */}
      <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
        <div className="glass-panel p-3 rounded-2xl border border-white/5">
          <div className="text-gray-400">Distancia Registrada</div>
          <div className="text-base font-bold text-white font-heading mt-0.5">{totalKm.toFixed(1)} km</div>
          <div className="text-[10px] text-gray-400">{drives.length} viajes</div>
        </div>
        <div className="glass-panel p-3 rounded-2xl border border-white/5">
          <div className="text-gray-400">Consumo Medio</div>
          <div className="text-base font-bold text-emerald-400 font-heading mt-0.5">{avgEfficiency} Wh/km</div>
          <div className="text-[10px] text-emerald-400/80">Excelente</div>
        </div>
        <div className="glass-panel p-3 rounded-2xl border border-white/5">
          <div className="text-gray-400">Regeneración</div>
          <div className="text-base font-bold text-cyan-400 font-heading mt-0.5">~18%</div>
          <div className="text-[10px] text-gray-400">recuperado</div>
        </div>
      </div>

      {/* Mapa del Viaje Seleccionado */}
      {selectedDrive && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-heading">
              Trayecto Seleccionado: {selectedDrive.name || selectedDrive.end_address}
            </h3>
            {selectedDrive.id && (
              <button
                onClick={() => CsvExporter.exportGpsBreadcrumbs(selectedDrive.id)}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Descargar GPS (CSV)
              </button>
            )}
          </div>

          <LeafletMapView
            points={selectedDrivePoints}
            startAddress={selectedDrive.start_address}
            endAddress={selectedDrive.end_address}
            heightClass="h-64"
          />

          {/* Tarjeta Detallada del Viaje */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  {selectedDrive.start_address} → {selectedDrive.end_address}
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
          </div>
        </div>
      )}

      {/* Lista de Viajes */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1 font-heading">
          Todos los Viajes Registrados
        </h3>

        {drives.map((drive) => {
          const isSelected = selectedDrive?.id === drive.id;
          return (
            <div
              key={drive.id}
              onClick={() => handleSelectDrive(drive)}
              className={`p-3.5 rounded-2xl glass-panel-interactive border cursor-pointer ${
                isSelected ? 'border-indigo-500/50 bg-indigo-950/20' : 'border-white/5'
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
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
