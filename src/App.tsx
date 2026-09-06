import React, { useEffect, useState } from 'react';
import { db } from './db/database';
import { initializeSeedDataIfEmpty } from './db/seedData';
import { backgroundSync } from './services/backgroundSync';
import { teslaSimulator } from './services/simulator';
import type { Vehicle, VehicleTelemetry } from './types/tesla';

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
import { Home, BatteryCharging, Zap, Navigation, Sliders, Activity, Bookmark } from 'lucide-react';

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [telemetry, setTelemetry] = useState<VehicleTelemetry | null>(null);
  const [isSimulator, setIsSimulator] = useState<boolean>(true);

  // Estados de Modales
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Resumen de estadísticas
  const [statsSummary, setStatsSummary] = useState({
    lastDriveKm: 56.4,
    lastDriveWhKm: 198,
    totalDrivesCount: 2,
    lastChargeKwh: 48.5,
    healthPercent: 95.9,
    savedRoutesCount: 1,
  });

  useEffect(() => {
    // Inicializar base de datos local y sincronización
    initApp();

    const unsubscribe = backgroundSync.addListener((newTelemetry) => {
      setTelemetry(newTelemetry);
    });

    return () => {
      unsubscribe();
      backgroundSync.stop();
    };
  }, []);

  const initApp = async () => {
    await initializeSeedDataIfEmpty();
    const v = await db.vehicles.toCollection().first();
    if (v) setVehicle(v);

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
      lastDriveKm: lastDrive?.distance_km || 56.4,
      lastDriveWhKm: lastDrive?.consumption_wh_km || 198,
      totalDrivesCount: drivesCount || 2,
      lastChargeKwh: lastCharge?.energy_added_kwh || 48.5,
      healthPercent: lastHealth ? +(100 - lastHealth.degradation_percent).toFixed(1) : 95.9,
      savedRoutesCount: routesCount || 1,
    });
  };

  const handleRefresh = async () => {
    await backgroundSync.performSyncTick();
    await updateStatsSummary();
  };

  const handleExecuteCommand = async (cmd: string): Promise<{ success: boolean; message: string }> => {
    if (isSimulator) {
      const res = teslaSimulator.executeCommand(cmd);
      await backgroundSync.performSyncTick();
      return res;
    }
    // TODO: Si usa API real, llamar a teslaApi.sendCommand()
    return { success: true, message: `Comando '${cmd}' enviado al vehículo.` };
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'bateria':
        return <BatterySection telemetry={telemetry} vehicle={vehicle} onBack={() => setActiveSection('home')} />;
      case 'carga':
        return <ChargingSection telemetry={telemetry} onBack={() => setActiveSection('home')} />;
      case 'trayectos':
        return <DrivesSection onBack={() => setActiveSection('home')} />;
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
        onRefresh={handleRefresh}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenCsvModal={() => setIsCsvModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      />

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
        onClose={() => setIsSettingsModalOpen(false)}
        isSimulator={isSimulator}
        onToggleSimulator={(val) => {
          setIsSimulator(val);
          backgroundSync.setSimulatorMode(val);
        }}
      />
    </div>
  );
};
