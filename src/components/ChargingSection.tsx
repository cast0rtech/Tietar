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
  MapPin,
  RefreshCw,
  Check
} from 'lucide-react';
import type { VehicleTelemetry, ChargeRecord } from '../types/tesla';
import { db } from '../db/database';
import { CsvExporter } from '../services/csvExporter';

interface ChargingSectionProps {
  telemetry: VehicleTelemetry | null;
  onBack: () => void;
  onSyncTessie?: () => Promise<{ success: boolean; message: string }>;
}

export const ChargingSection: React.FC<ChargingSectionProps> = ({
  telemetry,
  onBack,
  onSyncTessie,
}) => {
  const [charges, setCharges] = useState<ChargeRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

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

  const handleManualSync = async () => {
    if (!onSyncTessie) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await onSyncTessie();
      setSyncFeedback(res.message);
      await loadCharges();
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: any) {
      setSyncFeedback(err.message || 'Error al sincronizar cargas');
    } finally {
      setIsSyncing(false);
    }
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

        <div className="flex items-center gap-2">
          {onSyncTessie && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Sincronizar recargas de Tessie"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 active:scale-95 text-xs font-semibold border border-cyan-500/30 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Tessie'}</span>
            </button>
          )}

          {charges.length > 0 && (
            <button
              onClick={() => CsvExporter.exportCharges()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 active:scale-95 text-xs font-semibold border border-cyan-500/30 transition"
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
            El vehículo no está cargando actualmente. Al conectar el cable, se registrarán automáticamente la potencia en kW, energía y coste.
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
          <div className="text-[11px] text-gray-400">
            {totalKwhAdded > 0 ? `Media: ~${(totalCostEur / totalKwhAdded).toFixed(2)} €/kWh` : 'Sin datos'}
          </div>
        </div>
      </div>

      {/* Estado vacío si no hay cargas registradas */}
      {charges.length === 0 && (
        <div className="glass-panel p-8 rounded-2xl border border-white/10 text-center space-y-4 animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <Zap className="w-7 h-7" />
          </div>
          <div className="max-w-sm mx-auto">
            <h3 className="text-base font-bold text-white font-heading">Sin recargas registradas aún</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Las sesiones de recarga se guardarán automáticamente al enchufar el vehículo. También puedes recoger todas las sesiones que tengas guardadas en Tessie.
            </p>
          </div>
          {onSyncTessie && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando recargas...' : 'Recoger recargas guardadas en Tessie'}
            </button>
          )}
        </div>
      )}

      {/* Historial de Sesiones de Recarga */}
      {charges.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1 font-heading">
            Historial de Sesiones
          </h3>

          {charges.map((charge) => (
            <div key={charge.id || charge.start_time} className="glass-panel p-3.5 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    {charge.location}
                  </div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
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
      )}
    </div>
  );
};
