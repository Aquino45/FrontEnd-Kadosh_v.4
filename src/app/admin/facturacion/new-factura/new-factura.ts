import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService, ClienteListItemDTO } from '../../../../services/usuarios.service';
import { CotizacionService } from '../../../../services/cotizacion.service';
import { FacturaService, FacturaResponse } from '../../../../services/factura.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-new-factura',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-factura.html',
  styleUrls: ['./new-factura.css']
})
export class NewFacturaComponent {
  @Output() close = new EventEmitter<FacturaResponse | null>();

  private usuariosSvc = inject(UsuariosService);
  private cotizacionSvc = inject(CotizacionService);
  private facturaSvc    = inject(FacturaService);
  private toast         = inject(ToastService);

  // Paso 1 — buscar cliente
  buscarDni    = '';
  buscarNombre = '';
  buscandoCliente = false;
  suggestions: ClienteListItemDTO[] = [];
  cliente: ClienteListItemDTO | null = null;

  // Paso 2 — cotizaciones pagadas
  cotizaciones: any[] = [];
  loadingCotizaciones = false;
  cotizacionSel: any | null = null;

  // Detalle para preview
  loadingDetalle = false;
  cotizacionDetalle: any | null = null;

  // Paso 3 — emitir
  emitiendo = false;

  async buscarCliente(): Promise<void> {
    const dni    = this.buscarDni.trim();
    const nombre = this.buscarNombre.trim();
    if (!dni && !nombre) return;
    this.buscandoCliente = true;
    this.suggestions = [];
    this.cliente = null;
    this.cotizaciones = [];
    this.cotizacionSel = null;
    this.cotizacionDetalle = null;
    try {
      const res = await this.usuariosSvc.searchClientes({ dni, nombre });
      if (res.length === 0) {
        this.toast.warning('No se encontró ningún cliente', 'Sin resultados');
      } else if (res.length === 1) {
        await this.seleccionarCliente(res[0]);
      } else {
        this.suggestions = res;
      }
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al buscar cliente', 'Error');
    } finally {
      this.buscandoCliente = false;
    }
  }

  async seleccionarCliente(u: ClienteListItemDTO): Promise<void> {
    this.cliente = u;
    this.suggestions = [];
    this.cotizacionSel = null;
    this.cotizacionDetalle = null;
    await this.cargarCotizaciones(u.id);
  }

  limpiarBusqueda(): void {
    this.buscarDni    = '';
    this.buscarNombre = '';
    this.suggestions  = [];
    this.cliente      = null;
    this.cotizaciones = [];
    this.cotizacionSel = null;
    this.cotizacionDetalle = null;
  }

  private async cargarCotizaciones(usuarioId: string): Promise<void> {
    this.loadingCotizaciones = true;
    try {
      const todas = await this.cotizacionSvc.getHistorialByUsuario(usuarioId);
      this.cotizaciones = (todas ?? []).filter(
        (c: any) => c.estadoPago === true || c.estadoPago === 'PAGADO' || c.estadoPago === 'true'
      );
      if (this.cotizaciones.length === 0) {
        this.toast.info('Este cliente no tiene cotizaciones pagadas pendientes de facturar', 'Sin datos');
      }
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al cargar cotizaciones', 'Error');
    } finally {
      this.loadingCotizaciones = false;
    }
  }

  seleccionarCotizacion(cot: any): void {
    if (this.cotizacionSel?.cotizacionId === cot.cotizacionId) {
      this.cotizacionSel = null;
      this.cotizacionDetalle = null;
      return;
    }
    this.cotizacionSel = cot;
    this.cotizacionDetalle = null;
    this.cargarDetalle(cot.cotizacionId);
  }

  private async cargarDetalle(id: string): Promise<void> {
    if (!id) return;
    this.loadingDetalle = true;
    try {
      this.cotizacionDetalle = await this.cotizacionSvc.getDetalleById(id);
    } catch {
      // preview no se muestra
    } finally {
      this.loadingDetalle = false;
    }
  }

  async emitirFactura(): Promise<void> {
    if (!this.cotizacionSel) return;
    this.emitiendo = true;
    try {
      const factura = await this.facturaSvc.emitir(this.cotizacionSel.cotizacionId);
      this.toast.success(`Factura ${factura.numero} emitida correctamente`, 'Éxito');
      this.close.emit(factura);
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al emitir la factura', 'Error');
    } finally {
      this.emitiendo = false;
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.buscarCliente();
  }

  cancelar(): void {
    this.close.emit(null);
  }

  formatFecha(f: string): string {
    if (!f) return '—';
    if (f.includes('/')) return f.split(' ')[0];
    try {
      return new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return f; }
  }

  truncId(id: string): string {
    if (!id) return '—';
    return id.length > 12 ? id.slice(0, 8).toUpperCase() : id.toUpperCase();
  }

  get prevSubtotal(): number { return this.cotizacionDetalle?.total ?? 0; }
  get prevIgv(): number { return Math.round(this.prevSubtotal * 18) / 100; }
  get prevTotal(): number { return this.prevSubtotal + this.prevIgv; }
}
