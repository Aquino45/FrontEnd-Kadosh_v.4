// src/app/services/historial-optico.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HISTORIAL_OPTICO_API_URL } from '../environments/api';

// ====== Tipos base ======
type ApiBase = {
  success?: boolean;
  message?: string;
};

// ====== Tipos de visión ======
export type VisionPayload = {
  ojoIzquierdoEsf?: number | null;
  ojoDerechoEsf?: number | null;
  ojoIzquierdoCil?: number | null;
  ojoDerechoCil?: number | null;
  ojoIzquierdoEje?: number | null;
  ojoDerechoEje?: number | null;
  ojoIzquierdoDip?: number | null;
  ojoDerechoDip?: number | null;
  ojoIzquierdoAv?: string | null;
  ojoDerechoAv?: string | null;
};

// ====== Request para crear / actualizar ======
export type HistorialOpticoRequest = {
  usuarioId: string; 
  fecha: string; 
  
  // ✅ Nota: Estos campos ya no se guardan en la tabla Historial, 
  // pero se pueden enviar si el backend los procesa o ignora.
  telefono?: string | null;
  paciente?: string | null;
  dni?: string | null; // 👈 Agregado para el DTO
  edad?: number | null;

  visionLejos?: VisionPayload | null;
  visionCerca?: VisionPayload | null;

  analisisLejosOD?: string | null;
  analisisLejosOI?: string | null;
  analisisCercaOD?: string | null;
  analisisCercaOI?: string | null;

  imagenRefraccionUrl?: string | null;
  imagenLenzometriaUrl?: string | null;
  imagenKeratometriaUrl?: string | null;

  recomendaciones?: string | null;
  evaluador?: string | null;
};

// ====== Respuesta que viene del backend ======
export type HistorialOpticoResponse = ApiBase & {
  historialOpticoId?: string;
  usuarioId?: string; 
  fecha?: any;
  
  // ✅ Estos datos ahora vienen "vivos" desde Persona vía el Mapper del Backend
  dni?: string | null;      // 👈 Nuevo en la respuesta
  telefono?: string | null;
  paciente?: string | null; 
  edad?: number | null;
  
  visionLejos?: any;
  visionCerca?: any;

  analisisLejosOD?: string | null;
  analisisLejosOI?: string | null;
  analisisCercaOD?: string | null;
  analisisCercaOI?: string | null;

  imagenRefraccionUrl?: string | null;
  imagenLenzometriaUrl?: string | null;
  imagenKeratometriaUrl?: string | null;
  recomendaciones?: string | null;
  evaluador?: string | null;
  createdAt?: any;
};

@Injectable({ providedIn: 'root' })
export class HistorialOpticoService {

  private readonly TOKEN_KEY = 'auth_token';

  constructor(private http: HttpClient) { }

  private getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private jsonHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  // --- MÉTODOS DE API ---

  async create(data: HistorialOpticoRequest): Promise<HistorialOpticoResponse> {
    const url = `${HISTORIAL_OPTICO_API_URL}`;
    return await firstValueFrom(
      this.http.post<HistorialOpticoResponse>(url, data, { headers: this.jsonHeaders() })
    );
  }

  async actualizarHistorial(id: string, data: Partial<HistorialOpticoRequest>): Promise<HistorialOpticoResponse> {
    const url = `${HISTORIAL_OPTICO_API_URL}/${id}`;
    return await firstValueFrom(
      this.http.put<HistorialOpticoResponse>(url, data, { headers: this.jsonHeaders() })
    );
  }

  async listUsuariosConExpediente(): Promise<any[]> {
    const url = `${HISTORIAL_OPTICO_API_URL}/usuarios-con-expediente`;
    return await firstValueFrom(
      this.http.get<any[]>(url, { headers: this.jsonHeaders() })
    );
  }

  async getHistorialesByUsuario(usuarioId: string): Promise<HistorialOpticoResponse[]> {
    const url = `${HISTORIAL_OPTICO_API_URL}/usuario/${usuarioId}`;
    return await firstValueFrom(
      this.http.get<HistorialOpticoResponse[]>(url, { headers: this.jsonHeaders() })
    );
  }
}