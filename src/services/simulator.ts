// Simulador Interactivo de Tesla en Tiempo Real
import type { VehicleTelemetry, VehicleStateEnum } from '../types/tesla';

class TeslaSimulator {
  private state: VehicleStateEnum = 'asleep';
  private batteryLevel: number = 76;
  private locked: boolean = true;
  private climateOn: boolean = false;
  private sentryOn: boolean = true;
  private insideTemp: number = 21.5;
  private outsideTemp: number = 19.0;
  private frunkOpen: boolean = false;
  private trunkOpen: boolean = false;

  // Ruta simulada con coordenadas GPS (Madrid - Guadarrama)
  private routeWaypoints = [
    { lat: 40.465, lng: -3.688, speed: 45, power: 25, alt: 720 },
    { lat: 40.490, lng: -3.705, speed: 85, power: 42, alt: 740 },
    { lat: 40.540, lng: -3.730, speed: 110, power: 36, alt: 760 },
    { lat: 40.600, lng: -3.765, speed: 120, power: 45, alt: 800 },
    { lat: 40.660, lng: -3.820, speed: 105, power: 55, alt: 910 },
    { lat: 40.710, lng: -3.900, speed: 75, power: 75, alt: 1150 },
    { lat: 40.740, lng: -3.980, speed: 60, power: 90, alt: 1450 },
    { lat: 40.788, lng: -4.004, speed: 45, power: -35, alt: 1860 }, // Freno regenerativo en bajada
    { lat: 40.760, lng: -4.001, speed: 55, power: -45, alt: 1600 },
    { lat: 40.730, lng: -3.980, speed: 65, power: -28, alt: 1350 },
  ];
  private currentWaypointIndex: number = 0;

  // Estado de carga
  private chargePowerKw: number = 0;
  private chargeEnergyAdded: number = 0;

  constructor() {
    // Iniciar con valores por defecto
  }

  getState(): VehicleStateEnum {
    return this.state;
  }

  setState(newState: VehicleStateEnum) {
    this.state = newState;
    if (newState === 'charging') {
      this.chargePowerKw = 150;
    } else {
      this.chargePowerKw = 0;
    }
  }

  // Genera telemetría simulada actual
  getTelemetry(): VehicleTelemetry {
    // Si está conduciendo, avanzar por los puntos
    let currentLat = 40.465;
    let currentLng = -3.688;
    let currentSpeed = 0;
    let currentPower = 0;
    let shiftState: 'P' | 'D' | 'R' | 'N' | null = 'P';

    if (this.state === 'driving') {
      const wp = this.routeWaypoints[this.currentWaypointIndex];
      currentLat = wp.lat;
      currentLng = wp.lng;
      currentSpeed = wp.speed;
      currentPower = wp.power;
      shiftState = 'D';

      // Avanzar al siguiente punto
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.routeWaypoints.length;
      
      // Drenar batería lentamente o regenerar si power es negativo
      if (currentPower > 0) {
        this.batteryLevel = Math.max(5, +(this.batteryLevel - 0.05).toFixed(2));
      } else {
        this.batteryLevel = Math.min(100, +(this.batteryLevel + 0.02).toFixed(2));
      }
    } else if (this.state === 'charging') {
      shiftState = 'P';
      this.batteryLevel = Math.min(100, +(this.batteryLevel + 0.2).toFixed(2));
      this.chargeEnergyAdded = +(this.chargeEnergyAdded + 0.15).toFixed(2);
      // Simular curva de potencia según SOC
      if (this.batteryLevel < 40) this.chargePowerKw = 245;
      else if (this.batteryLevel < 60) this.chargePowerKw = 175;
      else if (this.batteryLevel < 80) this.chargePowerKw = 95;
      else this.chargePowerKw = 35;
    } else if (this.state === 'online') {
      shiftState = 'P';
      currentSpeed = 0;
      currentPower = 0;
    } else {
      // Asleep
      shiftState = null;
      currentSpeed = 0;
      currentPower = 0;
    }

    const ratedRange = Math.round(this.batteryLevel * 5.3); // ~530 km para 100%
    const estRange = Math.round(ratedRange * 0.94);

    return {
      timestamp: Date.now(),
      state: this.state,
      battery_level: Math.round(this.batteryLevel),
      usable_battery_level: Math.round(this.batteryLevel),
      battery_range_km: ratedRange,
      est_battery_range_km: estRange,
      charge_energy_added: this.chargeEnergyAdded,
      charger_power: this.state === 'charging' ? this.chargePowerKw : 0,
      charger_voltage: this.state === 'charging' ? 400 : 0,
      charger_actual_current: this.state === 'charging' ? Math.round((this.chargePowerKw * 1000) / 400) : 0,
      charging_state: this.state === 'charging' ? 'Charging' : 'Disconnected',
      time_to_full_charge: this.state === 'charging' ? +((100 - this.batteryLevel) / 45).toFixed(1) : 0,
      latitude: currentLat,
      longitude: currentLng,
      heading: 330,
      speed_kmh: currentSpeed,
      power_kw: currentPower,
      shift_state: shiftState,
      inside_temp: this.insideTemp,
      outside_temp: this.outsideTemp,
      is_climate_on: this.climateOn,
      locked: this.locked,
      sentry_mode: this.sentryOn,
      valet_mode: false,
      doors_open: {
        df: false,
        dr: false,
        pf: false,
        pr: false,
        ft: this.frunkOpen,
        rt: this.trunkOpen,
      },
    };
  }

  // Ejecución de comandos simulados
  executeCommand(command: string): { success: boolean; message: string } {
    switch (command) {
      case 'lock':
        this.locked = true;
        return { success: true, message: 'Vehículo bloqueado correctamente.' };
      case 'unlock':
        this.locked = false;
        return { success: true, message: 'Vehículo desbloqueado.' };
      case 'climate_toggle':
        this.climateOn = !this.climateOn;
        this.insideTemp = this.climateOn ? 21.0 : 25.0;
        return { success: true, message: `Climatización ${this.climateOn ? 'activada a 21°C' : 'apagada'}.` };
      case 'sentry_toggle':
        this.sentryOn = !this.sentryOn;
        return { success: true, message: `Modo Centinela ${this.sentryOn ? 'activado' : 'desactivado'}.` };
      case 'flash_lights':
        return { success: true, message: 'Ráfaga de luces ejecutada.' };
      case 'honk_horn':
        return { success: true, message: 'Claxon activado.' };
      case 'toggle_frunk':
        this.frunkOpen = !this.frunkOpen;
        return { success: true, message: `Maletero delantero (Frunk) ${this.frunkOpen ? 'abierto' : 'cerrado'}.` };
      case 'toggle_trunk':
        this.trunkOpen = !this.trunkOpen;
        return { success: true, message: `Maletero trasero ${this.trunkOpen ? 'abierto' : 'cerrado'}.` };
      case 'wake_up':
        this.state = 'online';
        return { success: true, message: 'Vehículo despierto y en línea.' };
      default:
        return { success: true, message: `Comando '${command}' simulado con éxito.` };
    }
  }
}

export const teslaSimulator = new TeslaSimulator();
