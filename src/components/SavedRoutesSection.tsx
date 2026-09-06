import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Bookmark, 
  Play, 
  Square, 
  MapPin, 
  Calendar, 
  Clock, 
  Navigation, 
  Download, 
  Plus, 
  Trash2,
  Share2,
  ExternalLink
} from 'lucide-react';
import type { SavedRoute, DrivePoint } from '../types/tesla';
import { db } from '../db/database';
import { LeafletMapView } from './LeafletMapView';
import { CsvExporter } from '../services/csvExporter';

interface SavedRoutesSectionProps {
  onBack: () => void;
  currentTelemetryCoords?: { lat: number; lng: number; speed: number; power: number } | null;
}

export const SavedRoutesSection: React.FC<SavedRoutesSectionProps> = ({
  onBack,
  currentTelemetryCoords,
}) => {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<SavedRoute | null>(null);
  
  // Grabadora en vivo
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedPoints, setRecordedPoints] = useState<any[]>([]);
  const [recordStart, setRecordStart] = useState<number | null>(null);
  const [routeNameInput, setRouteNameInput] = useState<string>('');

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    const list = await db.saved_routes.orderBy('created_at').reverse().toArray();
    setRoutes(list);
    if (list.length > 0) {
      setSelectedRoute(list[0]);
    }
  };

  // Ciclo de grabación si está activo
  useEffect(() => {
    if (!isRecording) return;
    if (!currentTelemetryCoords) return;

    const interval = setInterval(() => {
      setRecordedPoints(prev => [
        ...prev,
        {
          lat: currentTelemetryCoords.lat + (Math.random() - 0.5) * 0.002,
          lng: currentTelemetryCoords.lng + (Math.random() - 0.5) * 0.002,
          speed: currentTelemetryCoords.speed || 50,
          power: currentTelemetryCoords.power || 20,
          elevation: 760,
        },
      ]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isRecording, currentTelemetryCoords]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordStart(Date.now());
    setRecordedPoints([]);
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    if (recordedPoints.length < 2) {
      alert('Se necesitan al menos 2 puntos GPS para guardar una ruta.');
      return;
    }

    const durationMin = recordStart ? Math.max(1, Math.round((Date.now() - recordStart) / 60000)) : 1;
    const distanceKm = +(recordedPoints.length * 0.1).toFixed(1);

    const newRoute: SavedRoute = {
      name: routeNameInput.trim() || `Ruta Grabada ${new Date().toLocaleDateString('es-ES')}`,
      description: 'Grabación de trayecto realizada desde el móvil',
      created_at: Date.now(),
      distance_km: distanceKm,
      duration_minutes: durationMin,
      consumption_wh_km: 172,
      points: recordedPoints,
    };

    const id = await db.saved_routes.add(newRoute);
    newRoute.id = id as number;
    setRoutes(prev => [newRoute, ...prev]);
    setSelectedRoute(newRoute);
    setRouteNameInput('');
  };

  const handleDeleteRoute = async (id?: number) => {
    if (!id) return;
    if (confirm('¿Deseas eliminar esta ruta guardada?')) {
      await db.saved_routes.delete(id);
      const remaining = routes.filter(r => r.id !== id);
      setRoutes(remaining);
      setSelectedRoute(remaining[0] || null);
    }
  };

  // Convertir puntos de la ruta al formato compatible con LeafletMapView
  const mapPoints: DrivePoint[] = (selectedRoute?.points || []).map((p, idx) => ({
    drive_id: 1,
    timestamp: (selectedRoute?.created_at || Date.now()) + idx * 5000,
    latitude: p.lat,
    longitude: p.lng,
    speed_kmh: p.speed,
    power_kw: p.power,
    battery_level: 75,
    elevation_m: p.elevation,
    heading: 0,
  }));

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
            <h2 className="text-xl font-bold text-white font-heading">Guardar Rutas</h2>
            <p className="text-xs text-gray-400">Grabadora de trayectos, rutas favoritas y OpenStreetMap</p>
          </div>
        </div>
      </div>

      {/* Grabadora de Rutas en Vivo */}
      <div className={`p-4 rounded-2xl glass-panel border transition ${
        isRecording ? 'border-rose-500/40 glow-red' : 'border-white/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-gray-500'}`} />
            <h3 className="text-sm font-bold text-white font-heading">
              {isRecording ? 'Grabando Trayecto en Vivo...' : 'Grabadora de Ruta'}
            </h3>
          </div>
          {isRecording && (
            <span className="text-xs text-rose-400 font-bold">
              {recordedPoints.length} puntos GPS
            </span>
          )}
        </div>

        {isRecording ? (
          <div className="mt-3 space-y-3">
            <input
              type="text"
              placeholder="Nombre para esta ruta (ej. Viaje a la playa)"
              value={routeNameInput}
              onChange={(e) => setRouteNameInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
            />
            <button
              onClick={handleStopRecording}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition"
            >
              <Square className="w-4 h-4 fill-current" />
              Finalizar y Guardar Ruta
            </button>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Registra un nuevo recorrido con telemetría de frenada regenerativa y consumo.
            </p>
            <button
              onClick={handleStartRecording}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-600/20 transition whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Iniciar Grabación
            </button>
          </div>
        )}
      </div>

      {/* Visor de Ruta Seleccionada */}
      {selectedRoute && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-heading">
              Ruta Seleccionada: {selectedRoute.name}
            </h3>
            <button
              onClick={() => handleDeleteRoute(selectedRoute.id)}
              className="text-xs text-red-400 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
          </div>

          <LeafletMapView
            points={mapPoints}
            startAddress={selectedRoute.name}
            endAddress="Destino"
            heightClass="h-64"
          />

          <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{selectedRoute.name}</span>
              <span className="text-xs text-gray-400">
                {new Date(selectedRoute.created_at).toLocaleDateString('es-ES')}
              </span>
            </div>
            {selectedRoute.description && (
              <p className="text-xs text-gray-300">{selectedRoute.description}</p>
            )}

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center text-xs">
              <div>
                <span className="text-gray-400 block text-[10px]">Distancia</span>
                <span className="font-bold text-white">{selectedRoute.distance_km} km</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Duración</span>
                <span className="font-bold text-white">{selectedRoute.duration_minutes} min</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Eficiencia</span>
                <span className="font-bold text-emerald-400">{selectedRoute.consumption_wh_km} Wh/km</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Rutas Guardadas */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1 font-heading">
          Tus Rutas Guardadas ({routes.length})
        </h3>

        {routes.map((r) => {
          const isSelected = selectedRoute?.id === r.id;
          return (
            <div
              key={r.id || r.name}
              onClick={() => setSelectedRoute(r)}
              className={`p-3.5 rounded-2xl glass-panel-interactive border cursor-pointer ${
                isSelected ? 'border-rose-500/50 bg-rose-950/20' : 'border-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-rose-400" />
                    {r.name}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                    <span>{r.distance_km} km</span>
                    <span>•</span>
                    <span>{r.duration_minutes} min</span>
                    <span>•</span>
                    <span className="text-emerald-400">{r.consumption_wh_km} Wh/km</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                  Ver Mapa
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
