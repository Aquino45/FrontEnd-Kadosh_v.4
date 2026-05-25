import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CotizacionService } from '../../../../services/cotizacion.service';
import { VerCompletoCotizacion } from './ver-completo-cotizacion/ver-completo-cotizacion';

@Component({
  selector: 'app-cotizaciones-usuarios',
  standalone: true,
  imports: [CommonModule, VerCompletoCotizacion],
  templateUrl: './cotizaciones-usuarios.html',
  styleUrl: './cotizaciones-usuarios.css'
})
export class CotizacionesUsuariosComponent implements OnInit {
  @Input() userId!: string;
  @Output() volver = new EventEmitter<void>();

  private cotizacionSvc = inject(CotizacionService);
  
  cotizaciones: any[] = [];
  loading = false;
  verDetalle = false;
  
  // Variable central para el binding con el hijo
  cotizacionSeleccionada: any = null; 

  ngOnInit() {
    if (this.userId) this.cargarData();
  }

  async cargarData() {
    this.loading = true;
    try {
      // Usamos el método definido en tu CotizacionService
      const data = await this.cotizacionSvc.getHistorialByUsuario(this.userId);
      this.cotizaciones = data || [];
    } catch (e) {
      console.error("Error cargando cotizaciones:", e);
    } finally {
      this.loading = false;
    }
  }

  onVerDetalleCompleto(c: any) {
    this.cotizacionSeleccionada = c; // Guardamos el objeto completo
    this.verDetalle = true;
  }

  onCerrarDetalle() {
    this.verDetalle = false;
    this.cotizacionSeleccionada = null;
    this.cargarData(); 
  }
}