import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CATEGORIAS_API_URL, SUBCATEGORIAS_API_URL, PRODUCTOS_API_URL } from '../environments/api';

@Injectable({ providedIn: 'root' })
export class InventarioService {
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

  // --- CATEGORÍAS ---
  async listarCategorias(): Promise<any[]> {
    // 🔥 Agregamos el /activas que faltaba
    return await firstValueFrom(
      this.http.get<any[]>(`${CATEGORIAS_API_URL}/activas`, { headers: this.jsonHeaders() })
    );
  }

  // --- SUBCATEGORÍAS ---
  async listarSubcategoriasPorCategoria(categoriaId: string): Promise<any[]> {
    const url = `${SUBCATEGORIAS_API_URL}/categoria/${categoriaId}`;
    return await firstValueFrom(
      this.http.get<any[]>(url, { headers: this.jsonHeaders() })
    );
  }

  // --- PRODUCTOS ---
  async listarProductosPorSubcategoria(subcategoriaId: string): Promise<any[]> {
    const url = `${PRODUCTOS_API_URL}/subcategoria/${subcategoriaId}`;
    return await firstValueFrom(
      this.http.get<any[]>(url, { headers: this.jsonHeaders() })
    );
  }

  async listarTodosProductos(): Promise<any[]> {
    return await firstValueFrom(
      this.http.get<any[]>(PRODUCTOS_API_URL, { headers: this.jsonHeaders() })
    );
  }
}