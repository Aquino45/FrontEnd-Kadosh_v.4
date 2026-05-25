// src/app/services/refraccion-descripcion-datos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { REFRACCION_DESC_DATOS_API_URL } from '../environments/api';

// ---------- Tipos base ----------
type ApiBase = {
  success: boolean;
  message?: string;
};

// ---------- DTO principal ----------
export interface RefraccionDescripcionDatosDTO {
  refraccionDescripcionDatosId: string; // UUID
  code: string;                         // ESF, CIL, EJE, DIP, AV...
  titulo: string;
  descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class RefraccionDescripcionDatosService {
  private readonly TOKEN_KEY = 'auth_token';

  constructor(private http: HttpClient) {}

  // ====== HEADERS ======
  private jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.TOKEN_KEY);
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  // ====== LISTAR TODAS ======
  async listAll(): Promise<RefraccionDescripcionDatosDTO[]> {
    const url = REFRACCION_DESC_DATOS_API_URL;

    return await firstValueFrom(
      this.http.get<RefraccionDescripcionDatosDTO[]>(url, {
        headers: this.authHeaders(),
      })
    );
  }

  // ====== OBTENER POR ID ======
  async getById(id: string): Promise<RefraccionDescripcionDatosDTO> {
    const url = `${REFRACCION_DESC_DATOS_API_URL}/${id}`;

    return await firstValueFrom(
      this.http.get<RefraccionDescripcionDatosDTO>(url, {
        headers: this.authHeaders(),
      })
    );
  }

  // ====== CREAR ======
  async create(payload: {
    code: string;
    titulo: string;
    descripcion: string;
  }): Promise<RefraccionDescripcionDatosDTO> {
    const url = REFRACCION_DESC_DATOS_API_URL;

    return await firstValueFrom(
      this.http.post<RefraccionDescripcionDatosDTO>(url, payload, {
        headers: this.authHeaders(),
      })
    );
  }

  // ====== ACTUALIZAR ======
  async update(
    id: string,
    payload: {
      code: string;
      titulo: string;
      descripcion: string;
    }
  ): Promise<RefraccionDescripcionDatosDTO> {
    const url = `${REFRACCION_DESC_DATOS_API_URL}/${id}`;

    return await firstValueFrom(
      this.http.put<RefraccionDescripcionDatosDTO>(url, payload, {
        headers: this.authHeaders(),
      })
    );
  }

  // ====== ELIMINAR ======
  async delete(id: string): Promise<ApiBase> {
    const url = `${REFRACCION_DESC_DATOS_API_URL}/${id}`;

    try {
      const resp = await firstValueFrom(
        this.http.delete<any>(url, {
          headers: this.authHeaders(),
          observe: 'response',
        })
      );

      if (resp.status === 204) {
        return { success: true, message: 'Registro eliminado correctamente' };
      }

      const body = resp.body ?? {};
      const ok = typeof body.success === 'boolean' ? body.success : true;
      const message =
        body.message ??
        (ok ? 'Registro eliminado correctamente' : 'No se pudo eliminar el registro');

      return { success: ok, message };
    } catch (e: any) {
      const status = e?.status ?? 0;
      const message =
        e?.error?.message ||
        (status === 404
          ? 'Registro no encontrado'
          : 'Error al eliminar el registro');
      throw Object.assign(new Error(message), { status });
    }
  }
}
