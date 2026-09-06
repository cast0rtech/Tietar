import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Lock, 
  Unlock, 
  Flame, 
  Sun, 
  Volume2, 
  ShieldAlert, 
  FolderDown, 
  FolderUp, 
  Check, 
  Sparkles,
  Zap
} from 'lucide-react';
import type { VehicleTelemetry, Vehicle } from '../types/tesla';

interface VehicleCommandsProps {
  telemetry: VehicleTelemetry | null;
  vehicle: Vehicle | null;
  onExecuteCommand: (cmd: string) => Promise<{ success: boolean; message: string }>;
  onBack: () => void;
}

export const VehicleCommands: React.FC<VehicleCommandsProps> = ({
  telemetry,
  vehicle,
  onExecuteCommand,
  onBack,
}) => {
  const [loadingCmd, setLoadingCmd] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const locked = telemetry?.locked ?? true;
  const climateOn = telemetry?.is_climate_on ?? false;
  const sentryOn = telemetry?.sentry_mode ?? false;
  const frunkOpen = telemetry?.doors_open?.ft ?? false;
  const trunkOpen = telemetry?.doors_open?.rt ?? false;

  const handleCommand = async (cmdKey: string, label: string) => {
    setLoadingCmd(cmdKey);
    setFeedback(null);
    try {
      const res = await onExecuteCommand(cmdKey);
      setFeedback(res);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || 'Error ejecutando comando' });
    } finally {
      setLoadingCmd(null);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-gray-300 hover:text-white transition border border-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white font-heading">Comandos del Vehículo</h2>
          <p className="text-xs text-gray-400">Control remoto y climatización local</p>
        </div>
      </div>

      {/* Notificación de feedback háptico / visual */}
      {feedback && (
        <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
          feedback.success 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-500/15 border-red-500/30 text-red-300'
        }`}>
          <Check className="w-4 h-4" />
          {feedback.message}
        </div>
      )}

      {/* Grid de Comandos Principales */}
      <div className="grid grid-cols-2 gap-3">
        {/* 1. Bloquear / Desbloquear */}
        <button
          disabled={loadingCmd !== null}
          onClick={() => handleCommand(locked ? 'unlock' : 'lock', 'Bloqueo')}
          className={`p-4 rounded-2xl glass-panel-interactive border text-left flex flex-col justify-between h-32 transition ${
            locked ? 'border-white/10' : 'border-red-500/40 bg-red-950/20'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              locked ? 'bg-white/5 text-gray-300' : 'bg-red-500/20 text-red-400'
            }`}>
              {locked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            {loadingCmd === (locked ? 'unlock' : 'lock') && (
              <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-white font-heading">
              {locked ? 'Cerraduras' : 'Desbloqueado'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {locked ? 'Pulsar para desbloquear' : 'Pulsar para bloquear'}
            </div>
          </div>
        </button>

        {/* 2. Climatización */}
        <button
          disabled={loadingCmd !== null}
          onClick={() => handleCommand('climate_toggle', 'Climatización')}
          className={`p-4 rounded-2xl glass-panel-interactive border text-left flex flex-col justify-between h-32 transition ${
            climateOn ? 'border-amber-500/40 bg-amber-950/20' : 'border-white/10'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              climateOn ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-300'
            }`}>
              <Flame className="w-5 h-5" />
            </div>
            {loadingCmd === 'climate_toggle' && (
              <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-white font-heading">
              {climateOn ? 'Climatizador (21°C)' : 'Climatizador'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {climateOn ? 'Pulsar para apagar' : 'Pulsar para encender a 21°C'}
            </div>
          </div>
        </button>

        {/* 3. Luces */}
        <button
          disabled={loadingCmd !== null}
          onClick={() => handleCommand('flash_lights', 'Luces')}
          className="p-4 rounded-2xl glass-panel-interactive border border-white/10 text-left flex flex-col justify-between h-32"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Sun className="w-5 h-5" />
            </div>
            {loadingCmd === 'flash_lights' && (
              <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-white font-heading">Ráfaga de Luces</div>
            <div className="text-xs text-gray-400 mt-0.5">Parpadear faros frontales</div>
          </div>
        </button>

        {/* 4. Claxon */}
        <button
          disabled={loadingCmd !== null}
          onClick={() => handleCommand('honk_horn', 'Claxon')}
          className="p-4 rounded-2xl glass-panel-interactive border border-white/10 text-left flex flex-col justify-between h-32"
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-white/5 text-gray-300 flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            {loadingCmd === 'honk_horn' && (
              <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-white font-heading">Claxon</div>
            <div className="text-xs text-gray-400 mt-0.5">Hacer sonar la bocina</div>
          </div>
        </button>

        {/* 5. Frunk (Maletero Delantero) */}
        <button
          disabled={loadingCmd !== null}
          onClick={() => handleCommand('toggle_frunk', 'Frunk')}
          className={`p-4 rounded-2xl glass-panel-interactive border text-left flex flex-col justify-between h-32 ${
            frunkOpen ? 'border-amber-500/30' : 'border-white/10'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-white/5 text-gray-300 flex items-center justify-center">
              <FolderUp className="w-5 h-5" />
            </div>
            {loadingCmd === 'toggle_frunk' && (
              <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-white font-heading">Frunk Delantero</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {frunkOpen ? 'Abierto' : 'Abrir maletero frontal'}
            </div>
          </div>
        </button>

        {/* 6. Trunk (Maletero Trasero) */}
        <button
          disabled={loadingCmd !== null}
          onClick={() => handleCommand('toggle_trunk', 'Trunk')}
          className={`p-4 rounded-2xl glass-panel-interactive border text-left flex flex-col justify-between h-32 ${
            trunkOpen ? 'border-amber-500/30' : 'border-white/10'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-10 h-10 rounded-xl bg-white/5 text-gray-300 flex items-center justify-center">
              <FolderDown className="w-5 h-5" />
            </div>
            {loadingCmd === 'toggle_trunk' && (
              <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div>
            <div className="text-sm font-bold text-white font-heading">Maletero Trasero</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {trunkOpen ? 'Abierto' : 'Abrir/Cerrar portón'}
            </div>
          </div>
        </button>
      </div>

      {/* Acciones de Seguridad y Modo Centinela */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            sentryOn ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-gray-400'
          }`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white font-heading">Modo Centinela (Sentry Mode)</div>
            <div className="text-xs text-gray-400">Vigilancia con cámaras perimetrales</div>
          </div>
        </div>

        <button
          onClick={() => handleCommand('sentry_toggle', 'Modo Centinela')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
            sentryOn
              ? 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-600/30'
              : 'bg-white/10 text-gray-300 border-white/10 hover:bg-white/20'
          }`}
        >
          {sentryOn ? 'Activado' : 'Desactivado'}
        </button>
      </div>
    </div>
  );
};
