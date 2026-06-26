import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { REPORTES_API_URL, TIPO_REPORTES_API_URL } from '../environments/api';

export type ReporteFiltroDTO = {
  fechaInicio?: string | null;
  fechaFin?: string | null;
  usuarioId?: string | null;
  estado?: string | null;
  estadoPago?: boolean | null;
  categoriaId?: string | null;
  subCategoriaId?: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export interface ReporteVentasDTO {
  facturaId: string;
  numeroFactura: string;
  fechaEmision: string;
  usuarioId: string;
  clienteNombre: string;
  clienteDni: string;
  subtotal: number;
  igv: number;
  total: number;
  estado: string;
}

export interface ReporteCotizacionDTO {
  cotizacionId: string;
  fechaCreacion: string;
  usuarioId: string;
  clienteNombre: string;
  clienteDni: string;
  edad: number;
  total: number;
  estadoPago: boolean;
  fechaPago: string | null;
}

export interface ReporteHistorialOpticoDTO {
  historialOpticoId: string;
  fecha: string;
  usuarioId: string;
  paciente: string;
  dni: string;
  telefono: string;
  edad: number;
  evaluador: string;
  recomendaciones: string;
}

export interface ReporteProductoVendidoDTO {
  productoId: string;
  productoNombre: string;
  categoriaNombre: string;
  subCategoriaNombre: string;
  precioActual: number;
  cantidadVendida: number;
  totalVendido: number;
}

export interface ReporteServicioVendidoDTO {
  descripcion: string;
  cantidadVendida: number;
  totalVendido: number;
}

export interface ReporteResumenGeneralDTO {
  totalFacturas: number;
  totalVendido: number;
  totalCotizaciones: number;
  totalCotizacionesPagadas: number;
  totalCotizacionesPendientes: number;
  totalHistorialesOpticos: number;
  totalProductosVendidos: number;
}

export interface TipoReporteDTO {
  tipoReporteId: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  permitePdf: boolean;
  permiteExcel: boolean;
  activo: boolean;
  createdAt: string;
}

export type TipoReporteRequest = {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  permitePdf: boolean;
  permiteExcel: boolean;
  activo: boolean;
};

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly TOKEN_KEY = 'auth_token';

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.TOKEN_KEY);
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  // ===================== REPORTES EN VIVO =====================

  async reporteVentas(filtro: ReporteFiltroDTO): Promise<ReporteVentasDTO[]> {
    const resp = await firstValueFrom(
      this.http.post<ApiResponse<ReporteVentasDTO[]>>(`${REPORTES_API_URL}/ventas`, filtro, { headers: this.authHeaders() })
    );
    return resp.data ?? [];
  }

  async reporteCotizaciones(filtro: ReporteFiltroDTO): Promise<ReporteCotizacionDTO[]> {
    const resp = await firstValueFrom(
      this.http.post<ApiResponse<ReporteCotizacionDTO[]>>(`${REPORTES_API_URL}/cotizaciones`, filtro, { headers: this.authHeaders() })
    );
    return resp.data ?? [];
  }

  async reporteHistorialOptico(filtro: ReporteFiltroDTO): Promise<ReporteHistorialOpticoDTO[]> {
    const resp = await firstValueFrom(
      this.http.post<ApiResponse<ReporteHistorialOpticoDTO[]>>(`${REPORTES_API_URL}/historial-optico`, filtro, { headers: this.authHeaders() })
    );
    return resp.data ?? [];
  }

  async reporteProductosVendidos(filtro: ReporteFiltroDTO): Promise<ReporteProductoVendidoDTO[]> {
    const resp = await firstValueFrom(
      this.http.post<ApiResponse<ReporteProductoVendidoDTO[]>>(`${REPORTES_API_URL}/productos-vendidos`, filtro, { headers: this.authHeaders() })
    );
    return resp.data ?? [];
  }

  async reporteServiciosVendidos(filtro: ReporteFiltroDTO): Promise<ReporteServicioVendidoDTO[]> {
    const resp = await firstValueFrom(
      this.http.post<ApiResponse<ReporteServicioVendidoDTO[]>>(`${REPORTES_API_URL}/servicios-vendidos`, filtro, { headers: this.authHeaders() })
    );
    return resp.data ?? [];
  }

  async resumenGeneral(filtro: ReporteFiltroDTO): Promise<ReporteResumenGeneralDTO> {
    const resp = await firstValueFrom(
      this.http.post<ApiResponse<ReporteResumenGeneralDTO>>(`${REPORTES_API_URL}/resumen-general`, filtro, { headers: this.authHeaders() })
    );
    return resp.data;
  }

  // ===================== EXPORTAR PDF / EXCEL =====================

  exportarVentasPdf(filtro: ReporteFiltroDTO): Promise<Blob> {
    return this.descargarArchivo(`${REPORTES_API_URL}/ventas/exportar/pdf`, filtro);
  }
  exportarVentasExcel(filtro: ReporteFiltroDTO): Promise<Blob> {
    return this.descargarArchivo(`${REPORTES_API_URL}/ventas/exportar/excel`, filtro);
  }

  exportarCotizacionesPdf(filtro: ReporteFiltroDTO): Promise<Blob> {
    return this.descargarArchivo(`${REPORTES_API_URL}/cotizaciones/exportar/pdf`, filtro);
  }
  exportarCotizacionesExcel(filtro: ReporteFiltroDTO): Promise<Blob> {
    return this.descargarArchivo(`${REPORTES_API_URL}/cotizaciones/exportar/excel`, filtro);
  }

  exportarHistorialOpticoPdf(filtro: ReporteFiltroDTO): Promise<Blob> {
    return this.descargarArchivo(`${REPORTES_API_URL}/historial-optico/exportar/pdf`, filtro);
  }
  exportarHistorialOpticoExcel(filtro: ReporteFiltroDTO): Promise<Blob> {
    return this.descargarArchivo(`${REPORTES_API_URL}/historial-optico/exportar/excel`, filtro);
  }

  exportarProductosVendidosPdf(filtro: ReporteFiltroDTO): Promise<Blob> {
    return this.descargarArchivo(`${REPORTES_API_URL}/productos-vendidos/exportar/pdf`, filtro);
  }
  exportarProductosVendidosExcel(filtro: ReporteFiltroDTO): Promise<Blob> {
    return this.descargarArchivo(`${REPORTES_API_URL}/productos-vendidos/exportar/excel`, filtro);
  }

  private async descargarArchivo(url: string, filtro: ReporteFiltroDTO): Promise<Blob> {
    return await firstValueFrom(
      this.http.post(url, filtro, { headers: this.authHeaders(), responseType: 'blob' })
    );
  }

  // ===================== CATÁLOGO TIPO DE REPORTE =====================

  async listarTiposReporte(): Promise<TipoReporteDTO[]> {
    const resp = await firstValueFrom(
      this.http.get<ApiResponse<TipoReporteDTO[]>>(TIPO_REPORTES_API_URL, { headers: this.authHeaders() })
    );
    return resp.data ?? [];
  }

  async listarTiposReporteActivos(): Promise<TipoReporteDTO[]> {
    const resp = await firstValueFrom(
      this.http.get<ApiResponse<TipoReporteDTO[]>>(`${TIPO_REPORTES_API_URL}/activos`, { headers: this.authHeaders() })
    );
    return resp.data ?? [];
  }

  async crearTipoReporte(data: TipoReporteRequest): Promise<TipoReporteDTO> {
    const resp = await firstValueFrom(
      this.http.post<ApiResponse<TipoReporteDTO>>(TIPO_REPORTES_API_URL, data, { headers: this.authHeaders() })
    );
    return resp.data;
  }

  async actualizarTipoReporte(id: string, data: TipoReporteRequest): Promise<TipoReporteDTO> {
    const resp = await firstValueFrom(
      this.http.put<ApiResponse<TipoReporteDTO>>(`${TIPO_REPORTES_API_URL}/${id}`, data, { headers: this.authHeaders() })
    );
    return resp.data;
  }

  async eliminarTipoReporte(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<ApiResponse<void>>(`${TIPO_REPORTES_API_URL}/${id}`, { headers: this.authHeaders() })
    );
  }

  async desactivarTipoReporte(id: string): Promise<TipoReporteDTO> {
    const resp = await firstValueFrom(
      this.http.patch<ApiResponse<TipoReporteDTO>>(`${TIPO_REPORTES_API_URL}/${id}/desactivar`, {}, { headers: this.authHeaders() })
    );
    return resp.data;
  }
}
