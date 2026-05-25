import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacturaService, FacturaResponse } from '../../../services/factura.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-facturacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './facturacion.html',
  styleUrl: './facturacion.css'
})
export class FacturacionComponent implements OnInit {
  private facturaSvc = inject(FacturaService);
  private authSvc = inject(AuthService);
  private toast = inject(ToastService);

  loading = false;
  descargando = '';

  private allFacturas: FacturaResponse[] = [];
  facturas: FacturaResponse[] = [];

  filterEstado = '';
  filterDesde = '';
  filterHasta = '';

  facturaDetalle: FacturaResponse | null = null;

  async ngOnInit() {
    this.loading = true;
    try {
      const resp = await this.authSvc.me();
      if (resp?.success && resp.data?.usuarioId) {
        const data = await this.facturaSvc.getByUsuario(resp.data.usuarioId);
        this.allFacturas = (data || []).sort(
          (a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime()
        );
        this.facturas = [...this.allFacturas];
      }
    } catch {
      this.toast.error('Error al cargar tus facturas.');
    } finally {
      this.loading = false;
    }
  }

  filtrar() {
    const estado = this.filterEstado;
    const desde = this.filterDesde ? new Date(this.filterDesde).getTime() : null;
    const hasta = this.filterHasta ? new Date(this.filterHasta + 'T23:59:59').getTime() : null;

    this.facturas = this.allFacturas.filter(f => {
      const matchEstado = !estado || f.estado === estado;
      const t = new Date(f.fechaEmision).getTime();
      const matchDesde = !desde || t >= desde;
      const matchHasta = !hasta || t <= hasta;
      return matchEstado && matchDesde && matchHasta;
    });
  }

  limpiar() {
    this.filterEstado = '';
    this.filterDesde = '';
    this.filterHasta = '';
    this.facturas = [...this.allFacturas];
  }

  toggleDetalle(f: FacturaResponse) {
    this.facturaDetalle = this.facturaDetalle?.facturaId === f.facturaId ? null : f;
  }

  async descargarPDF(f: FacturaResponse) {
    this.descargando = f.facturaId;
    try {
      await this.facturaSvc.descargarPDF(f.facturaId, f.numero);
      this.toast.success(`Factura ${f.numero} descargada.`);
    } catch (e: any) {
      this.toast.error(e?.message ?? 'No se pudo descargar el PDF.');
    } finally {
      this.descargando = '';
    }
  }

  truncNum(num: string): string {
    if (!num) return '—';
    return num.length > 12 ? '...' + num.slice(-10) : num;
  }
}
