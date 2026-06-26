import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import {
  ReportesService,
  ReporteFiltroDTO,
  ReporteResumenGeneralDTO,
  ReporteProductoVendidoDTO,
  ReporteServicioVendidoDTO,
  ReporteVentasDTO,
  ReporteCotizacionDTO,
  ReporteHistorialOpticoDTO
} from '../../../services/reportes.service';

export type TopItem = {
  nombre: string;
  categoria: string;
  cantidadVendida: number;
  totalVendido: number;
  tipo: 'producto' | 'servicio';
};

type ChartBar = {
  label: string;
  value: number;
  text: string;
  percent: number;
};

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})
export class InicioComponent implements OnInit {
  user = { name: 'Cargando...', rol: '' };

  loading = true;
  descargando = false;

  filtroForm: { fechaInicio: string | null; fechaFin: string | null } = { fechaInicio: null, fechaFin: null };
  filtroAplicado: { fechaInicio: string | null; fechaFin: string | null } = { fechaInicio: null, fechaFin: null };

  resumen: ReporteResumenGeneralDTO | null = null;
  topItems: TopItem[] = [];
  totalProductos = 0;
  totalServicios = 0;

  ventas: ReporteVentasDTO[] = [];
  cotizaciones: ReporteCotizacionDTO[] = [];
  historiales: ReporteHistorialOpticoDTO[] = [];
  ventasChart: ChartBar[] = [];

  constructor(
    private authService: AuthService,
    private reportesSvc: ReportesService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const meResp = await this.authService.me().catch(() => null);
      if (meResp?.success && meResp.data) {
        const d = meResp.data;
        this.user = {
          name: `${d.nombre ?? ''} ${d.apellido ?? ''}`.trim() || 'Administrador',
          rol: d.rol ?? 'Admin'
        };
      }
    } catch (_) {
      this.user.name = 'Administrador';
    }
    await this.cargarDashboard();
  }

  aplicarFiltros(): void {
    this.filtroAplicado = { ...this.filtroForm };
    this.cargarDashboard();
  }

  limpiarFiltros(): void {
    this.filtroForm = { fechaInicio: null, fechaFin: null };
    this.filtroAplicado = { fechaInicio: null, fechaFin: null };
    this.cargarDashboard();
  }

  async cargarDashboard(): Promise<void> {
    this.loading = true;
    const filtro: ReporteFiltroDTO = {
      fechaInicio: this.filtroAplicado.fechaInicio || null,
      fechaFin:    this.filtroAplicado.fechaFin    || null
    };

    try {
      const [resumenResp, ventasResp, cotizacionesResp, historialesResp, productosResp, serviciosResp] = await Promise.all([
        this.reportesSvc.resumenGeneral(filtro).catch(() => null),
        this.reportesSvc.reporteVentas(filtro).catch(() => [] as ReporteVentasDTO[]),
        this.reportesSvc.reporteCotizaciones(filtro).catch(() => [] as ReporteCotizacionDTO[]),
        this.reportesSvc.reporteHistorialOptico(filtro).catch(() => [] as ReporteHistorialOpticoDTO[]),
        this.reportesSvc.reporteProductosVendidos(filtro).catch(() => [] as ReporteProductoVendidoDTO[]),
        this.reportesSvc.reporteServiciosVendidos(filtro).catch(() => [] as ReporteServicioVendidoDTO[])
      ]);

      this.resumen      = resumenResp;
      this.ventas       = ventasResp       as ReporteVentasDTO[];
      this.cotizaciones = cotizacionesResp as ReporteCotizacionDTO[];
      this.historiales  = historialesResp  as ReporteHistorialOpticoDTO[];

      const productos = (productosResp as ReporteProductoVendidoDTO[]).map(p => ({
        nombre: p.productoNombre,
        categoria: p.categoriaNombre,
        cantidadVendida: p.cantidadVendida,
        totalVendido: p.totalVendido,
        tipo: 'producto' as const
      }));

      const servicios = (serviciosResp as ReporteServicioVendidoDTO[]).map(s => ({
        nombre: s.descripcion,
        categoria: 'Servicio adicional',
        cantidadVendida: s.cantidadVendida,
        totalVendido: s.totalVendido,
        tipo: 'servicio' as const
      }));

      this.totalProductos = productos.length;
      this.totalServicios = servicios.length;
      this.topItems = [...productos, ...servicios]
        .sort((a, b) => b.totalVendido - a.totalVendido)
        .slice(0, 5);

      const ventasRaw = this.ventas.slice(0, 6).map(row => ({
        label: row.clienteNombre || row.numeroFactura || 'Venta',
        value: Number(row.total || 0),
        text: this.money(row.total || 0)
      }));
      this.ventasChart = this.normalizarBarras(ventasRaw);

    } catch (_) {
    } finally {
      this.loading = false;
    }
  }

  private normalizarBarras(raw: { label: string; value: number; text: string }[]): ChartBar[] {
    const max = Math.max(...raw.map(x => x.value), 1);
    return raw.map(item => ({
      ...item,
      percent: Math.max(7, Math.round((item.value / max) * 100))
    }));
  }

  async exportarVentasExcel(): Promise<void> {
    this.descargando = true;
    try {
      const blob = await this.reportesSvc.exportarVentasExcel({
        fechaInicio: this.filtroAplicado.fechaInicio || null,
        fechaFin:    this.filtroAplicado.fechaFin    || null
      });
      this.guardarArchivo(blob, 'reporte_ventas.xlsx');
    } catch (_) {
    } finally {
      this.descargando = false;
    }
  }

  async exportarProductosExcel(): Promise<void> {
    this.descargando = true;
    try {
      const blob = await this.reportesSvc.exportarProductosVendidosExcel({
        fechaInicio: this.filtroAplicado.fechaInicio || null,
        fechaFin:    this.filtroAplicado.fechaFin    || null
      });
      this.guardarArchivo(blob, 'reporte_productos_vendidos.xlsx');
    } catch (_) {
    } finally {
      this.descargando = false;
    }
  }

  private guardarArchivo(blob: Blob, nombre: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  get greetingTime(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  get today(): string {
    return new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  get paidPct(): number {
    if (!this.resumen?.totalCotizaciones) return 0;
    return Math.round((this.resumen.totalCotizacionesPagadas / this.resumen.totalCotizaciones) * 100);
  }

  get donutPaidDash(): string {
    const p = this.paidPct;
    return `${p} ${100 - p}`;
  }

  get maxTotalVendido(): number {
    return this.topItems[0]?.totalVendido || 1;
  }

  barPct(total: number): number {
    return Math.max(4, Math.round((total / this.maxTotalVendido) * 100));
  }

  get filtroActivo(): boolean {
    return !!(this.filtroAplicado.fechaInicio || this.filtroAplicado.fechaFin);
  }

  money(valor: number | undefined): string {
    return `S/ ${Number(valor || 0).toFixed(2)}`;
  }

  fecha(valor: any): string {
    if (!valor) return '—';
    let d: Date;
    if (Array.isArray(valor)) {
      const [year, month, day, hour = 0, minute = 0] = valor;
      d = new Date(year, month - 1, day, hour, minute);
    } else {
      d = new Date(valor);
    }
    if (isNaN(d.getTime())) return String(valor);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
