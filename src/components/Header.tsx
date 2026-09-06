import React from 'react';
import { 
  Car, 
  RotateCw, 
  Cloud, 
  Download, 
  Settings, 
  Moon, 
  Zap, 
  Navigation,
  ShieldCheck
} from 'lucide-react';
import type { Vehicle, VehicleTelemetry } from '../types/tesla';

interface HeaderProps {
  vehicle: Vehicle | null;
  telemetry: VehicleTelemetry | null;
  isSimulator: boolean;
  onRefresh: () => void;
  onOpenDriveModal: () => void;
  onOpenCsvModal: () => void;
  onOpenSettingsModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  vehicle,
  telemetry,
  isSimulator,
  onRefresh,
  onOpenDriveModal,
  onOpenCsvModal,
  onOpenSettingsModal,
}) => {
  const getStateBadge = () => {
    const state = telemetry?.state || 'asleep';
    switch (state) {
      case 'driving':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Navigation className="w-3.5 h-3.5 animate-pulse" />
            Conduciendo
          </span>
        );
      case 'charging':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Zap className="w-3.5 h-3.5 animate-bounce" />
            Cargando ({telemetry?.charger_power || 0} kW)
          </span>
        );
      case 'online':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            En línea (Aparcado)
          </span>
        );
      case 'asleep':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Moon className="w-3.5 h-3.5" />
            En reposo (Durmiendo)
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Nombre del Vehículo y Estado con Logo Castor Tech */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-500/30 overflow-hidden">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                {vehicle?.display_name || 'Tesla Model Y'}
              </h1>
              {isSimulator && (
                <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Demo
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {getStateBadge()}
              <span className="text-xs text-gray-400 hidden sm:inline">
                {vehicle?.model} • {vehicle?.trim}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-1.5">
          {/* Botón Sincronizar / Refrescar */}
          <button
            onClick={onRefresh}
            title="Sincronizar ahora"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-gray-300 hover:text-white transition border border-white/5"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Copia de Seguridad Google Drive */}
          <button
            onClick={onOpenDriveModal}
            title="Google Drive / Liberar espacio"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-blue-400 hover:text-blue-300 transition border border-white/5"
          >
            <Cloud className="w-4 h-4" />
          </button>

          {/* Exportar CSV */}
          <button
            onClick={onOpenCsvModal}
            title="Exportar a CSV"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-emerald-400 hover:text-emerald-300 transition border border-white/5"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Ajustes */}
          <button
            onClick={onOpenSettingsModal}
            title="Ajustes y conexión Tesla"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-gray-300 hover:text-white transition border border-white/5"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
