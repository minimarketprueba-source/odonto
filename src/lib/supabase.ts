import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Proyecto Supabase de la Sanidad (compartido con control de peso). Se usa como
// valor por defecto para que la app se conecte sola sin depender de variables de
// entorno en Vercel ni de configuración manual por navegador. La anon key es
// PÚBLICA por diseño (viaja en el bundle del navegador); los datos los protege el
// RLS, no esta clave. localStorage y las env vars siguen teniendo prioridad, por
// si se quiere apuntar a otro proyecto.
const DEFAULT_SUPABASE_URL = 'https://vnkstlvqzkhdfeoqskcf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZua3N0bHZxemtoZGZlb3Fza2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NDcxNzksImV4cCI6MjA3OTIyMzE3OX0.payZHPyk610p86m_a202oV_g-CqQB6hceNymLgkP-2Q';

// Función para obtener URL de Supabase (localStorage > .env > valor por defecto)
const getSupabaseUrl = (): string => {
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem("supabase_url") : null;
  if (storedUrl) return storedUrl;
  return import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
};

// Función para obtener la clave anónima (localStorage > .env > valor por defecto)
const getSupabaseAnonKey = (): string => {
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem("supabase_anon_key") : null;
  if (storedKey) return storedKey;
  return import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

// Verificar si Supabase está configurado (verifica en tiempo real)
export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && key);
};

if (!supabaseUrl) {
  logger.warn('VITE_SUPABASE_URL no está configurada');
}

if (!supabaseAnonKey) {
  logger.warn('VITE_SUPABASE_ANON_KEY no está configurada');
}

let projectRef = 'local';
try {
  const match = String(supabaseUrl ?? '').match(/^https:\/\/([a-zA-Z0-9-]+)\./);
  if (match && match[1]) {
    projectRef = match[1];
  }
} catch { /* noop */ }

const AUTH_STORAGE_KEY = `sanidad-citas-${projectRef}-auth-v1`;
const LEGACY_KEYS = [
  'supabase.auth.token',
  `sb-${projectRef}-auth-token`,
  `sanidad-citas-${projectRef}-admin-auth-v1`,
];

type SupabaseGlobal = typeof globalThis & {
  __supabaseClient?: SupabaseClient;
  __supabaseAuthListenerRegistered?: boolean;
  __supabaseInstanceId?: string;
};

const globalForSupabase = globalThis as SupabaseGlobal;
const INSTANCE_ID = `supabase-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const clearStorageKey = (storage: Storage, key: string) => {
  try {
    storage.removeItem(key);
  } catch { /* noop */ }
};

export const clearProjectStorage = () => {
  const allKeys = new Set<string>([AUTH_STORAGE_KEY, ...LEGACY_KEYS]);
  allKeys.forEach((key) => {
    clearStorageKey(localStorage, key);
    clearStorageKey(sessionStorage, key);
  });
};

function initSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    logger.warn('Supabase no estǭ configurado. Define la URL y la anon key para crear el cliente.');
    return null;
  }

  if (globalForSupabase.__supabaseClient && globalForSupabase.__supabaseInstanceId === INSTANCE_ID) {
    return globalForSupabase.__supabaseClient;
  }

  if (globalForSupabase.__supabaseClient && globalForSupabase.__supabaseInstanceId !== INSTANCE_ID) {
    logger.warn('Detectada instancia anterior de Supabase client, reemplazando...');
  }

  globalForSupabase.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: AUTH_STORAGE_KEY,
    },
    global: {
      headers: {
        'X-Client-Info': 'sanidad-citas-app',
      },
    },
  });

  globalForSupabase.__supabaseInstanceId = INSTANCE_ID;

  if (!globalForSupabase.__supabaseAuthListenerRegistered) {
    globalForSupabase.__supabaseClient.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearProjectStorage();
      }
    });
    globalForSupabase.__supabaseAuthListenerRegistered = true;
  }

  return globalForSupabase.__supabaseClient;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = initSupabaseClient();
    if (!client) {
      // Retornar una función no-op para métodos comunes cuando Supabase no está configurado
      const noOp = () => Promise.resolve({ data: null, error: null });
      const noOpObj = new Proxy(noOp, {
        get() { return noOpObj; },
        apply() { return Promise.resolve({ data: null, error: null }); }
      });
      return noOpObj;
    }
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

interface AuthError {
  message?: string;
  code?: string;
}

export const handleAuthError = (error: unknown) => {
  const authError = error as AuthError;
  logger.error('Error de autenticación:', authError);

  if (authError?.message?.includes('Invalid Refresh Token') || authError?.message?.includes('refresh_token_not_found')) {
    clearProjectStorage();
    window.location.href = '/login';
    return;
  }

  if (authError?.message?.includes('Failed to fetch') || authError?.code === 'ERR_CONNECTION_REFUSED') {
    logger.warn('Problema de conectividad. Verificar conexión a internet.');
  }
};

export const getProjectStorageInfo = () => ({
  projectRef,
  authStorageKey: AUTH_STORAGE_KEY,
  legacyKeys: [...LEGACY_KEYS],
});
