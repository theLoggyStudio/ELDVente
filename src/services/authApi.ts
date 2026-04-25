import { CLE_AUTH_TOKEN } from '../constants/ts/Keys.constant';
import { apiRequest } from './apiClient';

type LoginResponse = {
  token: string;
  user: { id: number; nom: string; email: string; tel: string };
};

export const authApi = {
  getToken: () => localStorage.getItem(CLE_AUTH_TOKEN) ?? '',
  setToken: (token: string) => localStorage.setItem(CLE_AUTH_TOKEN, token),
  clearToken: () => localStorage.removeItem(CLE_AUTH_TOKEN),
  login: (email: string, motDePasse: string) =>
    apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, motDePasse }),
    }),
  changePassword: (ancienMotDePasse: string, nouveauMotDePasse: string, token: string) =>
    apiRequest<{ message: string }>('/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ancienMotDePasse, nouveauMotDePasse }),
    }),
};
