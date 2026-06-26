import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ReportesService,
  ReporteFiltroDTO,
  ReporteVentasDTO,
  ReporteCotizacionDTO,
  ReporteHistorialOpticoDTO,
  ReporteProductoVendidoDTO,
  ReporteResumenGeneralDTO,
  TipoReporteDTO,
  TipoReporteRequest
} from '../../../services/reportes.service';
import { CategoriaService, CategoriaDTO, SubCategoriaDTO } from '../../../services/categoria.service';
import { ToastService } from '../../shared/toast/toast.service';

type Tab = 'resumen' | 'ventas' | 'cotizaciones' | 'historial' | 'productos' | 'tipos';
type Formato = 'pdf' | 'excel';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css']
})
export class ReportesComponent implements OnInit {
  activeTab: Tab = 'resumen';

  // ── Filtro global de fechas (compartido entre todos los tabs) ──────
  globalDesde = '';
  globalHasta = '';

  // ── Modal de filtro de fechas ─────────────────────────────────────
  showDateModal = false;

  // ── Estado del panel de filtros específicos (colapsable en móvil) ──
  filtersOpen = false;

  // ── Resumen general ───────────────────────────────────────────────
  resumen = {
    loading: false,
    data: null as ReporteResumenGeneralDTO | null
  };

  // ── Ventas ────────────────────────────────────────────────────────
  ventas = {
    loading: false,
    estado: '',
    rows: [] as ReporteVentasDTO[],
    exportando: null as Formato | null
  };

  // ── Cotizaciones ──────────────────────────────────────────────────
  cotizaciones = {
    loading: false,
    estadoPago: '',
    rows: [] as ReporteCotizacionDTO[],
    exportando: null as Formato | null
  };

  // ── Historial óptico ──────────────────────────────────────────────
  historial = {
    loading: false,
    rows: [] as ReporteHistorialOpticoDTO[],
    exportando: null as Formato | null
  };

  // ── Productos vendidos ────────────────────────────────────────────
  productos = {
    loading: false,
    categoriaId: '',
    subCategoriaId: '',
    rows: [] as ReporteProductoVendidoDTO[],
    exportando: null as Formato | null
  };
  categorias: CategoriaDTO[] = [];
  subcategorias: SubCategoriaDTO[] = [];

  // ── Tipos de reporte ──────────────────────────────────────────────
  tipos = { loading: false, rows: [] as TipoReporteDTO[] };
  showTipoModal = false;
  isEditTipo = false;
  editingTipoId: string | null = null;
  tipoForm: TipoReporteRequest = { codigo: '', nombre: '', descripcion: '', permitePdf: true, permiteExcel: true, activo: true };
  tipoSaving = false;
  showDeleteTipoModal = false;
  deletingTipo: TipoReporteDTO | null = null;
  deleteTipoLoading = false;

  constructor(
    private reportesSvc: ReportesService,
    private categoriaSvc: CategoriaService,
    private toast: ToastService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadResumen();
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    this.filtersOpen = false;
    if (tab === 'resumen')      this.loadResumen();
    if (tab === 'ventas')       this.loadVentas();
    if (tab === 'cotizaciones') this.loadCotizaciones();
    if (tab === 'historial')    this.loadHistorial();
    if (tab === 'productos')    this.loadProductos();
    if (tab === 'tipos')        this.loadTipos();
  }

  openDateModal(): void  { this.showDateModal = true; }
  closeDateModal(): void { this.showDateModal = false; }

  applyDateFilter(): void {
    this.closeDateModal();
    this.setTab(this.activeTab);
  }

