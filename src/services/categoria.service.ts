import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CATEGORIAS_API_URL, SUBCATEGORIAS_API_URL } from '../environments/api';

export type CategoriaDTO = {
  categoriaId: string;
  nombre: string;
  activo: boolean;
};

export type CategoriaCreateRequest = {
  nombre: string;
  activo?: boolean;
};

export type SubCategoriaDTO = {
  subCategoriaId: string;
  nombre: string;
  categoriaId: string;
  nombreCategoria: string;
  activo: boolean;
};

export type SubCategoriaCreateRequest = {
  nombre: string;
  categoriaId: string;
  activo?: boolean;
};

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  // ── Categorías ──────────────────────────────────────────
  async listAll(): Promise<CategoriaDTO[]> {
    return await firstValueFrom(
      this.http.get<CategoriaDTO[]>(CATEGORIAS_API_URL, { headers: this.authHeaders() })
    );
  }

  async listActivas(): Promise<CategoriaDTO[]> {
    return await firstValueFrom(
      this.http.get<CategoriaDTO[]>(`${CATEGORIAS_API_URL}/activas`, { headers: this.authHeaders() })
    );
  }

  async getById(id: string | number): Promise<CategoriaDTO> {
    return await firstValueFrom(
      this.http.get<CategoriaDTO>(`${CATEGORIAS_API_URL}/${id}`, { headers: this.authHeaders() })
    );
  }

  async create(data: CategoriaCreateRequest): Promise<CategoriaDTO> {
    return await firstValueFrom(
      this.http.post<CategoriaDTO>(CATEGORIAS_API_URL, data, { headers: this.authHeaders() })
    );
  }

  async update(id: string | number, data: CategoriaCreateRequest): Promise<CategoriaDTO> {
    return await firstValueFrom(
      this.http.put<CategoriaDTO>(`${CATEGORIAS_API_URL}/${id}`, data, { headers: this.authHeaders() })
    );
  }

  async delete(id: string | number): Promise<any> {
    return await firstValueFrom(
      this.http.delete(`${CATEGORIAS_API_URL}/${id}`, { headers: this.authHeaders() })
    );
  }

  // ── Subcategorías ───────────────────────────────────────
  async listSubcategorias(): Promise<SubCategoriaDTO[]> {
    return await firstValueFrom(
      this.http.get<SubCategoriaDTO[]>(SUBCATEGORIAS_API_URL, { headers: this.authHeaders() })
    );
  }

  async listSubcategoriasByCategoria(categoriaId: string | number): Promise<SubCategoriaDTO[]> {
    return await firstValueFrom(
      this.http.get<SubCategoriaDTO[]>(`${SUBCATEGORIAS_API_URL}/categoria/${categoriaId}`, { headers: this.authHeaders() })
    );
  }

  async getSubcategoriaById(id: string | number): Promise<SubCategoriaDTO> {
    return await firstValueFrom(
      this.http.get<SubCategoriaDTO>(`${SUBCATEGORIAS_API_URL}/${id}`, { headers: this.authHeaders() })
    );
  }

  async createSubcategoria(data: SubCategoriaCreateRequest): Promise<SubCategoriaDTO> {
    return await firstValueFrom(
      this.http.post<SubCategoriaDTO>(SUBCATEGORIAS_API_URL, data, { headers: this.authHeaders() })
    );
  }

  async updateSubcategoria(id: string | number, data: SubCategoriaCreateRequest): Promise<SubCategoriaDTO> {
    return await firstValueFrom(
      this.http.put<SubCategoriaDTO>(`${SUBCATEGORIAS_API_URL}/${id}`, data, { headers: this.authHeaders() })
    );
  }

  async deleteSubcategoria(id: string | number): Promise<any> {
    return await firstValueFrom(
      this.http.delete(`${SUBCATEGORIAS_API_URL}/${id}`, { headers: this.authHeaders() })
    );
  }
}
