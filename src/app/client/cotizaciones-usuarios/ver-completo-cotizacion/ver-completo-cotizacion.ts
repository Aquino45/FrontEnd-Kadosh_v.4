import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CotizacionService } from '../../../../services/cotizacion.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-ver-completo-cotizacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ver-completo-cotizacion.html',
  styleUrl: './ver-completo-cotizacion.css'
})
export class VerCompletoCotizacion implements OnInit {
  @Input() cotizacionId!: string; 
  @Output() close = new EventEmitter<void>();

  private cotizacionSvc = inject(CotizacionService);
  private toast = inject(ToastService);

  detalle: any = null;
  loading = false;

  async ngOnInit() {
    if (this.cotizacionId) {
      await this.cargarDetalle();
    } else {
      this.toast.error('No se recibió un ID válido.');
    }
  }

  /**
   * Solo lectura: Muestra quién es el responsable del pago
   */
  get responsableFinanciero(): string {
    if (!this.detalle) return 'Cargando...';
    const edad = this.detalle.edadAlMomento;
    const apoderado = this.detalle.apoderado; 

    if (edad < 18 && apoderado) {
      return apoderado;
    }
    return this.detalle.cliente;
  }

  /**
   * Obtiene la data del backend
   */
  async cargarDetalle() {
    this.loading = true;
    try {
      this.detalle = await this.cotizacionSvc.getDetalleById(this.cotizacionId);
    } catch (e) {
      this.toast.error('Error al obtener el desglose.');
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  // 🔥 Se eliminó el método registrarPago por seguridad

  cerrar() {
    this.detalle = null;
    this.close.emit();
  }
}