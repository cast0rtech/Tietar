// Algoritmo Guardián de Sueño (Sleep Watchdog & Vampire Drain Protector)
// Evita el drenaje fantasma dejando dormir el vehículo tras 15-20 minutos de inactividad

export interface WatchdogStatus {
  isAllowingSleep: boolean;
  minutesParked: number;
  minutesUntilSleepAllowed: number;
  statusText: string;
  recommendedPollIntervalMs: number;
}

export class SleepWatchdog {
  private parkedSince: number | null = null;
  private sleepThresholdMinutes: number = 15; // Tiempo estándar que necesita un Tesla sin peticiones para entrar en sueño profundo
  private isVehicleDriving: boolean = false;
  private isVehicleCharging: boolean = false;
  private isVehicleAsleep: boolean = false;

  constructor(thresholdMinutes: number = 15) {
    this.sleepThresholdMinutes = thresholdMinutes;
  }

  setThreshold(minutes: number) {
    this.sleepThresholdMinutes = minutes;
  }

  // Actualiza el estado con la última telemetría
  updateVehicleState(state: 'asleep' | 'online' | 'driving' | 'charging' | 'offline', speedKmh: number = 0) {
    const now = Date.now();

    if (state === 'driving' || speedKmh > 0) {
      this.isVehicleDriving = true;
      this.isVehicleCharging = false;
      this.isVehicleAsleep = false;
      this.parkedSince = null;
      return;
    }

    if (state === 'charging') {
      this.isVehicleDriving = false;
      this.isVehicleCharging = true;
      this.isVehicleAsleep = false;
      this.parkedSince = null;
      return;
    }

    if (state === 'asleep') {
      this.isVehicleDriving = false;
      this.isVehicleCharging = false;
      this.isVehicleAsleep = true;
      if (!this.parkedSince) this.parkedSince = now - (this.sleepThresholdMinutes + 5) * 60 * 1000;
      return;
    }

    // Si está 'online' y aparcado
    this.isVehicleDriving = false;
    this.isVehicleCharging = false;
    this.isVehicleAsleep = false;

    if (!this.parkedSince) {
      this.parkedSince = now;
    }
  }

  // Evalúa si la app debe permitir al coche dormir y qué intervalo de sondeo usar
  evaluate(): WatchdogStatus {
    if (this.isVehicleDriving) {
      return {
        isAllowingSleep: false,
        minutesParked: 0,
        minutesUntilSleepAllowed: this.sleepThresholdMinutes,
        statusText: 'Vehículo en movimiento (Sondeo rápido cada 10s)',
        recommendedPollIntervalMs: 10_000,
      };
    }

    if (this.isVehicleCharging) {
      return {
        isAllowingSleep: false,
        minutesParked: 0,
        minutesUntilSleepAllowed: this.sleepThresholdMinutes,
        statusText: 'Vehículo cargando (Sondeo cada 60s)',
        recommendedPollIntervalMs: 60_000,
      };
    }

    if (this.isVehicleAsleep) {
      return {
        isAllowingSleep: true,
        minutesParked: this.parkedSince ? Math.round((Date.now() - this.parkedSince) / 60000) : 60,
        minutesUntilSleepAllowed: 0,
        statusText: 'Coche en reposo profundo (Sondeo pasivo sin despertar)',
        recommendedPollIntervalMs: 30 * 60_000, // 30 minutos
      };
    }

    // Está online aparcado
    const minutesParked = this.parkedSince ? Math.floor((Date.now() - this.parkedSince) / 60000) : 0;
    const remaining = Math.max(0, this.sleepThresholdMinutes - minutesParked);

    if (remaining === 0) {
      return {
        isAllowingSleep: true,
        minutesParked,
        minutesUntilSleepAllowed: 0,
        statusText: 'Inactividad superada: Protegiendo sueño para evitar drenaje fantasma',
        recommendedPollIntervalMs: 20 * 60_000, // 20 minutos de silencio absoluto
      };
    }

    return {
      isAllowingSleep: false,
      minutesParked,
      minutesUntilSleepAllowed: remaining,
      statusText: `Aparcado hace ${minutesParked}m (Permitiendo sueño en ${remaining}m)`,
      recommendedPollIntervalMs: 60_000, // 1 minuto
    };
  }
}

export const sleepWatchdog = new SleepWatchdog(15);
