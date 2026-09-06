import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Zap, 
  Clock, 
  Euro, 
  TrendingUp, 
  BatteryCharging, 
  Download,
  Calendar,
  MapPin
} from 'lucide-react';
import type { VehicleTelemetry, ChargeRecord } from '../types/tesla';
import { db } from '../db/database';
import { CsvExporter } from '../services/csvExporter';

interface ChargingSectionProps {
  telemetry: VehicleTelemetry | null;
  onBack: () => void;
}

export const ChargingSection: React.FC<ChargingSectionProps> = ({
  telemetry,
  onBack,
}) => {
  const [charges, setCharges] = useState<ChargeRecord[]>([]);
  const isCharging = telemetry?.state === 'charging' || telemetry?.charging_state === 'Charging';
  const powerKw = telemetry?.charger_power ?? 0;
  const voltage = telemetry?.charger_voltage ?? 0;
  const current = telemetry?.charger_actual_current ?? 0;
  const energyAdded = telemetry?.charge_energy_added ?? 0;
  const timeRemaining = telemetry?.time_to_full_charge ?? 0;

  useEffect(() => {
    loadCharges();
  }, []);

  const loadCharges = async () => {
    const list = await db.charges.orderBy('start_time').reverse().toArray();
    setCharges(list);
  };

  const totalKwhAdded = charges.reduce((acc, c) => acc + c.energy_added_kwh, 0);
  const totalCostEur = charges.reduce((acc, c) => acc + (c.cost_eur || 0), 0);

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
            <h2 className="text-xl font-bold text-white font-heading">Control de Carga</h2>
            <p className="text-xs text-gray-400">Potencia en vivo, sesiones históricas y costes</p>
          </div>
        </div>

        <button
          onClick={() => CsvExporter.exportCharges()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 active:scale-95 text-xs font-semibold border border-cyan-500/30 transition"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
      </div>

      {/* Estado Actual de Carga (En Vivo) */}
      <div className={`p-5 rounded-2xl glass-panel border ${isCharging ? 'border-cyan-500/30 glow-cyan' : 'border-white/10'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full ${isCharging ? 'bg-cyan-400 animate-ping' : 'bg-gray-500'}`} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-heading">
              {isCharging ? 'Sesión de Carga Activa' : 'Cargador Desconectado'}
            </h3>
          </div>
          <span className="text-xs text-gray-400">
            {isCharging ? `${telemetry?.battery_level}% actual` : 'Vehículo desenchufado'}
          </span>
        </div>

        {isCharging ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-4xl font-extrabold text-cyan-400 font-heading">{powerKw}</span>
                <span className="text-lg font-bold text-white ml-1.5">kW</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 block">Tiempo restante</span>
                <span className="text-base font-bold text-white">{timeRemaining} horas</span>
              </div>
            </div>

            {/* Métricas Eléctricas */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <div className="text-gray-400">Energía Añadida</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">+{energyAdded} kWh</div>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <div className="text-gray-400">Tensión</div>
                <div className="text-sm font-bold text-white mt-0.5">{voltage} V</div>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                <div className="text-gray-400">Intensidad</div>
                <div className="text-sm font-bold text-white mt-0.5">{current} A</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-2">
            Conecta el cable al puerto de carga o utiliza el simulador para reproducir una sesión de Supercharger a 250 kW.
          </p>
        )}
      </div>

      {/* Tarjetas Resumen de Totales */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel p-3.5 rounded-2xl border border-white/10">
          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Total Energía Cargada
          </div>
          <div className="text-lg font-bold text-white font-heading mt-1">
            {totalKwhAdded.toFixed(1)} kWh
          </div>
          <div className="text-[11px] text-gray-400">{charges.length} sesiones registradas</div>
        </div>

        <div className="glass-panel p-3.5 rounded-2xl border border-white/10">
          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            <Euro className="w-3.5 h-3.5 text-emerald-400" />
            Gasto Estimado
          </div>
          <div className="text-lg font-bold text-emerald-400 font-heading mt-1">
            {totalCostEur.toFixed(2)} €
          </div>
          <div className="text-[11px] text-gray-400">Media: ~0.24 €/kWh</div>
        </div>
      </div>

      {/* Historial de Sesiones de Recarga */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1 font-heading">
          Historial de Sesiones
        </h3>

        {charges.map((charge) => (
          <div key={charge.id} className="glass-panel p-3.5 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  {charge.location}
                </div>
                <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(charge.start_time).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>•</span>
                  <span>{charge.duration_minutes} min</span>
                </div>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                charge.charger_type === 'Supercharger' 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {charge.charger_type}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5 text-center text-xs">
              <div>
                <span className="text-gray-400 block text-[10px]">Añadido</span>
                <span className="font-bold text-white">+{charge.energy_added_kwh} kWh</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Batería</span>
                <span className="font-bold text-white">{charge.start_soc}% → {charge.end_soc}%</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Pot. Máx</span>
                <span className="font-bold text-cyan-400">{charge.max_power_kw} kW</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Coste</span>
                <span className="font-bold text-emerald-400">{charge.cost_eur ? `${charge.cost_eur} €` : '0 €'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
