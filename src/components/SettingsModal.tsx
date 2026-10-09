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
  Check, 
  Info,
  Mail,
  Car,
  Cloud,
  Lock,
  LogOut,
  RefreshCw,
  Trash2,
  Database
} from 'lucide-react';
import { teslaSimulator } from '../services/simulator';
import { backgroundSync } from '../services/backgroundSync';
import { teslaApi } from '../services/teslaApi';
import { tessieApi } from '../services/tessieApi';
import { authService, type AuthProviderType } from '../services/authService';
import { purgeDemoSeedData } from '../db/seedData';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSimulator: boolean;
  onToggleSimulator: (enabled: boolean) => void;
  onConnected?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isSimulator,
  onToggleSimulator,
  onConnected,
}) => {
  const [activeTab, setActiveTab] = useState<'tessie' | 'tesla' | 'email'>('tessie');
  const [teslaToken, setTeslaToken] = useState<string>('');
  const [tessieToken, setTessieToken] = useState<string>(tessieApi.getToken() || '');
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [syncingHistory, setSyncingHistory] = useState<boolean>(false);
  const [syncProgressText, setSyncProgressText] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [simState, setSimState] = useState<string>('asleep');

  if (!isOpen) return null;

  const currentSession = authService.getSession();
  const hasTessieConnected = tessieApi.hasToken();

  const handleSaveTesla = async () => {
    if (!teslaToken.trim()) return;
    setLoading(true);
    try {
      const res = await authService.loginWithTesla(teslaToken.trim());
      setFeedback(res);
      if (onConnected) onConnected();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTessie = async () => {
    if (!tessieToken.trim()) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await authService.loginWithTessie(tessieToken.trim());
      setFeedback(res);
      if (onConnected) onConnected();
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      setFeedback({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAllTessie = async () => {
    if (!tessieApi.hasToken()) {
      setFeedback({ success: false, message: 'Primero introduce y valida tu token de Tessie.' });
      return;
    }
    setSyncingHistory(true);
    setSyncProgressText('Iniciando sincronización...');
    setFeedback(null);
    try {
      const vehicles = await tessieApi.getVehicles();
      if (!vehicles || vehicles.length === 0) {
        throw new Error('No se encontraron vehículos vinculados en Tessie.');
      }
      const car = vehicles[0];
      const result = await tessieApi.syncAllTessieHistoricalData(car, (msg) => {
        setSyncProgressText(msg);
      });
      await backgroundSync.performSyncTick();
      setFeedback({
        success: true,
        message: `Sincronizados ${result.newDrives} viajes nuevos (${result.totalDrives} en total) y ${result.newCharges} cargas nuevas guardadas en Tessie.`,
      });
      if (onConnected) onConnected();
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || 'Error al sincronizar datos de Tessie' });
    } finally {
      setSyncingHistory(false);
      setSyncProgressText(null);
    }
  };

  const handlePurgeDemos = async () => {
    setLoading(true);
    try {
      const res = await purgeDemoSeedData();
      setFeedback({
        success: true,
        message: `Datos demo eliminados con éxito (${res.deletedDrives} viajes y ${res.deletedCharges} cargas ficticias limpiadas).`,
      });
      if (onConnected) onConnected();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ success: false, message: 'Error al limpiar datos demo.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!emailInput.trim() || !passwordInput.trim()) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await authService.loginWithEmail(emailInput.trim(), passwordInput.trim());
      setFeedback(res);
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setFeedback({ success: true, message: 'Sesión cerrada.' });
    setTimeout(() => setFeedback(null), 3000);
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
          <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-white overflow-hidden">
            <img src="/tietar_for_tesla.png" alt="Tietar" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-heading">Autenticación y Ajustes</h3>
            <p className="text-xs text-gray-400">
              Método activo: <span className="text-cyan-400 uppercase font-semibold">{currentSession.provider}</span>
            </p>
          </div>
        </div>

        {/* Notificación de feedback */}
        {feedback && (
          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
            feedback.success ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}>
            <Check className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Selector de pestañas para múltiples métodos de inicio de sesión */}
        <div className="flex rounded-xl bg-black/40 p-1 border border-white/5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('tessie')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'tessie' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            Tessie API
          </button>
          <button
            onClick={() => setActiveTab('tesla')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'tesla' ? 'bg-red-500/20 text-red-300 border border-red-500/30 shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            Tesla Fleet
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'email' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Email
          </button>
        </div>

        {/* PESTAÑA 1: TESSIE API TOKEN */}
        {activeTab === 'tessie' && (
          <div className="space-y-3 pt-1 animate-fadeIn">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                Token Personal de Tessie
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Conéctate mediante tu token generado en <span className="text-cyan-300">dash.tessie.com/settings/api</span>. Permite registrar toda la telemetría en tiempo real y recoger todos los viajes y recargas ya guardados.
              </p>
            </div>
            <div className="space-y-2">
              <input
                type="password"
                placeholder="Pega aquí tu Tessie API Token"
                value={tessieToken}
                onChange={(e) => setTessieToken(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                disabled={loading || syncingHistory}
                onClick={handleSaveTessie}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition disabled:opacity-50"
              >
                {loading ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Validar y Conectar con Tessie
              </button>

              {/* Botón para recoger todo el histórico guardado en Tessie */}
              {hasTessieConnected && (
                <div className="pt-2">
                  <button
                    disabled={syncingHistory || loading}
                    onClick={handleSyncAllTessie}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-95 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 border border-cyan-500/30 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingHistory ? 'animate-spin' : ''}`} />
                    {syncingHistory ? (syncProgressText || 'Sincronizando...') : '📥 Recoger todos los datos guardados en Tessie'}
                  </button>
                  <p className="text-[10px] text-gray-400 text-center mt-1">
                    Importa todos tus viajes históricos, sesiones de recarga y salud celular directamente a la app.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 2: TESLA FLEET API */}
        {activeTab === 'tesla' && (
          <div className="space-y-3 pt-1 animate-fadeIn">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-red-500" />
                Token Directo de Tesla (Fleet / Owner API)
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Token de acceso de Tesla oficial para conexión directa.
              </p>
            </div>
            <div className="space-y-2">
              <input
                type="password"
                placeholder="Pega tu Tesla Access Token"
                value={teslaToken}
                onChange={(e) => setTeslaToken(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
              <button
                disabled={loading}
                onClick={handleSaveTesla}
                className="w-full py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition disabled:opacity-50"
              >
                {loading ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Guardar Token de Tesla
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: EMAIL Y CONTRASEÑA */}
        {activeTab === 'email' && (
          <div className="space-y-3 pt-1 animate-fadeIn">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                Autenticación Local (Email y Contraseña)
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Inicia sesión con tu cuenta de usuario para almacenar tus ajustes y rutas.
              </p>
            </div>
            <div className="space-y-2">
              <input
                type="email"
                placeholder="tu-email@ejemplo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button
                disabled={loading}
                onClick={handleEmailAuth}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition disabled:opacity-50"
              >
                {loading ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                Iniciar Sesión / Registrar
              </button>
            </div>
          </div>
        )}

        {/* Botón cerrar sesión si está autenticado */}
        {currentSession.isAuthenticated && (
          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-red-400 text-xs flex items-center justify-center gap-1.5 border border-white/5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión ({currentSession.displayName})
          </button>
        )}

        {/* Limpieza de Datos Demo Ficticios */}
        <div className="glass-panel p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              Limpiar Datos Demo Ficticios
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Elimina viajes y cargas de prueba que no fueron realizados con tu coche
            </div>
          </div>
          <button
            disabled={loading}
            onClick={handlePurgeDemos}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold flex items-center gap-1 border border-amber-500/30 transition disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpiar
          </button>
        </div>

        {/* Interruptor Modo Simulador vs Tesla Real */}
        <div className="glass-panel p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-purple-400" />
              Modo Simulador
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              Genera telemetría dinámica en vivo para pruebas sin coche
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

        {/* Aviso de Privacidad y Funcionamiento Local */}
        <div className="glass-panel p-3.5 rounded-xl border border-white/5 flex items-start gap-2.5 text-xs text-gray-400">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">100% Privado y Seguro:</strong> Tus claves de API y datos de viajes se conservan exclusivamente en tu dispositivo, sin servidores externos intermediarios.
          </p>
        </div>
      </div>
    </div>
  );
};
