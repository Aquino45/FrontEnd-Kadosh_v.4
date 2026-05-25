import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacturaService, FacturaResponse } from '../../../services/factura.service';
import { ToastService } from '../../shared/toast/toast.service';
import { NewFacturaComponent } from './new-factura/new-factura';

@Component({
  selector: 'app-facturacion',
  standalone: true,
  imports: [CommonModule, FormsModule, NewFacturaComponent],
  templateUrl: './facturacion.html',
  styleUrl: './facturacion.css'
})
export class FacturacionComponent implements OnInit {
  private facturaSvc = inject(FacturaService);
  private toast = inject(ToastService);

  showForm = false;
  loading = false;
  loadError = '';

  facturas: FacturaResponse[] = [];
  private allFacturas: FacturaResponse[] = [];

  filterNombre = '';
  filterDni = '';
  filterEstado = '';
  filterDesde = '';
  filterHasta = '';

  // Preview modal
  facturaPreview: FacturaResponse | null = null;

  // Para confirmar anulación
  facturaAAnular: FacturaResponse | null = null;
  anulandoId = '';

  ngOnInit(): void {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      // GET /facturas sólo devuelve activo=true (EMITIDAS).
      // Traemos ANULADAS por separado para mostrar el historial completo.
      const [emitidas, anuladas] = await Promise.all([
        this.facturaSvc.filtrarPorEstado('EMITIDA').catch(() => [] as FacturaResponse[]),
        this.facturaSvc.filtrarPorEstado('ANULADA').catch(() => [] as FacturaResponse[])
      ]);
      const seen = new Set<string>();
      this.allFacturas = [...emitidas, ...anuladas]
        .filter(f => {
          if (seen.has(f.facturaId)) return false;
          seen.add(f.facturaId);
          return true;
        })
        .sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime());
      this.facturas = [...this.allFacturas];
    } catch (e: any) {
      this.loadError = e?.error?.message ?? 'Error al cargar las facturas.';
      this.toast.error(this.loadError);
    } finally {
      this.loading = false;
    }
  }

  onSearch(): void {
    const nombre = this.filterNombre.toLowerCase().trim();
    const dni = this.filterDni.trim();
    const estado = this.filterEstado;

    this.facturas = this.allFacturas.filter(f => {
      const matchNombre = !nombre || f.clienteNombre?.toLowerCase().includes(nombre);
      const matchDni = !dni || f.clienteDni?.includes(dni);
      const matchEstado = !estado || f.estado === estado;

      let matchFecha = true;
      if (this.filterDesde || this.filterHasta) {
        const fechaF = new Date(f.fechaEmision).getTime();
        if (this.filterDesde && fechaF < new Date(this.filterDesde).getTime()) matchFecha = false;
        if (this.filterHasta && fechaF > new Date(this.filterHasta).getTime() + 86400000) matchFecha = false;
      }

      return matchNombre && matchDni && matchEstado && matchFecha;
    });
  }

  onClear(): void {
    this.filterNombre = '';
    this.filterDni = '';
    this.filterEstado = '';
    this.filterDesde = '';
    this.filterHasta = '';
    this.facturas = [...this.allFacturas];
  }

  openForm(): void {
    this.showForm = true;
  }

  onFacturaCreada(factura: FacturaResponse | null): void {
    this.showForm = false;
    if (factura) this.cargar();
  }

  async descargarPDF(factura: FacturaResponse): Promise<void> {
    try {
      await this.facturaSvc.descargarPDF(factura.facturaId, factura.numero);
      this.toast.success('PDF descargado', 'Listo');
    } catch (e: any) {
      this.toast.error(e?.message ?? 'Error al descargar PDF', 'Error');
    }
  }

  openPreview(factura: FacturaResponse): void {
    this.facturaPreview = factura;
  }

  closePreview(): void {
    this.facturaPreview = null;
  }

  confirmarAnular(factura: FacturaResponse): void {
    this.facturaAAnular = factura;
  }

  cancelarAnulacion(): void {
    this.facturaAAnular = null;
  }

  async anularFactura(): Promise<void> {
    if (!this.facturaAAnular) return;
    this.anulandoId = this.facturaAAnular.facturaId;
    try {
      await this.facturaSvc.anular(this.facturaAAnular.facturaId);
      this.toast.success('Factura anulada', 'Éxito');
      this.facturaAAnular = null;
      await this.cargar();
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al anular', 'Error');
    } finally {
      this.anulandoId = '';
    }
  }

  formatFecha(fechaStr: string): string {
    if (!fechaStr) return '—';
    try {
      return new Date(fechaStr).toLocaleDateString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch {
      return fechaStr;
    }
  }
}
