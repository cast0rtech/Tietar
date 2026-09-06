import React from 'react';
import { 
  BatteryCharging, 
  Zap, 
  Navigation, 
  Sliders, 
  Activity, 
  Bookmark,
  ChevronRight,
  Gauge,
  Thermometer,
  Shield,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import type { VehicleTelemetry, Vehicle } from '../types/tesla';

export type ActiveSection = 'home' | 'bateria' | 'carga' | 'trayectos' | 'comandos' | 'analisis_bateria' | 'guardar_rutas';

interface MainMenuGridProps {
  telemetry: VehicleTelemetry | null;
  vehicle: Vehicle | null;
  onSelectSection: (section: ActiveSection) => void;
  onExecuteQuickCommand: (cmd: string) => void;
  statsSummary: {
    lastDriveKm: number;
    lastDriveWhKm: number;
    totalDrivesCount: number;
    lastChargeKwh: number;
    healthPercent: number;
    savedRoutesCount: number;
  };
}

export const MainMenuGrid: React.FC<MainMenuGridProps> = ({
  telemetry,
  vehicle,
  onSelectSection,
  onExecuteQuickCommand,
  statsSummary,
}) => {
  const soc = telemetry?.battery_level ?? 76;
  const range = telemetry?.battery_range_km ?? 403;
  const isCharging = telemetry?.state === 'charging' || telemetry?.charging_state === 'Charging';
  const locked = telemetry?.locked ?? true;
  const climateOn = telemetry?.is_climate_on ?? false;

  // Color de batería dinámico
  const getBatteryColor = (level: number) => {
    if (level <= 20) return 'from-red-500 to-rose-600';
    if (level <= 45) return 'from-amber-500 to-orange-600';
    return 'from-emerald-500 to-teal-500';
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Banner Principal del Vehículo / Hero Telemetría */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-5 border border-white/10 shadow-2xl">
        <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
              Telemetría en Tiempo Real
            </div>
            <div className="text-2xl font-black text-white font-heading mt-0.5">
              {vehicle?.display_name || 'Tesla Model Y'}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-300 mt-2">
              <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                {vehicle?.odometer?.toLocaleString('es-ES') || '43.280'} km
              </span>
              <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                {telemetry?.inside_temp ?? 21}°C int / {telemetry?.outside_temp ?? 19}°C ext
              </span>
            </div>
          </div>

          {/* Medidor Rápido de Batería */}
          <div className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-white/10"
                  fill="transparent"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="4"
                  className={soc > 20 ? 'text-emerald-400' : 'text-red-500'}
                  fill="transparent"
                  strokeDasharray={150}
                  strokeDashoffset={150 - (150 * soc) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-bold text-white font-heading">{soc}%</span>
            </div>
            <div>
              <div className="text-xs text-gray-400">Autonomía</div>
              <div className="text-lg font-bold text-white tracking-tight">{range} km</div>
              <div className="text-[10px] text-emerald-400">Est: {telemetry?.est_battery_range_km ?? Math.round(range * 0.94)} km</div>
            </div>
          </div>
        </div>
      </div>

      {/* Título de Menús Principales */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 font-heading">
          Menús Principales
        </h2>
        <span className="text-xs text-gray-400">Selecciona para ver detalles</span>
      </div>

      {/* Grid de los 6 Menús Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* 1. BATERÍA */}
        <div
          onClick={() => onSelectSection('bateria')}
          className="glass-panel-interactive p-4 rounded-2xl cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                <BatteryCharging className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">Batería</h3>
                <p className="text-xs text-gray-400">Nivel, autonomía y reposo</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition group-hover:translate-x-0.5" />
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400">Nivel actual:</span>{' '}
              <span className="font-bold text-white">{soc}% ({range} km)</span>
            </div>
            <div className="text-emerald-400 font-medium">
              Vampire Drain: -0.9% / 24h
            </div>
          </div>
        </div>

        {/* 2. CARGA */}
        <div
          onClick={() => onSelectSection('carga')}
          className="glass-panel-interactive p-4 rounded-2xl cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">Carga</h3>
                <p className="text-xs text-gray-400">Sesiones, curvas y costes</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition group-hover:translate-x-0.5" />
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400">Estado:</span>{' '}
              <span className={isCharging ? 'text-cyan-400 font-bold' : 'text-gray-300'}>
                {isCharging ? `${telemetry?.charger_power} kW activo` : 'Desconectado'}
              </span>
            </div>
            <div className="text-gray-300 font-medium">
              Última: +{statsSummary.lastChargeKwh} kWh
            </div>
          </div>
        </div>

        {/* 3. TRAYECTOS */}
        <div
          onClick={() => onSelectSection('trayectos')}
          className="glass-panel-interactive p-4 rounded-2xl cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">Trayectos</h3>
                <p className="text-xs text-gray-400">Historial, consumos y mapa</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition group-hover:translate-x-0.5" />
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400">Último:</span>{' '}
              <span className="font-bold text-white">{statsSummary.lastDriveKm} km</span>
            </div>
            <div className="text-indigo-300 font-medium">
              {statsSummary.lastDriveWhKm} Wh/km • {statsSummary.totalDrivesCount} viajes
            </div>
          </div>
        </div>

        {/* 4. COMANDOS DEL VEHÍCULO */}
        <div
          onClick={() => onSelectSection('comandos')}
          className="glass-panel-interactive p-4 rounded-2xl cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600/20 to-rose-700/20 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-105 transition">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">Comandos del Vehículo</h3>
                <p className="text-xs text-gray-400">Control directo y remoto</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition group-hover:translate-x-0.5" />
          </div>

          {/* Botones de acción rápida dentro de la card */}
          <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExecuteQuickCommand(locked ? 'unlock' : 'lock');
              }}
              className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-xs text-gray-200 flex items-center justify-center gap-1.5 border border-white/5 transition"
            >
              <Shield className="w-3.5 h-3.5 text-red-400" />
              {locked ? 'Desbloquear' : 'Bloquear'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExecuteQuickCommand('climate_toggle');
              }}
              className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-xs text-gray-200 flex items-center justify-center gap-1.5 border border-white/5 transition"
            >
              <Flame className={`w-3.5 h-3.5 ${climateOn ? 'text-amber-400' : 'text-gray-400'}`} />
              {climateOn ? 'Clima 21°C On' : 'Clima Off'}
            </button>
          </div>
        </div>

        {/* 5. ANÁLISIS DE BATERÍA */}
        <div
          onClick={() => onSelectSection('analisis_bateria')}
          className="glass-panel-interactive p-4 rounded-2xl cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">Análisis de Batería</h3>
                <p className="text-xs text-gray-400">Salud, degradación y proyección</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition group-hover:translate-x-0.5" />
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400">Salud de celda:</span>{' '}
              <span className="font-bold text-emerald-400">{statsSummary.healthPercent}%</span>
            </div>
            <div className="text-gray-300 font-medium">
              Degradación: {(100 - statsSummary.healthPercent).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* 6. GUARDAR RUTAS */}
        <div
          onClick={() => onSelectSection('guardar_rutas')}
          className="glass-panel-interactive p-4 rounded-2xl cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">Guardar Rutas</h3>
                <p className="text-xs text-gray-400">Grabar, exportar y OpenStreetMap</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition group-hover:translate-x-0.5" />
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400">Rutas guardadas:</span>{' '}
              <span className="font-bold text-white">{statsSummary.savedRoutesCount}</span>
            </div>
            <div className="text-rose-400 font-medium flex items-center gap-1">
              <span>Ver mapa gratuito</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
