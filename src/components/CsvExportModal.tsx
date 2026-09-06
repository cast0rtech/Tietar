import React from 'react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  Navigation, 
  Zap, 
  Activity, 
  Compass,
  Check
} from 'lucide-react';
import { CsvExporter } from '../services/csvExporter';

interface CsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvExportModal: React.FC<CsvExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl glass-panel p-5 border border-white/10 space-y-4 shadow-2xl relative">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Título */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-heading">Exportar Datos a CSV</h3>
            <p className="text-xs text-gray-400">Formato universal compatible con Excel y Google Sheets</p>
          </div>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          Exporta tus datos en archivos CSV estándar con codificación UTF-8 para abrirlos en tu ordenador o migrarlos si cambias de teléfono.
        </p>

        {/* Opciones de Exportación */}
        <div className="space-y-2 pt-1">
          {/* 1. Viajes */}
          <button
            onClick={() => CsvExporter.exportDrives()}
            className="w-full p-3 rounded-xl glass-panel-interactive border border-white/5 flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Historial de Viajes (Resumen)</div>
                <div className="text-[11px] text-gray-400">Distancia, Wh/km, energía, duración y fechas</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-gray-400 group-hover:text-white transition" />
          </button>

          {/* 2. Cargas */}
          <button
            onClick={() => CsvExporter.exportCharges()}
            className="w-full p-3 rounded-xl glass-panel-interactive border border-white/5 flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Sesiones de Recarga</div>
                <div className="text-[11px] text-gray-400">kWh añadidos, potencia máx, ubicación y costes</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-gray-400 group-hover:text-white transition" />
          </button>

          {/* 3. Puntos GPS Crudos */}
          <button
            onClick={() => CsvExporter.exportGpsBreadcrumbs()}
            className="w-full p-3 rounded-xl glass-panel-interactive border border-white/5 flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Telemetría GPS y Potencia</div>
                <div className="text-[11px] text-gray-400">Coordenadas, velocidad, altitud y regeneración</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-gray-400 group-hover:text-white transition" />
          </button>

          {/* 4. Salud de Batería */}
          <button
            onClick={() => CsvExporter.exportBatteryHealth()}
            className="w-full p-3 rounded-xl glass-panel-interactive border border-white/5 flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Salud y Degradación de Batería</div>
                <div className="text-[11px] text-gray-400">Capacidad nominal, odómetro y autonomía máxima</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-gray-400 group-hover:text-white transition" />
          </button>
        </div>
      </div>
    </div>
  );
};
