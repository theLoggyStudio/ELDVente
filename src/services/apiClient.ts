import { API_BASE_URL } from '../constants/ts/Couleur.constant';

const baseUrl = API_BASE_URL || 'http://localhost:4000/api';

export const apiRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${baseUrl}${path}`, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
};
