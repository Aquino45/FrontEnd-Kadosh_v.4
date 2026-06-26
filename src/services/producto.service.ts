import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PRODUCTOS_API_URL } from '../environments/api';

export type TipoMovimientoStock = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'VENTA' | 'ANULACION';

export type ProductoDTO = {
  productoId: string;
  nombre: string;
  precioActual: number | null;
  stock: number;
  activo: boolean;
  categoriaId?: string;
  nombreCategoria?: string;
  subCategoriaId?: string;
  nombreSubCategoria?: string;
};

export type ProductoCreateRequest = {
  nombre: string;
  precioActual: number;
  stock: number;
  categoriaId: string;
  subCategoriaId: string;
  activo?: boolean;
};

export type AjusteStockRequest = {
  cantidad: number;
  tipo: TipoMovimientoStock;
  motivo?: string;
};

export type MovimientoStockDTO = {
  movimientoId: string;
  productoId: string;
  nombreProducto?: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo?: string;
  usuarioId?: string;
  fecha: string;
};

export type ProductoBuscarParams = {
  nombre?: string;
  categoriaId?: string;
  subCategoriaId?: string;
  activo?: string;
};

@Injectable({ providedIn: 'root' })
export class ProductoService {
  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  async listAll(): Promise<ProductoDTO[]> {
    return await firstValueFrom(
      this.http.get<ProductoDTO[]>(PRODUCTOS_API_URL, { headers: this.authHeaders() })
    );
  }

  async getById(id: string): Promise<ProductoDTO> {
    return await firstValueFrom(
      this.http.get<ProductoDTO>(`${PRODUCTOS_API_URL}/${id}`, { headers: this.authHeaders() })
    );
  }

  async listByCategoria(categoriaId: string): Promise<ProductoDTO[]> {
    return await firstValueFrom(
      this.http.get<ProductoDTO[]>(`${PRODUCTOS_API_URL}/categoria/${categoriaId}`, { headers: this.authHeaders() })
    );
  }

  async buscar(params: ProductoBuscarParams): Promise<ProductoDTO[]> {
    let httpParams = new HttpParams();
    if (params.nombre) httpParams = httpParams.set('nombre', params.nombre);
    if (params.categoriaId !== undefined && params.categoriaId !== '') httpParams = httpParams.set('categoriaId', String(params.categoriaId));
    if (params.subCategoriaId !== undefined && params.subCategoriaId !== '') httpParams = httpParams.set('subCategoriaId', String(params.subCategoriaId));
    if (params.activo !== undefined && params.activo !== '') httpParams = httpParams.set('activo', params.activo);
    return await firstValueFrom(
      this.http.get<ProductoDTO[]>(`${PRODUCTOS_API_URL}/buscar`, { headers: this.authHeaders(), params: httpParams })
    );
  }

  async getStockBajo(limite = 5): Promise<ProductoDTO[]> {
    const httpParams = new HttpParams().set('limite', String(limite));
    return await firstValueFrom(
      this.http.get<ProductoDTO[]>(`${PRODUCTOS_API_URL}/stock-bajo`, { headers: this.authHeaders(), params: httpParams })
    );
  }

  async create(data: ProductoCreateRequest): Promise<ProductoDTO> {
    return await firstValueFrom(
      this.http.post<ProductoDTO>(PRODUCTOS_API_URL, data, { headers: this.authHeaders() })
    );
  }

  async update(id: string, data: ProductoCreateRequest): Promise<ProductoDTO> {
    return await firstValueFrom(
      this.http.put<ProductoDTO>(`${PRODUCTOS_API_URL}/${id}`, data, { headers: this.authHeaders() })
    );
  }

  async delete(id: string): Promise<any> {
    return await firstValueFrom(
      this.http.delete(`${PRODUCTOS_API_URL}/${id}`, { headers: this.authHeaders() })
    );
  }

  async ajustarStock(id: string, data: AjusteStockRequest): Promise<ProductoDTO> {
    return await firstValueFrom(
      this.http.put<ProductoDTO>(`${PRODUCTOS_API_URL}/${id}/stock`, data, { headers: this.authHeaders() })
    );
  }

  async getMovimientosByProducto(id: string): Promise<MovimientoStockDTO[]> {
    return await firstValueFrom(
      this.http.get<MovimientoStockDTO[]>(`${PRODUCTOS_API_URL}/${id}/movimientos`, { headers: this.authHeaders() })
    );
  }

  async getMovimientos(): Promise<MovimientoStockDTO[]> {
    return await firstValueFrom(
      this.http.get<MovimientoStockDTO[]>(`${PRODUCTOS_API_URL}/movimientos`, { headers: this.authHeaders() })
    );
  }
}
