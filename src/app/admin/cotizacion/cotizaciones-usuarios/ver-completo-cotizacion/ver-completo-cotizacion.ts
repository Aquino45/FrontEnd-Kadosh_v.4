import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CotizacionService } from '../../../../../services/cotizacion.service';
import { ToastService } from '../../../../shared/toast/toast.service';

@Component({
  selector: 'app-ver-completo-cotizacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ver-completo-cotizacion.html',
  styleUrl: './ver-completo-cotizacion.css'
})
export class VerCompletoCotizacion implements OnInit {
  // 🔥 Recibe el ID desde el componente padre
  @Input() cotizacionId!: string; 
  
  @Output() close = new EventEmitter<void>();

  private cotizacionSvc = inject(CotizacionService);
  private toast = inject(ToastService);

  // Estado del detalle de la cotización cargado desde el Java
  detalle: any = null;
  loading = false;

  async ngOnInit() {
    if (this.cotizacionId) {
      await this.cargarDetalle();
    } else {
      this.toast.error('No se recibió un ID de cotización válido.');
    }
  }

  /**
   * Determina quién es el responsable financiero/legal de la cotización
   * Lógica: Si es menor de 18 y existe apoderado en la BD, muestra al apoderado.
   * De lo contrario, muestra al cliente principal.
   */
  get responsableFinanciero(): string {
    if (!this.detalle) return 'Cargando...';

    const edad = this.detalle.edadAlMomento;
    const apoderado = this.detalle.apoderado; // Viene de la entidad Apoderado en Java

    if (edad < 18 && apoderado) {
      return apoderado;
    }
    
    return this.detalle.cliente;
  }

  /**
   * Obtiene el desglose completo de productos y datos del cliente
   */
  async cargarDetalle() {
    this.loading = true;
    try {
      // Pega al endpoint @GetMapping("/{id}") del CotizacionController
      this.detalle = await this.cotizacionSvc.getDetalleById(this.cotizacionId);
    } catch (e) {
      this.toast.error('Error al obtener el desglose de la cotización.');
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Cambia el estado en la base de datos a PAGADO
   */
  async registrarPago() {
    if (!this.cotizacionId) return;
    
    try {
      this.loading = true;
      // Pega al endpoint @PutMapping("/pagar/{id}")
      await this.cotizacionSvc.registrarPago(this.idParaServicio());
      this.toast.success('Pago registrado con éxito.');
      
      // Recargamos para actualizar el estado visualmente en el detalle
      await this.cargarDetalle(); 
    } catch (e) {
      this.toast.error('No se pudo procesar el pago.');
    } finally {
      this.loading = false;
    }
  }

  private idParaServicio(): string {
    return this.detalle?.cotizacionId || this.cotizacionId;
  }

  cerrar() {
    this.close.emit();
  }
}