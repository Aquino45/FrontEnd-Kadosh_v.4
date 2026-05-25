// src/app/services/usuarios.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { USUARIOS_API_URL } from '../environments/api';
// 🚨 1. IMPORTA TU ENUM (Si creaste el archivo, si no, usa string abajo)
import { EstadoUsuario } from '../enums/estado-usuario.enum';

// ---------- Tipos base ----------
type ApiBase = {
  success: boolean;
  message?: string;
};

// ---------- /usuarios/clientes (Lista Resumida) ----------
export interface ClienteListItemDTO {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  dni: string | null;
  imagenUrl: string | null;
  createdAt: any;
  edad: number | null;
  fechaNacimiento: string | null;
  // Opcional: Si quieres mostrar el estado en la tabla de lista
  // estado?: string;
}

// 🚨 NUEVOS DTOS PARA CONTRASEÑAS
export interface ChangePasswordRequest {
  actualPassword?: string; // Solo para el cambio normal
  newPassword: string;     // Obligatorio para ambos
}

// ---------- DTO para datos COMPLETOS (Incluye Apoderado) ----------
export interface SubDatosUserDTO {
  usuarioId: string;
  rol: string;
  fechaPrimerHistorial: string | null;

  // 🚨 2. AGREGADO: Para recibir el estado actual del usuario
  estado: EstadoUsuario | string;

  // Persona
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  correo: string | null;
  telefono: string | null;
  imagenUrl: string | null;
  fechaNacimiento: string | null;

  // Edad calculada
  edad: number | null;

  // Apoderado
  nombreApoderado: string | null;
  apellidoApoderado: string | null;
  dniApoderado: string | null;
  telefonoApoderado: string | null;
  parentesco: string | null;
}

// ---------- DTO para búsqueda flexible ----------
export interface ClienteSearchRequest {
  dni: string;
  nombre: string;
}

// ---------- Wrapper opcional ----------
type ClientesWrapped = {
  success: boolean;
  message?: string;
  data?: ClienteListItemDTO[];
};

// ---------- DTO para actualización de persona ----------
export type PersonaUpdateRequest = {
  nombre?: string | null;
  apellido?: string | null;
  email?: string | null;
  telefono?: string | null;
  dni?: string | null;
  imagenUrl?: string | null;
  fechaNacimiento?: string | null;
  edad?: number | null;

  // 🚨 3. AGREGADO: Para poder enviar el cambio de estado (Banear/Reactivar)
  estado?: string;

  // Campos del apoderado
  nombreApoderado?: string | null;
  apellidoApoderado?: string | null;
  dniApoderado?: string | null;
  telefonoApoderado?: string | null;
  parentesco?: string | null;

  // ✅ AGREGADO: El interruptor para borrar apoderado
  eliminarApoderado?: boolean;
};

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly TOKEN_KEY = 'auth_token';

  constructor(private http: HttpClient) { }

  // ====== HEADERS ======
  private jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.TOKEN_KEY);
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  // ====== LISTAR CLIENTES ======
  async listClientes(): Promise<ClienteListItemDTO[]> {
    const url = `${USUARIOS_API_URL}/clientes`;

    const resp = await firstValueFrom(
      this.http.get<ClienteListItemDTO[] | ClientesWrapped>(url, { headers: this.authHeaders() })
    );

    if (Array.isArray(resp)) return resp;
    if (resp && 'data' in resp && Array.isArray(resp.data)) return resp.data as ClienteListItemDTO[];

    const msg = (resp as any)?.message || 'Respuesta inválida del servidor.';
    throw Object.assign(new Error(msg), { status: 200 });
  }

  // ====== OBTENER UN USUARIO POR ID (Datos Completos) ======
  async getById(id: string): Promise<{ success: boolean; data: SubDatosUserDTO }> {
    const url = `${USUARIOS_API_URL}/${id}`;
    return await firstValueFrom(
      this.http.get<{ success: boolean; data: SubDatosUserDTO }>(url, { headers: this.authHeaders() })
    );
  }

  // ====== FILTRAR CLIENTES (por DNI o Nombre) ======
  async searchClientes(req: { dni: string; nombre: string }): Promise<ClienteListItemDTO[]> {
    const url = `${USUARIOS_API_URL}/clientes/search`;
    const resp = await firstValueFrom(
      this.http.post<any>(url, req, { headers: this.authHeaders() })
    );

    if (Array.isArray(resp)) return resp;
    if (resp && Array.isArray(resp.data)) return resp.data;

    return [];
  }

  // ====== ACTUALIZAR PERSONA ======
  // Aquí se enviará el payload con 'eliminarApoderado: true' si es necesario
  async updatePersona(usuarioId: string, payload: PersonaUpdateRequest): Promise<any> {
    const url = `${USUARIOS_API_URL}/${usuarioId}/persona`;
    return await firstValueFrom(
      this.http.put<any>(url, payload, { headers: this.authHeaders() })
    );
  }

  // ====== ELIMINAR USUARIO ======
  async deleteUsuario(usuarioId: string): Promise<ApiBase> {
    const url = `${USUARIOS_API_URL}/${usuarioId}`;

    try {
      const resp = await firstValueFrom(
        this.http.delete<any>(url, {
          headers: this.authHeaders(),
          observe: 'response'
        })
      );

      if (resp.status === 204) {
        return { success: true, message: 'Usuario eliminado correctamente' };
      }

      const body = resp.body ?? {};
      const ok = typeof body.success === 'boolean' ? body.success : true;
      const message =
        body.message ??
        (ok ? 'Usuario eliminado correctamente' : 'No se pudo eliminar el usuario');
      return { success: ok, message };
    } catch (e: any) {
      const status = e?.status ?? 0;
      const message =
        e?.error?.message ||
        (status === 404
          ? 'Usuario no encontrado'
          : 'Error al eliminar usuario');
      throw Object.assign(new Error(message), { status });
    }
  }

  /**
   * 🔐 CAMBIO DE CONTRASEÑA (PROPIO USUARIO)
   * Requiere la contraseña actual por seguridad.
   */
  async cambiarPassword(usuarioId: string, actual: string, nueva: string): Promise<any> {
    const url = `${USUARIOS_API_URL}/cambiar-password/${usuarioId}`;
    const body: ChangePasswordRequest = {
      actualPassword: actual,
      newPassword: nueva
    };

    return await firstValueFrom(
      this.http.put<any>(url, body, { headers: this.authHeaders() })
    );
  }

  /**
   * 🛠️ RESET DE CONTRASEÑA (ADMIN BYPASS)
   * No pide la anterior, ideal para cuando el cliente la olvida.
   */
  async resetPasswordAdmin(usuarioId: string, nuevaClave: string): Promise<any> {
    const url = `${USUARIOS_API_URL}/admin/reset-password/${usuarioId}`;
    
    // Como en el Java usamos Map<String, String>, enviamos el objeto directo
    const body = {
      newPassword: nuevaClave
    };

    return await firstValueFrom(
      this.http.put<any>(url, body, { headers: this.authHeaders() })
    );
  }
}