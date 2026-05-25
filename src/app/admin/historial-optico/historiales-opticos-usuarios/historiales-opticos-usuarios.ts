import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistorialOpticoService, HistorialOpticoResponse } from '../../../../services/historial-optico.service';
// ✅ Importa el nuevo componente hijo
import { VerCompletoHistorialOpticoComponent } from './ver-completo-historial-optico/ver-completo-historial-optico';

@Component({
  selector: 'app-historiales-opticos-usuarios',
  standalone: true,
  imports: [CommonModule, VerCompletoHistorialOpticoComponent], // ✅ Agrégalo aquí
  templateUrl: './historiales-opticos-usuarios.html',
  styleUrl: './historiales-opticos-usuarios.css'
})
export class HistorialesOpticosUsuariosComponent implements OnInit {
  @Input() userId!: string;
  @Output() volver = new EventEmitter<void>();

  private historialSvc = inject(HistorialOpticoService);
  
  historiales: HistorialOpticoResponse[] = [];
  loading = false;

  // ✅ Estados para el control del "Hijo"
  verDetalle = false;
  historialSeleccionado: HistorialOpticoResponse | null = null;

  ngOnInit() {
    if (this.userId) this.cargarData();
  }

  async cargarData() {
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

  // ✅ Función para abrir el hijo "ver-completo-historial-optico"
  onVerDetalleCompleto(h: HistorialOpticoResponse) {
    this.historialSeleccionado = h;
    this.verDetalle = true;
  }

  // ✅ Función para cerrar el hijo y volver a las tarjetitas
  onCerrarDetalle() {
    this.verDetalle = false;
    this.historialSeleccionado = null;
    this.cargarData();
  }
}