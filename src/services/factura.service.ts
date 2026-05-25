import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FACTURAS_API_URL } from '../environments/api';

export interface FacturaDetalle {
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface FacturaResponse {
  facturaId: string;
  numero: string;
  fechaEmision: string;
  subtotal: number;
  igv: number;
  total: number;
  estado: string;
  clienteNombre: string;
  clienteDni: string;
  detalles: FacturaDetalle[];
}

@Injectable({ providedIn: 'root' })
export class FacturaService {
  private readonly TOKEN_KEY = 'auth_token';

  constructor(private http: HttpClient) {}

  private getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  async emitir(cotizacionId: string): Promise<FacturaResponse> {
    return await firstValueFrom(
      this.http.post<FacturaResponse>(FACTURAS_API_URL, { cotizacionId }, { headers: this.authHeaders() })
    );
  }

  async listar(): Promise<FacturaResponse[]> {
    return await firstValueFrom(
      this.http.get<FacturaResponse[]>(FACTURAS_API_URL, { headers: this.authHeaders() })
    );
  }

  async getById(id: string): Promise<FacturaResponse> {
    return await firstValueFrom(
      this.http.get<FacturaResponse>(`${FACTURAS_API_URL}/${id}`, { headers: this.authHeaders() })
    );
  }

  async filtrarPorEstado(estado: string): Promise<FacturaResponse[]> {
    return await firstValueFrom(
      this.http.get<FacturaResponse[]>(`${FACTURAS_API_URL}/buscar?estado=${estado}`, { headers: this.authHeaders() })
    );
  }

  async getByUsuario(usuarioId: string): Promise<FacturaResponse[]> {
    return await firstValueFrom(
      this.http.get<FacturaResponse[]>(`${FACTURAS_API_URL}/usuario/${usuarioId}`, { headers: this.authHeaders() })
    );
  }

  async anular(id: string): Promise<{ mensaje: string }> {
    return await firstValueFrom(
      this.http.put<{ mensaje: string }>(`${FACTURAS_API_URL}/anular/${id}`, {}, { headers: this.authHeaders() })
    );
  }

  async descargarPDF(id: string, numero: string): Promise<void> {
    const token = this.getToken();
    const response = await fetch(`${FACTURAS_API_URL}/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${numero}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (response.status === 403) {
      throw new Error('Sin permiso para descargar esta factura');
    } else {
      throw new Error(`Error al descargar PDF (${response.status})`);
    }
  }
}
