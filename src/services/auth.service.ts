// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AUTH_API_URL } from '../environments/api';

// ---------- Tipos base ----------
type ApiBase = {
  success: boolean;
  message?: string;
};

// ---------- /auth/login ----------
export type LoginResponse = ApiBase & {
  token?: string;
  user?: {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    email: string;
    telefono?: string | null;
    // 🚨 CAMBIO AQUÍ:
    // Antes: activo: boolean;
    // Ahora: estado recibe el texto que manda el Java ("ACTIVO", "SEFUE", "LOBANANEE")
    estado: string;

    rol?: string;
    imagen_url?: string;
    // ✅ Agregamos el apoderado a la respuesta del login
    apoderado?: {
      nombre: string;
      apellido: string;
      dni: string;
      telefono: string;
      parentesco: string;
    } | null;
  };
};

// ---------- /auth/me ----------
export type MeResponse = ApiBase & {
  data?: {
    usuarioId: string;
    rol: string | null;
    nombre: string;
    apellido: string;
    dni: string;
    correo: string;
    telefono: string | null;
    imagenUrl: string | null;
    fechaNacimiento: string | null;

    // OJO: Si en el futuro agregas 'estado' al DTO de /me en el backend, agrégalo aquí también.
    // Por ahora lo dejamos así.
    
    // ✅ Datos del apoderado que vienen del SubDatosUserDTO
    
    nombreApoderado?: string;
    apellidoApoderado?: string;
    dniApoderado?: string;
    telefonoApoderado?: string;
    parentesco?: string;
  };
};

// ---------- /auth/register ----------
export type RegisterRequest = {
  nombre: string;
  apellido: string;
  email?: string | null;
  telefono: string;
  dni: string;
  password: string;
  fechaNacimiento?: string | null; // Agregado para la edad
  imagenUrl?: string | null;
  // ✅ El objeto apoderado que el Backend espera
  apoderado?: {
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    parentesco: string;
  } | null;
};

export type RegisterResponse = ApiBase;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';

  constructor(private http: HttpClient) {}

  // ====== TOKEN ======
  setToken(token: string) { localStorage.setItem(this.TOKEN_KEY, token); }
  getToken(): string | null { return localStorage.getItem(this.TOKEN_KEY); }
  clearToken() { localStorage.removeItem(this.TOKEN_KEY); }
  isLoggedIn(): boolean { return !!this.getToken(); }

  // ====== HEADERS ======
  private jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }
  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  // ====== LOGIN ======
  async login(dni: string, password: string): Promise<LoginResponse> {
    const url = `${AUTH_API_URL}/login`;
    const body = { dni, password };
    const resp = await firstValueFrom(
      this.http.post<LoginResponse>(url, body, { headers: this.jsonHeaders() })
    );
    if (resp?.success && resp?.token) this.setToken(resp.token);
    return resp;
  }

  // ====== REGISTER ======
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const url = `${AUTH_API_URL}/register`;
    return await firstValueFrom(
      this.http.post<RegisterResponse>(url, data, { headers: this.jsonHeaders() })
    );
  }

  // ====== PERFIL / ME ======
  async me(): Promise<MeResponse> {
    const url = `${AUTH_API_URL}/me`;
    return await firstValueFrom(
      this.http.get<MeResponse>(url, { headers: this.authHeaders() })
    );
  }

  

  // ====== LOGOUT ======
  logout() { this.clearToken(); }
}
