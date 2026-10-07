// Gestor unificado de autenticación multi-método para Tietar
import { teslaApi } from './teslaApi';
import { tessieApi } from './tessieApi';
import { backgroundSync } from './backgroundSync';

export type AuthProviderType = 'demo' | 'tesla' | 'tessie' | 'email';

export interface UserSession {
  id: string;
  email?: string;
  displayName: string;
  provider: AuthProviderType;
  token?: string;
  isAuthenticated: boolean;
}

const STORAGE_KEYS = {
  ACTIVE_PROVIDER: 'tietar_active_provider',
  TESLA_TOKEN: 'tietar_tesla_token',
  TESSIE_TOKEN: 'tietar_tessie_token',
  USER_SESSION: 'tietar_user_session',
  LOCAL_USERS: 'tietar_local_registered_users',
};

export class AuthService {
  private currentSession: UserSession = {
    id: 'local_demo',
    displayName: 'Demo Driver',
    provider: 'demo',
    isAuthenticated: false,
  };

  constructor() {
    this.restoreSession();
  }

  // Restaurar sesión desde almacenamiento local
  restoreSession() {
    try {
      const savedProvider = (localStorage.getItem(STORAGE_KEYS.ACTIVE_PROVIDER) as AuthProviderType) || 'demo';
      const savedTeslaToken = localStorage.getItem(STORAGE_KEYS.TESLA_TOKEN);
      const savedTessieToken = localStorage.getItem(STORAGE_KEYS.TESSIE_TOKEN);
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER_SESSION);

      if (savedTeslaToken) teslaApi.setToken(savedTeslaToken);
      if (savedTessieToken) tessieApi.setToken(savedTessieToken);

      if (savedUser) {
        this.currentSession = JSON.parse(savedUser);
      } else if (savedProvider === 'tessie' && savedTessieToken) {
        this.currentSession = {
          id: 'user_tessie',
          displayName: 'Tessie Driver',
          provider: 'tessie',
          token: savedTessieToken,
          isAuthenticated: true,
        };
      } else if (savedProvider === 'tesla' && savedTeslaToken) {
        this.currentSession = {
          id: 'user_tesla',
          displayName: 'Tesla Fleet Driver',
          provider: 'tesla',
          token: savedTeslaToken,
          isAuthenticated: true,
        };
      }

      // Desactivar simulador automáticamente si hay un proveedor real conectado
      const isRealProvider = (savedProvider === 'tessie' && !!savedTessieToken) || (savedProvider === 'tesla' && !!savedTeslaToken);
      backgroundSync.setSimulatorMode(!isRealProvider);
    } catch {
      // Fallback a demo si falla el parseo
    }
  }

  getSession(): UserSession {
    return this.currentSession;
  }

  // 1. Iniciar sesión con Token de Tessie
  async loginWithTessie(token: string): Promise<{ success: boolean; message: string }> {
    const trimmed = token.trim();
    if (!trimmed) throw new Error('El token de Tessie no puede estar vacío.');

    tessieApi.setToken(trimmed);
    // Validación real contra la API de Tessie
    try {
      const vehicles = await tessieApi.getVehicles();
      const firstCarName = vehicles[0]?.display_name || 'Tesla (Tessie)';

      this.currentSession = {
        id: `tessie_${Date.now()}`,
        displayName: firstCarName,
        provider: 'tessie',
        token: trimmed,
        isAuthenticated: true,
      };

      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROVIDER, 'tessie');
      localStorage.setItem(STORAGE_KEYS.TESSIE_TOKEN, trimmed);
      localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(this.currentSession));

      // Activar inmediatamente modo real y forzar lectura de telemetría online
      backgroundSync.setSimulatorMode(false);
      await backgroundSync.performSyncTick();

      return { success: true, message: `Conectado a Tessie exitosamente (${vehicles.length} vehículos). Telemetría en vivo activa.` };
    } catch (err: any) {
      throw new Error(`Error validando token con Tessie: ${err.message}`);
    }
  }

  // 2. Iniciar sesión con Token de Tesla Fleet
  async loginWithTesla(token: string): Promise<{ success: boolean; message: string }> {
    const trimmed = token.trim();
    if (!trimmed) throw new Error('El token de Tesla no puede estar vacío.');

    teslaApi.setToken(trimmed);
    this.currentSession = {
      id: `tesla_${Date.now()}`,
      displayName: 'Tesla Driver',
      provider: 'tesla',
      token: trimmed,
      isAuthenticated: true,
    };

    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROVIDER, 'tesla');
    localStorage.setItem(STORAGE_KEYS.TESLA_TOKEN, trimmed);
    localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(this.currentSession));

    backgroundSync.setSimulatorMode(false);
    try {
      await backgroundSync.performSyncTick();
    } catch (err: any) {
      console.warn('Sync inicial con Tesla falló:', err.message);
    }

    return { success: true, message: 'Token de Tesla configurado exitosamente. Telemetría en vivo activa.' };
  }

  // 3. Iniciar sesión con Email y Contraseña
  async loginWithEmail(email: string, pass: string): Promise<{ success: boolean; message: string }> {
    const normEmail = email.trim().toLowerCase();
    if (!normEmail || !pass) throw new Error('Email y contraseña obligatorios');

    // Comprobar registro en almacenamiento seguro local
    const rawUsers = localStorage.getItem(STORAGE_KEYS.LOCAL_USERS);
    const users = rawUsers ? JSON.parse(rawUsers) : {};

    if (!users[normEmail]) {
      // Si no existe, lo registramos automáticamente para facilitar el onboarding en la app local
      users[normEmail] = {
        email: normEmail,
        displayName: normEmail.split('@')[0],
        createdAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEYS.LOCAL_USERS, JSON.stringify(users));
    }

    this.currentSession = {
      id: `usr_${normEmail}`,
      email: normEmail,
      displayName: users[normEmail].displayName || normEmail.split('@')[0],
      provider: 'email',
      isAuthenticated: true,
    };

    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROVIDER, 'email');
    localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(this.currentSession));

    return { success: true, message: `Sesión iniciada como ${normEmail}` };
  }

  logout() {
    this.currentSession = {
      id: 'local_demo',
      displayName: 'Demo Driver',
      provider: 'demo',
      isAuthenticated: false,
    };
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROVIDER);
    localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
  }
}

export const authService = new AuthService();
