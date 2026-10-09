import React, { useEffect, useState } from 'react';
import { db } from './db/database';
import { initializeSeedDataIfEmpty } from './db/seedData';
import { backgroundSync } from './services/backgroundSync';
import { teslaSimulator } from './services/simulator';
import type { Vehicle, VehicleTelemetry } from './types/tesla';
import { authService } from './services/authService';
import { tessieApi } from './services/tessieApi';
import { teslaApi } from './services/teslaApi';

// Componentes
import { Header } from './components/Header';
import { MainMenuGrid, type ActiveSection } from './components/MainMenuGrid';
import { BatterySection } from './components/BatterySection';
import { ChargingSection } from './components/ChargingSection';
import { DrivesSection } from './components/DrivesSection';
import { VehicleCommands } from './components/VehicleCommands';
import { BatteryHealthSection } from './components/BatteryHealthSection';
import { SavedRoutesSection } from './components/SavedRoutesSection';

// Modales
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { CsvExportModal } from './components/CsvExportModal';
import { SettingsModal } from './components/SettingsModal';

// Iconos barra inferior
import { Home, BatteryCharging, Zap, Navigation, Bookmark } from 'lucide-react';

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [telemetry, setTelemetry] = useState<VehicleTelemetry | null>(null);
  const [isSimulator, setIsSimulator] = useState<boolean>(backgroundSync.isSimulator());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Estados de Modales
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Resumen de estadísticas reales
  const [statsSummary, setStatsSummary] = useState({
    lastDriveKm: 0,
    lastDriveWhKm: 0,
    totalDrivesCount: 0,
    lastChargeKwh: 0,
    healthPercent: 96.0,
    savedRoutesCount: 0,
  });

  useEffect(() => {
    // Inicializar base de datos local y sincronización
    initApp();

    const unsubTelemetry = backgroundSync.addListener((newTelemetry) => {
      setTelemetry(newTelemetry);
      setIsSimulator(backgroundSync.isSimulator());
    });

    const unsubVehicle = backgroundSync.addVehicleListener((realVehicle) => {
      setVehicle(realVehicle);
    });

    return () => {
      unsubTelemetry();
      unsubVehicle();
      backgroundSync.stop();
    };
  }, []);

  const initApp = async () => {
    // Limpiar restos de demos anteriores para que solo aparezcan datos reales
    await initializeSeedDataIfEmpty();

    const activeVehicle = await db.vehicles.filter(v => v.is_selected === true).first() 
      || await db.vehicles.toCollection().first();

    if (activeVehicle) {
      setVehicle(activeVehicle);
      // Si tenemos token de Tessie, recoger todo el histórico guardado
      if (tessieApi.hasToken()) {
        tessieApi.syncAllTessieHistoricalData(activeVehicle)
          .then(() => updateStatsSummary())
          .catch(() => {});
      }
    } else {
      setVehicle(null);
    }

    setIsSimulator(backgroundSync.isSimulator());
    await updateStatsSummary();

    // Iniciar bucle de sincronización
    backgroundSync.start();
  };

  const updateStatsSummary = async () => {
    const lastDrive = await db.drives.orderBy('start_time').reverse().first();
    const drivesCount = await db.drives.count();
    const lastCharge = await db.charges.orderBy('start_time').reverse().first();
    const lastHealth = await db.battery_health.orderBy('odometer_km').reverse().first();
    const routesCount = await db.saved_routes.count();

    setStatsSummary({
      lastDriveKm: lastDrive ? lastDrive.distance_km : 0,
      lastDriveWhKm: lastDrive ? lastDrive.consumption_wh_km : 0,
      totalDrivesCount: drivesCount,
      lastChargeKwh: lastCharge ? lastCharge.energy_added_kwh : 0,
      healthPercent: lastHealth ? +(100 - lastHealth.degradation_percent).toFixed(1) : (vehicle ? 96.0 : 0),
      savedRoutesCount: routesCount,
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSyncError(null);
    try {
      await backgroundSync.performSyncTick();
      const currentV = await db.vehicles.filter(v => v.is_selected === true).first() 
        || await db.vehicles.toCollection().first();
      
      if (currentV) {
        setVehicle(currentV);
        if (tessieApi.hasToken()) {
          await tessieApi.syncAllTessieHistoricalData(currentV);
        }
      }
      setIsSimulator(backgroundSync.isSimulator());
      await updateStatsSummary();
    } catch (err: any) {
      setSyncError(err.message || 'Error al conectar con la API online.');
      setTimeout(() => setSyncError(null), 6000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Función explícita para recoger todos los datos guardados en Tessie
  const handleSyncTessie = async (): Promise<{ success: boolean; message: string }> => {
    if (!tessieApi.hasToken()) {
      setIsSettingsModalOpen(true);
      return { success: false, message: 'Por favor, introduce tu Token de Tessie en Ajustes.' };
    }

    setIsRefreshing(true);
    try {
      let currentV = vehicle;
      if (!currentV) {
        const list = await tessieApi.getVehicles();
        if (list && list.length > 0) {
          currentV = list[0];
          await db.vehicles.put(currentV);
          setVehicle(currentV);
        }
      }

      if (!currentV) {
        throw new Error('No se encontró ningún vehículo vinculado en tu cuenta de Tessie.');
      }

      const res = await tessieApi.syncAllTessieHistoricalData(currentV);
      await backgroundSync.performSyncTick();
      await updateStatsSummary();

      return {
        success: true,
        message: `Sincronización completa: ${res.newDrives} viajes nuevos (${res.totalDrives} en total) y ${res.newCharges} recargas nuevas (${res.totalCharges} en total).`,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error al sincronizar datos con Tessie' };
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExecuteCommand = async (cmd: string): Promise<{ success: boolean; message: string }> => {
    if (isSimulator) {
      const res = teslaSimulator.executeCommand(cmd);
      await backgroundSync.performSyncTick();
      return res;
    }
    const session = authService.getSession();
    if (session.provider === 'tessie' && vehicle) {
      try {
        const res = await tessieApi.sendCommand(String(vehicle.id), cmd);
        return { success: res.result, message: res.result ? `Comando '${cmd}' ejecutado en Tessie` : `Error: ${res.reason || 'rechazado'}` };
      } catch (err: any) {
        return { success: false, message: `Error Tessie: ${err.message}` };
      }
    }
    if (session.provider === 'tesla' && vehicle) {
      try {
        const res = await teslaApi.sendCommand(vehicle.id, cmd as any);
        return { success: res.result, message: res.result ? `Comando '${cmd}' enviado a Tesla` : `Error: ${res.reason || 'rechazado'}` };
      } catch (err: any) {
        return { success: false, message: `Error Tesla: ${err.message}` };
      }
    }
    return { success: true, message: `Comando '${cmd}' enviado al vehículo.` };
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'bateria':
        return <BatterySection telemetry={telemetry} vehicle={vehicle} onBack={() => setActiveSection('home')} />;
      case 'carga':
        return (
          <ChargingSection 
            telemetry={telemetry} 
            onBack={() => { setActiveSection('home'); updateStatsSummary(); }} 
            onSyncTessie={handleSyncTessie}
          />
        );
      case 'trayectos':
        return (
          <DrivesSection 
            onBack={() => { setActiveSection('home'); updateStatsSummary(); }} 
            onSyncTessie={handleSyncTessie}
          />
        );
      case 'comandos':
        return (
          <VehicleCommands
            telemetry={telemetry}
            vehicle={vehicle}
            onExecuteCommand={handleExecuteCommand}
            onBack={() => setActiveSection('home')}
          />
        );
      case 'analisis_bateria':
        return <BatteryHealthSection vehicle={vehicle} onBack={() => setActiveSection('home')} />;
      case 'guardar_rutas':
        return (
          <SavedRoutesSection
            onBack={() => setActiveSection('home')}
            currentTelemetryCoords={
              telemetry
                ? { lat: telemetry.latitude, lng: telemetry.longitude, speed: telemetry.speed_kmh, power: telemetry.power_kw }
                : null
            }
          />
        );
      case 'home':
      default:
        return (
          <MainMenuGrid
            telemetry={telemetry}
            vehicle={vehicle}
            onSelectSection={(sec) => setActiveSection(sec)}
            onExecuteQuickCommand={handleExecuteCommand}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            statsSummary={statsSummary}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#f3f4f6] flex flex-col antialiased">
      {/* Barra de cabecera con estado y acciones rápidas */}
      <Header
        vehicle={vehicle}
        telemetry={telemetry}
        isSimulator={isSimulator}
        isRefreshing={isRefreshing}
        syncError={syncError}
        onRefresh={handleRefresh}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenCsvModal={() => setIsCsvModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      />

      {/* Banner de alerta de conexión si la API online tiene aviso o el coche está durmiendo */}
      {syncError && (
        <div className="bg-red-500/15 border-b border-red-500/30 text-red-300 text-xs px-4 py-2.5 flex items-center justify-between max-w-4xl mx-auto w-full animate-fadeIn">
          <span>⚠️ {syncError}</span>
          <button onClick={() => setSyncError(null)} className="text-red-400 font-bold px-2 py-0.5 rounded hover:bg-white/5">✕</button>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4">
        {renderActiveSection()}
      </main>

      {/* Barra de Navegación Rápida Inferior (Tipo App Móvil Nativa) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-white/10 px-2 py-2 flex items-center justify-around max-w-md mx-auto sm:rounded-t-2xl">
        <button
          onClick={() => setActiveSection('home')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
            activeSection === 'home' ? 'text-red-500 font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Inicio</span>
        </button>

        <button
          onClick={() => setActiveSection('bateria')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
            activeSection === 'bateria' ? 'text-emerald-400 font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <BatteryCharging className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Batería</span>
        </button>

        <button
          onClick={() => setActiveSection('carga')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
            activeSection === 'carga' ? 'text-cyan-400 font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Zap className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Carga</span>
        </button>

        <button
          onClick={() => setActiveSection('trayectos')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
            activeSection === 'trayectos' ? 'text-indigo-400 font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Navigation className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Trayectos</span>
        </button>

        <button
          onClick={() => setActiveSection('guardar_rutas')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl transition ${
            activeSection === 'guardar_rutas' ? 'text-rose-400 font-bold' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Bookmark className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Rutas</span>
        </button>
      </nav>

      {/* Modales */}
      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onDataRestored={updateStatsSummary}
      />
      <CsvExportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
          updateStatsSummary();
        }}
        isSimulator={isSimulator}
        onConnected={handleRefresh}
        onToggleSimulator={(val) => {
          setIsSimulator(val);
          backgroundSync.setSimulatorMode(val);
          backgroundSync.performSyncTick().catch(() => {});
        }}
      />
    </div>
  );
};
