import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CotizacionService } from '../../../services/cotizacion.service';
import { AuthService } from '../../../services/auth.service'; // 1. Importación correcta
import { VerCompletoCotizacion } from './ver-completo-cotizacion/ver-completo-cotizacion';

@Component({
  selector: 'app-cotizaciones-usuarios',
  standalone: true,
  imports: [CommonModule, VerCompletoCotizacion],
  templateUrl: './cotizaciones-usuarios.html',
  styleUrl: './cotizaciones-usuarios.css'
})
export class CotizacionesUsuariosComponent implements OnInit {
  @Input() userId?: string; 
  @Output() volver = new EventEmitter<void>();

  private cotizacionSvc = inject(CotizacionService);
  private authSvc = inject(AuthService); // 2. Inyectamos AuthService
  
  cotizaciones: any[] = [];
  loading = false;
  verDetalle = false;
  cotizacionSeleccionada: any = null; 

  async ngOnInit() {
    // 3. Lógica idéntica a tu historial óptico: si no hay userId, llamamos a /me
    if (!this.userId) {
      await this.obtenerUsuarioLogueado();
    } else {
      this.cargarData();
    }
  }

  async obtenerUsuarioLogueado() {
    this.loading = true;
    try {
      // ✅ Usamos authSvc.me() como en tu ejemplo funcional
      const resp = await this.authSvc.me();
      
      // 🛡️ Extraemos usuarioId de la data de respuesta
      if (resp?.success && resp.data?.usuarioId) {
        this.userId = resp.data.usuarioId; 
        this.cargarData();
      } else {
        console.error("No se pudo obtener el ID del usuario logueado en Wimiline");
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
      // ✅ Llamamos al servicio de cotizaciones con el userId obtenido
      const data = await this.cotizacionSvc.getHistorialByUsuario(this.userId);
      this.cotizaciones = data || [];
    } catch (e) {
      console.error("Error cargando tus cotizaciones:", e);
    } finally {
      this.loading = false;
    }
  }

  onVerDetalleCompleto(c: any) {
    this.cotizacionSeleccionada = c;
    this.verDetalle = true;
  }

  onCerrarDetalle() {
    this.verDetalle = false;
    this.cotizacionSeleccionada = null;
    this.cargarData(); 
  }
}