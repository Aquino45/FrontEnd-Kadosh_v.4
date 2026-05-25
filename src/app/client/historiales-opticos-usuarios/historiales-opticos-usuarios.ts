import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistorialOpticoService, HistorialOpticoResponse } from '../../../services/historial-optico.service';
import { AuthService } from '../../../services/auth.service'; // 1. Importa tu servicio de Auth
import { VerCompletoHistorialOpticoComponent } from './ver-completo-historial-optico/ver-completo-historial-optico';

@Component({
  selector: 'app-historiales-opticos-usuarios',
  standalone: true,
  imports: [CommonModule, VerCompletoHistorialOpticoComponent],
  templateUrl: './historiales-opticos-usuarios.html',
  styleUrl: './historiales-opticos-usuarios.css'
})
export class HistorialesOpticosUsuariosComponent implements OnInit {
  // Mantenemos el Input por si el Admin lo usa, pero no será obligatorio para el Cliente
  @Input() userId?: string; 
  @Output() volver = new EventEmitter<void>();

  private historialSvc = inject(HistorialOpticoService);
  private authSvc = inject(AuthService); // 2. Inyecta el AuthService
  
  historiales: HistorialOpticoResponse[] = [];
  loading = false;
  verDetalle = false;
  historialSeleccionado: HistorialOpticoResponse | null = null;

  async ngOnInit() {
    // 3. Lógica inteligente: Si no viene un ID por Input, lo buscamos en la sesión
    if (!this.userId) {
      await this.obtenerUsuarioLogueado();
    } else {
      this.cargarData();
    }
  }

  async obtenerUsuarioLogueado() {
  this.loading = true;
  try {
    const resp = await this.authSvc.me();
    // 🛡️ Cambiamos .id por .usuarioId según muestra tu error de TS
    if (resp?.success && resp.data?.usuarioId) {
      this.userId = resp.data.usuarioId; 
      this.cargarData();
    } else {
      console.error("No se pudo obtener el ID del usuario logueado");
    }
  } catch (e) {
    console.error("Error en /me:", e);
  } finally {
    this.loading = false;
  }
}

  async cargarData() {
    if (!this.userId) return;
    
    this.loading = true;
    try {
      const data = await this.historialSvc.getHistorialesByUsuario(this.userId);
      
      this.historiales = data.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; 
      });
    } catch (e) {
      console.error("Error cargando historiales:", e);
    } finally {
      this.loading = false;
    }
  }

  onVerDetalleCompleto(h: HistorialOpticoResponse) {
    this.historialSeleccionado = h;
    this.verDetalle = true;
  }

  onCerrarDetalle() {
    this.verDetalle = false;
    this.historialSeleccionado = null;
    this.cargarData();
  }
}