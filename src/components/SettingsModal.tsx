import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Key, 
  Play, 
  ShieldCheck, 
  Moon, 
  Zap, 
  Navigation, 
  Euro, 
  Check, 
  Smartphone,
  Info
} from 'lucide-react';
import { teslaSimulator } from '../services/simulator';
import { backgroundSync } from '../services/backgroundSync';
import { teslaApi } from '../services/teslaApi';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSimulator: boolean;
  onToggleSimulator: (enabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isSimulator,
  onToggleSimulator,
}) => {
  const [tokenInput, setTokenInput] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [simState, setSimState] = useState<string>('asleep');

  if (!isOpen) return null;

  const handleSaveToken = () => {
    if (tokenInput.trim()) {
      teslaApi.setToken(tokenInput.trim());
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleChangeSimState = (state: 'asleep' | 'online' | 'driving' | 'charging') => {
    setSimState(state);
    teslaSimulator.setState(state);
    backgroundSync.performSyncTick();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl glass-panel p-5 border border-white/10 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Título */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-heading">Configuración y Conexión</h3>
            <p className="text-xs text-gray-400">Credenciales Tesla y modo simulador</p>
          </div>
        </div>

        {/* Interruptor Modo Simulador vs Tesla Real */}
        <div className="glass-panel p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-purple-400" />
              Modo Demostración / Simulador
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Prueba rutas, cargas y telemetría sin vincular el coche
            </div>
          </div>
          <button
            onClick={() => onToggleSimulator(!isSimulator)}
            className={`w-12 h-6 rounded-full transition p-0.5 flex items-center ${
              isSimulator ? 'bg-purple-600 justify-end' : 'bg-white/10 justify-start'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-md" />
          </button>
        </div>

        {/* Controles del Simulador si está activo */}
        {isSimulator && (
          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
            <div className="text-xs font-bold text-purple-300">
              Forzar Estado Simulado del Vehículo:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleChangeSimState('driving')}
                className={`py-2 px-2.5 rounded-lg border text-left flex items-center gap-2 transition ${
                  simState === 'driving' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-black/30 border-white/5 text-gray-300'
                }`}
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span>Conduciendo</span>
              </button>

              <button
                onClick={() => handleChangeSimState('charging')}
                className={`py-2 px-2.5 rounded-lg border text-left flex items-center gap-2 transition ${
                  simState === 'charging' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-black/30 border-white/5 text-gray-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Supercharger</span>
              </button>

              <button
                onClick={() => handleChangeSimState('asleep')}
                className={`py-2 px-2.5 rounded-lg border text-left flex items-center gap-2 transition ${
                  simState === 'asleep' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-black/30 border-white/5 text-gray-300'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-blue-400" />
                <span>En Reposo</span>
              </button>

              <button
                onClick={() => handleChangeSimState('online')}
                className={`py-2 px-2.5 rounded-lg border text-left flex items-center gap-2 transition ${
                  simState === 'online' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-black/30 border-white/5 text-gray-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Aparcado On</span>
              </button>
            </div>
          </div>
        )}

        {/* Conexión Tesla API Real */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-red-500" />
            Token de Acceso Tesla (Fleet / Owner API)
          </div>
          <p className="text-[11px] text-gray-400">
            Tus credenciales se almacenan exclusivamente en el almacenamiento local cifrado de tu dispositivo Android.
          </p>
          <div className="space-y-2">
            <input
              type="password"
              placeholder="Pega aquí tu Tesla Access Token o Refresh Token"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
            <button
              onClick={handleSaveToken}
              className="w-full py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition"
            >
              <Check className="w-3.5 h-3.5" />
              Guardar Credenciales en Local
            </button>
          </div>
          {savedSuccess && (
            <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-1">
              <Check className="w-3.5 h-3.5" />
              Credenciales guardadas en el almacenamiento seguro local.
            </div>
          )}
        </div>

        {/* Aviso de Privacidad y Funcionamiento Local */}
        <div className="glass-panel p-3.5 rounded-xl border border-white/5 flex items-start gap-2.5 text-xs text-gray-400">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">100% Local:</strong> Esta aplicación no envía tus datos de telemetría, ubicación ni contraseñas a ningún servidor de terceros. Solo se conecta directamente a los servidores de Tesla y a tu Google Drive si decides activarlo.
          </p>
        </div>
      </div>
    </div>
  );
};
