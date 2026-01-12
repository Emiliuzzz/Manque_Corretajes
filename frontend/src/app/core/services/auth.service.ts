import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  exp?: number;
  user_id?: number;
  username?: string;
  email?: string;
  rol?: 'ADMIN' | 'PROPIETARIO' | 'CLIENTE' | string;
}


@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = 'http://127.0.0.1:8000/api';
  private TOKEN_KEY = 'access_token';

  constructor(private http: HttpClient) {}

  // ---- Login contra Django ----
  login(username: string, password: string) {
    return this.http.post<{ access: string; refresh?: string }>(
      `${this.baseUrl}/token/`,
      { username, password }
    );
  }

  // ---- Registro de usuario ----
  registrar(datos: { nombre: string; email: string; password: string }) {
    return this.http.post(`${this.baseUrl}/register/`, datos);
  }

  // ---- Almacenar/leer token ----
  setToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  // ---- Decodificar token ----
  getPayload(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = jwtDecode<JwtPayload>(token);
      return payload;
    } catch {
      return null;
    }
  }

  // ---- Helpers útiles ----
  isLoggedIn(): boolean {
    const payload = this.getPayload();
    if (!payload?.exp) return !!payload;
    const now = Date.now() / 1000;
    return payload.exp > now;
  }

  getRole(): string | null {
    return this.getPayload()?.rol ?? null;
  }

  hasRole(role: string): boolean {
    return this.getRole() === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const r = this.getRole();
    if (!r) return false;
    return roles.includes(r);
  }
  logout() {
    this.clearToken();
  }
}
