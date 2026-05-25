import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { COTIZACIONES_API_URL } from '../environments/api';

// ====== Tipos para Cotización ======
export type DetalleCotizacionRequest = {
  productoId: string;
  cantidad: number;
};

export type ServicioCotizacionRequest = {
  descripcion: string;
  precio: number;
  cantidad: number;
};

export type CotizacionRequest = {
  usuarioId: string;
  historialId?: string | null;
  fechaCreacion: string;
  items: DetalleCotizacionRequest[];
  servicios?: ServicioCotizacionRequest[];
};

@Injectable({ providedIn: 'root' })
export class CotizacionService {
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

  // Crea la cotización enviando productos, usuario e historial
  async create(data: CotizacionRequest): Promise<any> {
    const url = `${COTIZACIONES_API_URL}/crear`;
    return await firstValueFrom(
      this.http.post<any>(url, data, { headers: this.jsonHeaders() })
    );
  }

  // Lista resumida para tu tabla principal de Wimiline
  async listUsuariosConCotizacion(): Promise<any[]> {
    const url = `${COTIZACIONES_API_URL}/usuarios-con-cotizaciones`;
    return await firstValueFrom(
      this.http.get<any[]>(url, { headers: this.jsonHeaders() })
    );
  }

  // Historial de todas las cotizaciones de un solo paciente
  async getHistorialByUsuario(usuarioId: string): Promise<any[]> {
    const url = `${COTIZACIONES_API_URL}/usuario/${usuarioId}`;
    return await firstValueFrom(
      this.http.get<any[]>(url, { headers: this.jsonHeaders() })
    );
  }

  // Detalle profundo de UNA sola cotización (el que devuelve productos formateados)
  async getDetalleById(id: string): Promise<any> {
    const url = `${COTIZACIONES_API_URL}/${id}`;
    return await firstValueFrom(
      this.http.get<any>(url, { headers: this.jsonHeaders() })
    );
  }

  // Acción para cambiar el estado a PAGADO (usado en módulo cotizaciones)
  async registrarPago(id: string): Promise<void> {
    const url = `${COTIZACIONES_API_URL}/pagar/${id}`;
    await firstValueFrom(
      this.http.put<void>(url, {}, { headers: this.jsonHeaders() })
    );
  }

  // Registra pago desde el módulo de facturación (PATCH /{id}/pagar)
  async pagarParaFactura(id: string): Promise<any> {
    const url = `${COTIZACIONES_API_URL}/${id}/pagar`;
    return await firstValueFrom(
      this.http.patch<any>(url, {}, { headers: this.jsonHeaders() })
    );
  }

  
}