import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuariosService } from '../../../../services/usuarios.service';

// ✅ CORRECCIÓN 1: Permitimos 'null' explícitamente en los tipos
export type InfoClient = {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
  email?: string | null;
  telefono?: string | null;
  dni?: string | null;

  rol?: string | null;
  estado?: string | null; // 🚨 AGREGADO: Aquí guardaremos "ACTIVO", "LOBANANEE", etc.

  edad?: number | null;
  fechaNacimiento?: string | null;
  created_at?: Date | null;
  foto?: string | null;

  // Datos del Apoderado
  nombreApoderado?: string | null;
  apellidoApoderado?: string | null;
  dniApoderado?: string | null;
  telefonoApoderado?: string | null;
  parentesco?: string | null;
};

@Component({
  standalone: true,
  selector: 'app-modal-info',
  imports: [CommonModule],
  templateUrl: './modal-info.html',
  styleUrls: ['./modal-info.css']
})
export class ModalInfoComponent implements OnChanges {
  @Input() open = false;
  @Input() client: InfoClient | null = null;
  @Output() close = new EventEmitter<void>();

  private usuariosSvc = inject(UsuariosService);

  fotoUrl: string = '/assets/Images/default_user_profile.png';
  loading = false;

  async ngOnChanges(changes: SimpleChanges): Promise<void> {

    if (this.open && this.client?.id) {
      this.loading = true;
      try {

        const res = await this.usuariosSvc.getById(this.client.id);
        const found = res.data;

        if (found) {
          // ✅ CORRECCIÓN 2: Mapeo seguro para evitar errores de tipo
          this.client = {
            id: found.usuarioId,
            nombre: found.nombre || null,
            apellido: found.apellido || null,
            email: found.correo || null,
            telefono: found.telefono || null,
            dni: found.dni || null,

            rol: found.rol || 'Cliente',
            // En modal-info.ts, dentro de ngOnChanges:

            estado: found.estado || null, // 🚨 CORREGIDO: Si es null, se queda null. Nada de defaults.

            edad: found.edad || null,
            fechaNacimiento: found.fechaNacimiento || null,
            created_at: this.parseDate(found.fechaPrimerHistorial),

            foto: found.imagenUrl || null,

            // Apoderado...
            nombreApoderado: found.nombreApoderado || null,
            apellidoApoderado: found.apellidoApoderado || null,
            dniApoderado: found.dniApoderado || null,
            telefonoApoderado: found.telefonoApoderado || null,
            parentesco: found.parentesco || null
          };

          // ✅ CORRECCIÓN 3: Validamos que 'this.client' exista antes de usarlo
          if (this.client && !this.client.edad && this.client.fechaNacimiento) {
            const birth = new Date(this.client.fechaNacimiento);
            if (!isNaN(birth.getTime())) {
              const diff = Date.now() - birth.getTime();
              this.client.edad = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
            }
          }
        }

        const src = (this.client?.foto ?? '').trim();
        this.fotoUrl = src !== '' ? src : '/assets/Images/default_user_profile.png';

        if (this.client) {
          this.client.foto = this.fotoUrl;
        }

      } catch (e) {
        console.error('Error cargando detalles del cliente:', e);
      } finally {
        this.loading = false;
      }
    }
  }

  // ✅ Función para el HTML
  tieneApoderado(c: InfoClient | null): boolean {
    if (!c) return false;
    return !!c.nombreApoderado && c.nombreApoderado !== 'Ninguno' && c.nombreApoderado.trim() !== '';
  }

  private parseDate(raw: any): Date | undefined {
    if (!raw) return undefined;
    if (Array.isArray(raw) && raw.length >= 3) {
      const [y, m, d, H, M, S, nanos] = raw;
      const ms = typeof nanos === 'number' ? Math.round(nanos / 1e6) : 0;
      return new Date(y, (m ?? 1) - 1, d ?? 1, H ?? 0, M ?? 0, S ?? 0, ms);
    }
    if (typeof raw === 'string') {
      return new Date(raw);
    }
    return undefined;
  }

  onClose() {
    this.close.emit();
  }
}