  clearDateFilter(): void {
    this.globalDesde = '';
    this.globalHasta = '';
    this.closeDateModal();
    this.setTab(this.activeTab);
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  private get fechaFiltro(): Pick<ReporteFiltroDTO, 'fechaInicio' | 'fechaFin'> {
    return {
      fechaInicio: this.globalDesde || null,
      fechaFin:    this.globalHasta || null
    };
  }

  private descargarBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Resumen general ───────────────────────────────────────────────

  async loadResumen(): Promise<void> {
    this.resumen.loading = true;
    try {
      this.resumen.data = await this.reportesSvc.resumenGeneral({ ...this.fechaFiltro });
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al cargar el resumen general');
    } finally {
      this.resumen.loading = false;
    }
  }

  // ── Ventas ────────────────────────────────────────────────────────

  async loadVentas(): Promise<void> {
    this.ventas.loading = true;
    try {
      this.ventas.rows = await this.reportesSvc.reporteVentas({
        ...this.fechaFiltro,
        estado: this.ventas.estado || null
      });
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al cargar el reporte de ventas');
    } finally {
      this.ventas.loading = false;
    }
  }

  limpiarVentas(): void {
    this.ventas.estado = '';
    this.loadVentas();
  }

  async exportarVentas(formato: Formato): Promise<void> {
    this.ventas.exportando = formato;
    try {
      const filtro: ReporteFiltroDTO = { ...this.fechaFiltro, estado: this.ventas.estado || null };
      const blob = formato === 'pdf'
        ? await this.reportesSvc.exportarVentasPdf(filtro)
        : await this.reportesSvc.exportarVentasExcel(filtro);
      this.descargarBlob(blob, `reporte_ventas.${formato === 'pdf' ? 'pdf' : 'xlsx'}`);
      this.toast.success('Reporte descargado');
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al exportar el reporte');
    } finally {
      this.ventas.exportando = null;
    }
  }

  // ── Cotizaciones ──────────────────────────────────────────────────

  async loadCotizaciones(): Promise<void> {
    this.cotizaciones.loading = true;
    try {
      this.cotizaciones.rows = await this.reportesSvc.reporteCotizaciones({
        ...this.fechaFiltro,
        estadoPago: this.cotizaciones.estadoPago === '' ? null : this.cotizaciones.estadoPago === 'true'
      });
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al cargar el reporte de cotizaciones');
    } finally {
      this.cotizaciones.loading = false;
    }
  }

  limpiarCotizaciones(): void {
    this.cotizaciones.estadoPago = '';
    this.loadCotizaciones();
  }

  async exportarCotizaciones(formato: Formato): Promise<void> {
    this.cotizaciones.exportando = formato;
    try {
      const filtro: ReporteFiltroDTO = {
        ...this.fechaFiltro,
        estadoPago: this.cotizaciones.estadoPago === '' ? null : this.cotizaciones.estadoPago === 'true'
      };
      const blob = formato === 'pdf'
        ? await this.reportesSvc.exportarCotizacionesPdf(filtro)
        : await this.reportesSvc.exportarCotizacionesExcel(filtro);
      this.descargarBlob(blob, `reporte_cotizaciones.${formato === 'pdf' ? 'pdf' : 'xlsx'}`);
      this.toast.success('Reporte descargado');
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al exportar el reporte');
    } finally {
      this.cotizaciones.exportando = null;
    }
  }

  // ── Historial óptico ──────────────────────────────────────────────

  async loadHistorial(): Promise<void> {
    this.historial.loading = true;
    try {
      this.historial.rows = await this.reportesSvc.reporteHistorialOptico({ ...this.fechaFiltro });
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al cargar el reporte de historial óptico');
    } finally {
      this.historial.loading = false;
    }
  }

  async exportarHistorial(formato: Formato): Promise<void> {
    this.historial.exportando = formato;
    try {
      const blob = formato === 'pdf'
        ? await this.reportesSvc.exportarHistorialOpticoPdf({ ...this.fechaFiltro })
        : await this.reportesSvc.exportarHistorialOpticoExcel({ ...this.fechaFiltro });
      this.descargarBlob(blob, `reporte_historial_optico.${formato === 'pdf' ? 'pdf' : 'xlsx'}`);
      this.toast.success('Reporte descargado');
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al exportar el reporte');
    } finally {
      this.historial.exportando = null;
    }
  }

  // ── Productos vendidos ────────────────────────────────────────────

  async loadCategorias(): Promise<void> {
    try { this.categorias = await this.categoriaSvc.listActivas(); } catch (_) {}
  }

  async onCategoriaChange(): Promise<void> {
    this.productos.subCategoriaId = '';
    this.subcategorias = [];
    if (!this.productos.categoriaId) return;
    try {
      this.subcategorias = await this.categoriaSvc.listSubcategoriasByCategoria(this.productos.categoriaId);
    } catch (_) {}
  }

  async loadProductos(): Promise<void> {
    this.productos.loading = true;
    try {
      if (this.categorias.length === 0) await this.loadCategorias();
      this.productos.rows = await this.reportesSvc.reporteProductosVendidos({
        ...this.fechaFiltro,
        categoriaId:    this.productos.categoriaId    || null,
        subCategoriaId: this.productos.subCategoriaId || null
      });
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al cargar el reporte de productos vendidos');
    } finally {
      this.productos.loading = false;
    }
  }

  limpiarProductos(): void {
    this.productos.categoriaId = '';
    this.productos.subCategoriaId = '';
    this.subcategorias = [];
    this.loadProductos();
  }

  async exportarProductos(formato: Formato): Promise<void> {
    this.productos.exportando = formato;
    try {
      const filtro: ReporteFiltroDTO = {
        ...this.fechaFiltro,
        categoriaId:    this.productos.categoriaId    || null,
        subCategoriaId: this.productos.subCategoriaId || null
      };
      const blob = formato === 'pdf'
        ? await this.reportesSvc.exportarProductosVendidosPdf(filtro)
        : await this.reportesSvc.exportarProductosVendidosExcel(filtro);
      this.descargarBlob(blob, `reporte_productos_vendidos.${formato === 'pdf' ? 'pdf' : 'xlsx'}`);
      this.toast.success('Reporte descargado');
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al exportar el reporte');
    } finally {
      this.productos.exportando = null;
    }
  }

  // ── Tipos de reporte ──────────────────────────────────────────────

  async loadTipos(): Promise<void> {
    this.tipos.loading = true;
    try {
      this.tipos.rows = await this.reportesSvc.listarTiposReporte();
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al cargar los tipos de reporte');
    } finally {
      this.tipos.loading = false;
    }
  }

  openCreateTipo(): void {
    this.isEditTipo = false;
    this.editingTipoId = null;
    this.tipoForm = { codigo: '', nombre: '', descripcion: '', permitePdf: true, permiteExcel: true, activo: true };
    this.showTipoModal = true;
  }

  openEditTipo(tipo: TipoReporteDTO): void {
    this.isEditTipo = true;
    this.editingTipoId = tipo.tipoReporteId;
    this.tipoForm = {
      codigo: tipo.codigo, nombre: tipo.nombre, descripcion: tipo.descripcion ?? '',
      permitePdf: tipo.permitePdf, permiteExcel: tipo.permiteExcel, activo: tipo.activo
    };
    this.showTipoModal = true;
  }

  closeTipoModal(): void { this.showTipoModal = false; }

  async saveTipo(): Promise<void> {
    if (!this.tipoForm.codigo.trim() || !this.tipoForm.nombre.trim()) {
      this.toast.warning('El código y el nombre son obligatorios');
      return;
    }
    this.tipoSaving = true;
    try {
      if (this.isEditTipo && this.editingTipoId) {
        await this.reportesSvc.actualizarTipoReporte(this.editingTipoId, this.tipoForm);
        this.toast.success('Tipo de reporte actualizado correctamente');
      } else {
        await this.reportesSvc.crearTipoReporte(this.tipoForm);
        this.toast.success('Tipo de reporte creado correctamente');
      }
      this.closeTipoModal();
      await this.loadTipos();
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al guardar el tipo de reporte');
    } finally {
      this.tipoSaving = false;
    }
  }

  async desactivarTipo(tipo: TipoReporteDTO): Promise<void> {
    try {
      await this.reportesSvc.desactivarTipoReporte(tipo.tipoReporteId);
      this.toast.success('Tipo de reporte desactivado');
      await this.loadTipos();
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al desactivar el tipo de reporte');
    }
  }

  openDeleteTipoConfirm(tipo: TipoReporteDTO): void {
    this.deletingTipo = tipo;
    this.showDeleteTipoModal = true;
  }

  closeDeleteTipoModal(): void {
    this.showDeleteTipoModal = false;
    this.deletingTipo = null;
  }

  async confirmDeleteTipo(): Promise<void> {
    if (!this.deletingTipo) return;
    this.deleteTipoLoading = true;
    try {
      await this.reportesSvc.eliminarTipoReporte(this.deletingTipo.tipoReporteId);
      this.toast.success('Tipo de reporte eliminado');
      this.closeDeleteTipoModal();
      await this.loadTipos();
    } catch (e: any) {
      this.toast.error(e?.error?.message ?? 'Error al eliminar el tipo de reporte');
    } finally {
      this.deleteTipoLoading = false;
    }
  }

  formatFecha(fecha: string | null | undefined, conHora = false): string {
    if (!fecha) return '—';
    try {
      const d = new Date(fecha);
      return conHora
        ? d.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return fecha; }
  }
}
