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
  ArrowUpRight,
  Link,
  Settings
} from 'lucide-react';
import type { VehicleTelemetry, Vehicle } from '../types/tesla';

export type ActiveSection = 'home' | 'bateria' | 'carga' | 'trayectos' | 'comandos' | 'analisis_bateria' | 'guardar_rutas';

interface MainMenuGridProps {
  telemetry: VehicleTelemetry | null;
  vehicle: Vehicle | null;
  onSelectSection: (section: ActiveSection) => void;
  onExecuteQuickCommand: (cmd: string) => void;
  onOpenSettings?: () => void;
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
  onOpenSettings,
  statsSummary,
}) => {
  const soc = telemetry?.battery_level ?? 0;
  const range = telemetry?.battery_range_km ?? 0;
  const isCharging = telemetry?.state === 'charging' || telemetry?.charging_state === 'Charging';
  const locked = telemetry?.locked ?? true;
  const climateOn = telemetry?.is_climate_on ?? false;

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
              {vehicle?.display_name || 'Tesla (Sin vincular)'}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-300 mt-2">
              <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                {vehicle?.odometer ? `${vehicle.odometer.toLocaleString('es-ES')} km` : '0 km'}
              </span>
              <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                {telemetry ? `${telemetry.inside_temp}°C int / ${telemetry.outside_temp}°C ext` : '--°C'}
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
                  strokeDashoffset={150 - (150 * (soc || 0)) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-bold text-white font-heading">{telemetry ? `${soc}%` : '--'}</span>
            </div>
            <div>
              <div className="text-xs text-gray-400">Autonomía</div>
              <div className="text-lg font-bold text-white tracking-tight">
                {telemetry ? `${range} km` : '-- km'}
              </div>
              <div className="text-[10px] text-emerald-400">
                {telemetry ? `Est: ${telemetry.est_battery_range_km || Math.round(range * 0.94)} km` : 'En espera'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de invitación a conectar si no hay vehículo vinculado */}
      {!vehicle && onOpenSettings && (
        <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between gap-3 animate-fadeIn">
          <div>
            <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Link className="w-4 h-4 text-cyan-400" />
              Conecta tu vehículo para ver datos reales
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Configura tu Token de Tessie o Tesla en Ajustes para registrar telemetría y recoger todo tu historial de viajes.
            </p>
          </div>
          <button
            onClick={onOpenSettings}
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shrink-0 shadow-lg shadow-cyan-600/20 transition"
          >
            Ajustes
          </button>
        </div>
      )}

      {/* Título de Menús Principales */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 font-heading">
          Menús Principales
        </h2>
        <span className="text-xs text-gray-400">Selecciona para ver detalles</span>
      </div>

      {/* Grid de los 6 Menús Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 landscape:grid-cols-2 gap-3.5">
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
              <span className="font-bold text-white">{telemetry ? `${soc}% (${range} km)` : 'Desconectado'}</span>
            </div>
            <div className="text-emerald-400 font-medium">
              {telemetry?.charging_state === 'Charging' ? 'Cargando' : (telemetry?.state === 'asleep' ? 'En reposo' : 'En línea')}
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
              {statsSummary.lastChargeKwh > 0 ? `Última: +${statsSummary.lastChargeKwh} kWh` : 'Sin cargas registradas'}
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
              <span className="font-bold text-white">
                {statsSummary.totalDrivesCount > 0 ? `${statsSummary.lastDriveKm} km` : 'Sin viajes'}
              </span>
            </div>
            <div className="text-indigo-300 font-medium">
              {statsSummary.totalDrivesCount > 0 
                ? `${statsSummary.lastDriveWhKm} Wh/km • ${statsSummary.totalDrivesCount} viajes`
                : '0 viajes registrados'}
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
              <span className="font-bold text-emerald-400">
                {statsSummary.healthPercent > 0 ? `${statsSummary.healthPercent}%` : '--'}
              </span>
            </div>
            <div className="text-gray-300 font-medium">
              {statsSummary.healthPercent > 0 
                ? `Degradación: ${(100 - statsSummary.healthPercent).toFixed(1)}%` 
                : 'Sin registros'}
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
              <span>Ver mapas</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
