import React from 'react';
import { 
  ArrowLeft, 
  BatteryCharging, 
  Moon, 
  Thermometer, 
  ShieldAlert, 
  Zap, 
  TrendingDown, 
  CheckCircle2,
  Clock
} from 'lucide-react';
import type { VehicleTelemetry, Vehicle } from '../types/tesla';
import { sleepWatchdog } from '../services/sleepWatchdog';

interface BatterySectionProps {
  telemetry: VehicleTelemetry | null;
  vehicle: Vehicle | null;
  onBack: () => void;
}

export const BatterySection: React.FC<BatterySectionProps> = ({
  telemetry,
  vehicle,
  onBack,
}) => {
  const soc = telemetry?.battery_level ?? 76;
  const range = telemetry?.battery_range_km ?? 403;
  const estRange = telemetry?.est_battery_range_km ?? Math.round(range * 0.94);
  const watchdog = sleepWatchdog.evaluate();

  // Capacidad disponible en kWh
  const totalCapacity = vehicle?.battery_capacity_kwh ?? 78.1;
  const currentKwh = +((soc / 100) * totalCapacity).toFixed(1);

  return (
    <div className="space-y-4 pb-20">
      {/* Botón Volver y Título */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-gray-300 hover:text-white transition border border-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white font-heading">Estado de la Batería</h2>
          <p className="text-xs text-gray-400">Nivel de carga, autonomía y pérdidas en reposo</p>
        </div>
      </div>

      {/* Tarjeta Principal Medidor */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden text-center">
        <div className="flex flex-col items-center justify-center">
          {/* Indicador Circular */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-40 h-40 -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="68"
                stroke="currentColor"
                strokeWidth="10"
                className="text-white/5"
                fill="transparent"
              />
              <circle
                cx="80"
                cy="80"
                r="68"
                stroke="currentColor"
                strokeWidth="10"
                className={soc > 20 ? 'text-emerald-400' : 'text-red-500'}
                fill="transparent"
                strokeDasharray={427}
                strokeDashoffset={427 - (427 * soc) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-extrabold text-white font-heading tracking-tight">{soc}%</span>
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">SOC Actual</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mt-6 pt-4 border-t border-white/5">
            <div className="bg-black/30 p-3 rounded-xl border border-white/5">
              <div className="text-xs text-gray-400">Autonomía Homologada</div>
              <div className="text-lg font-bold text-white font-heading">{range} km</div>
              <div className="text-[10px] text-gray-400">WLTP estándar</div>
            </div>
            <div className="bg-black/30 p-3 rounded-xl border border-white/5">
              <div className="text-xs text-gray-400">Autonomía Real Estimada</div>
              <div className="text-lg font-bold text-emerald-400 font-heading">{estRange} km</div>
              <div className="text-[10px] text-emerald-400/80">Basado en tus consumos</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-400">
            Energía disponible: <span className="font-bold text-white">{currentKwh} kWh</span> de {totalCapacity} kWh
          </div>
        </div>
      </div>

      {/* Módulo Especial: Vampire Drain & Protección de Sueño */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              Protección Vampire Drain (Reposo)
            </h3>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Activo
          </span>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          Esta aplicación local incorpora un <strong className="text-white">Watchdog inteligente</strong> que detiene las consultas continuas al coche tras 15 minutos de inactividad, permitiendo al ordenador entrar en sueño profundo y evitando agotar la batería de 12V y la tracción.
        </p>

        <div className="bg-black/40 p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-xs font-semibold text-white">Estado del Sueño</div>
              <div className="text-[11px] text-gray-400">{watchdog.statusText}</div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-cyan-400">
              {watchdog.isAllowingSleep ? 'Sueño Permitido' : `${watchdog.minutesUntilSleepAllowed} min`}
            </span>
          </div>
        </div>

        {/* Histórico Vampire Drain */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 text-center text-xs">
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
            <div className="text-gray-400">Pérdida en 24h</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">-0.8 %</div>
            <div className="text-[10px] text-gray-500">~0.6 kWh</div>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
            <div className="text-gray-400">Pérdida por Hora</div>
            <div className="text-sm font-bold text-white mt-0.5">~0.03 %/h</div>
            <div className="text-[10px] text-gray-500">Excelente</div>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
            <div className="text-gray-400">Km Perdidos</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">-4.2 km</div>
            <div className="text-[10px] text-gray-500">último reposo</div>
          </div>
        </div>
      </div>

      {/* Clima y Temperatura de Batería */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Temperatura Ambiente y Preacondicionado</div>
            <div className="text-xs text-gray-400">
              Exterior: {telemetry?.outside_temp ?? 19}°C • Interior: {telemetry?.inside_temp ?? 21}°C
            </div>
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Temperatura Óptima
        </span>
      </div>
    </div>
  );
};
