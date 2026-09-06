import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Activity, 
  Download, 
  ShieldCheck, 
  TrendingDown, 
  Sparkles, 
  Award, 
  Gauge, 
  Calendar 
} from 'lucide-react';
import type { BatteryHealthRecord, Vehicle } from '../types/tesla';
import { db } from '../db/database';
import { CsvExporter } from '../services/csvExporter';

interface BatteryHealthSectionProps {
  vehicle: Vehicle | null;
  onBack: () => void;
}

export const BatteryHealthSection: React.FC<BatteryHealthSectionProps> = ({
  vehicle,
  onBack,
}) => {
  const [history, setHistory] = useState<BatteryHealthRecord[]>([]);

  useEffect(() => {
    loadHealthHistory();
  }, []);

  const loadHealthHistory = async () => {
    const records = await db.battery_health.orderBy('odometer_km').toArray();
    setHistory(records);
  };

  const latest = history[history.length - 1] || {
    date: '2026-06-18',
    odometer_km: 43280,
    nominal_full_pack_kwh: 74.9,
    original_capacity_kwh: 78.1,
    degradation_percent: 4.1,
    max_range_100_percent_km: 511,
  };

  const healthPercent = +(100 - latest.degradation_percent).toFixed(1);

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
            <h2 className="text-xl font-bold text-white font-heading">Análisis de Batería</h2>
            <p className="text-xs text-gray-400">Salud celular, curva de degradación y longevidad</p>
          </div>
        </div>

        <button
          onClick={() => CsvExporter.exportBatteryHealth()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 active:scale-95 text-xs font-semibold border border-amber-500/30 transition"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
      </div>

      {/* Tarjeta de Salud Global */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
              Salud Restante de la Batería
            </span>
            <div className="text-3xl font-extrabold text-white font-heading mt-1 flex items-baseline gap-2">
              <span className="text-emerald-400">{healthPercent}%</span>
              <span className="text-xs font-medium text-gray-400">Estado Excelente</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-4 mt-4 border-t border-white/5 text-center text-xs">
          <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
            <div className="text-gray-400">Degradación Total</div>
            <div className="text-sm font-bold text-amber-400 mt-0.5">-{latest.degradation_percent}%</div>
            <div className="text-[10px] text-gray-400">en {latest.odometer_km?.toLocaleString()} km</div>
          </div>
          <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
            <div className="text-gray-400">Capacidad Nominal</div>
            <div className="text-sm font-bold text-white mt-0.5">{latest.nominal_full_pack_kwh} kWh</div>
            <div className="text-[10px] text-gray-400">de {latest.original_capacity_kwh} kWh orig.</div>
          </div>
          <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
            <div className="text-gray-400">Autonomía al 100%</div>
            <div className="text-sm font-bold text-cyan-400 mt-0.5">{latest.max_range_100_percent_km} km</div>
            <div className="text-[10px] text-gray-400">nuevo: 533 km</div>
          </div>
        </div>
      </div>

      {/* Proyección de Longevidad */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300 font-heading">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Proyección de Vida Útil
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">
          Con una degradación de solo <strong className="text-emerald-400">{latest.degradation_percent}%</strong> a los <strong className="text-white">{latest.odometer_km?.toLocaleString()} km</strong>, la pérdida anual de autonomía es de solo ~0.8% anual. A este ritmo, la batería mantendrá más del <strong className="text-cyan-300">80% de capacidad por encima de los 380.000 km</strong>.
        </p>
      </div>

      {/* Historial de Lecturas */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1 font-heading">
          Puntos de Control Históricos
        </h3>

        {history.map((rec) => (
          <div key={rec.id || rec.date} className="glass-panel p-3.5 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {rec.date}
              </div>
              <div className="text-gray-400 mt-0.5 flex items-center gap-1.5">
                <Gauge className="w-3 h-3 text-cyan-400" />
                {rec.odometer_km?.toLocaleString()} km
              </div>
            </div>

            <div className="text-right">
              <div className="font-bold text-white">{rec.nominal_full_pack_kwh} kWh ({rec.max_range_100_percent_km} km)</div>
              <div className="text-amber-400 font-medium">-{rec.degradation_percent}% degradación</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
