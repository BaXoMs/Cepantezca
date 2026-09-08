import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "cepantezca:hosts";

export type ConnectionMode = "wifi" | "usb";

export type SavedHost = {
  id: string;
  name: string;
  address: string; // IP o "localhost" en modo usb
  port: string;
  mode: ConnectionMode;
  lastConnected?: number;
  fps?: number;
  quality?: number;
};

export async function loadHosts(): Promise<SavedHost[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedHost[];
  } catch {
    return [];
  }
}

export async function saveHost(host: SavedHost): Promise<SavedHost[]> {
  const hosts = await loadHosts();
  const idx = hosts.findIndex((h) => h.id === host.id);
  if (idx >= 0) {
    hosts[idx] = { ...hosts[idx], ...host };
  } else {
    hosts.push(host);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(hosts));
  return hosts;
}

export async function updateHost(host: SavedHost): Promise<SavedHost[]> {
  return saveHost(host);
}

export async function deleteHost(id: string): Promise<SavedHost[]> {
  const hosts = (await loadHosts()).filter((h) => h.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(hosts));
  return hosts;
}

export async function touchHost(id: string): Promise<void> {
  const hosts = await loadHosts();
  const idx = hosts.findIndex((h) => h.id === id);
  if (idx >= 0) {
    hosts[idx].lastConnected = Date.now();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(hosts));
  }
}

/** Comprueba si el host está disponible respondiendo al endpoint /api/ping */
export async function checkHostPing(host: SavedHost): Promise<boolean> {
  const hostAddress = host.mode === "usb" ? "localhost" : host.address;
  const url = `http://${hostAddress}:${host.port}/api/ping`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1800);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

/** Formato amigable de última conexión */
export function formatLastConnected(timestamp?: number): string {
  if (!timestamp) return "Sin conexiones previas";
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Conectado hace un momento";
  if (diffMinutes < 60) return `Conectado hace ${diffMinutes} min`;
  if (diffHours < 24) return `Conectado hace ${diffHours} h`;
  if (diffDays === 1) return "Conectado ayer";
  return `Conectado hace ${diffDays} días`;
}
