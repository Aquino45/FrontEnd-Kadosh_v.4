import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ProductoService,
  ProductoDTO,
  ProductoCreateRequest,
  AjusteStockRequest,
  MovimientoStockDTO,
  TipoMovimientoStock
} from '../../../services/producto.service';
import { CategoriaService, CategoriaDTO, SubCategoriaDTO } from '../../../services/categoria.service';
import { ToastService } from '../../shared/toast/toast.service';

const DEFAULT_STOCK_MINIMO = 5;

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css']
})
export class ProductosComponent implements OnInit {
  // ── Listado ───────────────────────────────────────────────
  productos: ProductoDTO[] = [];
  loading = false;
  searchNombre = '';
  filterCategoriaId = '';
  filterActivo = '';
  categorias: CategoriaDTO[] = [];
  private searchTimer: any;

  // ── Alerta de stock bajo ──────────────────────────────────
  stockBajo: ProductoDTO[] = [];
  showStockAlert = true;

  // ── Modal Crear/Editar producto ───────────────────────────
  showProductModal = false;
  isEditMode = false;
  editingProductId: string | number | null = null;
  productForm = {
    nombre: '',
    precioActual: 0,
    stock: 0,
    stockMinimo: DEFAULT_STOCK_MINIMO,
    categoriaId: '',
    subCategoriaId: '',
    activo: true
  };
  subcategoriasForm: SubCategoriaDTO[] = [];
  productSaving = false;

  // ── Modal Ajustar stock ───────────────────────────────────
  showStockModal = false;
  stockTargetProduct: ProductoDTO | null = null;
  stockForm: { tipo: TipoMovimientoStock; cantidad: number; motivo: string } = {
    tipo: 'ENTRADA',
    cantidad: 1,
    motivo: ''
  };
  stockSaving = false;

  // ── Modal Historial ───────────────────────────────────────
  showHistorialModal = false;
  historialTargetProduct: ProductoDTO | null = null;
  historialList: MovimientoStockDTO[] = [];
  historialLoading = false;

  // ── Modal Eliminar ────────────────────────────────────────
  showDeleteModal = false;
  deletingProduct: ProductoDTO | null = null;
  deleteLoading = false;

  constructor(
    private productoSvc: ProductoService,
    private categoriaSvc: CategoriaService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await Promise.all([this.loadCategorias(), this.loadProductos(), this.loadStockBajo()]);
  }

  isLowStock(p: ProductoDTO): boolean {
    return p.stock <= (p.stockMinimo ?? DEFAULT_STOCK_MINIMO);
  }

  // ── Listado / filtros ─────────────────────────────────────

  async loadCategorias() {
    try {
      this.categorias = await this.categoriaSvc.listActivas();
    } catch (_) {}
  }

  async loadStockBajo() {
    try {
      this.stockBajo = await this.productoSvc.getStockBajo(DEFAULT_STOCK_MINIMO);
    } catch (_) {}
  }

  async loadProductos() {
    this.loading = true;
    try {
      const hasFilter = this.searchNombre.trim() || this.filterCategoriaId || this.filterActivo !== '';
      if (hasFilter) {
        this.productos = await this.productoSvc.buscar({
          nombre: this.searchNombre.trim() || undefined,
          categoriaId: this.filterCategoriaId || undefined,
          activo: this.filterActivo !== '' ? this.filterActivo : undefined
        });
      } else {
        this.productos = await this.productoSvc.listAll();
      }
    } catch (_) {
      this.toast.error('Error al cargar los productos');
    } finally {
      this.loading = false;
    }
  }

  onSearchInput() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadProductos(), 400);
  }

  onFilterChange() {
    this.loadProductos();
  }

  dismissStockAlert() {
    this.showStockAlert = false;
  }

  // ── Crear / Editar producto ───────────────────────────────

  async openCreateProduct() {
    this.isEditMode = false;
    this.editingProductId = null;
    this.productForm = {
      nombre: '',
      precioActual: 0,
      stock: 0,
      stockMinimo: DEFAULT_STOCK_MINIMO,
      categoriaId: '',
      subCategoriaId: '',
      activo: true
    };
    this.subcategoriasForm = [];
    this.showProductModal = true;
  }

  async openEditProduct(p: ProductoDTO) {
    this.isEditMode = true;
    this.editingProductId = p.id;
    this.productForm = {
      nombre: p.nombre,
      precioActual: p.precioActual ?? 0,
      stock: p.stock,
      stockMinimo: p.stockMinimo ?? DEFAULT_STOCK_MINIMO,
      categoriaId: p.categoriaId != null ? String(p.categoriaId) : '',
      subCategoriaId: p.subCategoriaId != null ? String(p.subCategoriaId) : '',
      activo: p.activo
    };
    this.subcategoriasForm = [];
    if (this.productForm.categoriaId) {
      await this.onCategoriaFormChange(false);
    }
    this.showProductModal = true;
  }

  closeProductModal() {
    this.showProductModal = false;
  }

  async onCategoriaFormChange(resetSub = true) {
    if (resetSub) this.productForm.subCategoriaId = '';
    this.subcategoriasForm = [];
    if (!this.productForm.categoriaId) return;
    try {
      this.subcategoriasForm = await this.categoriaSvc.listSubcategoriasByCategoria(this.productForm.categoriaId);
    } catch (_) {}
  }

  async saveProduct() {
    if (!this.productForm.nombre.trim()) {
      this.toast.warning('El nombre del producto es obligatorio');
      return;
    }
    if (this.productForm.precioActual < 0 || this.productForm.stock < 0) {
      this.toast.warning('El precio y el stock no pueden ser negativos');
      return;
    }
    if (!this.productForm.categoriaId || !this.productForm.subCategoriaId) {
      this.toast.warning('Selecciona categoría y subcategoría');
      return;
    }

    this.productSaving = true;
    const payload: ProductoCreateRequest = {
      nombre: this.productForm.nombre.trim(),
      precioActual: this.productForm.precioActual,
      stock: this.productForm.stock,
      stockMinimo: this.productForm.stockMinimo,
      categoriaId: this.productForm.categoriaId,
      subCategoriaId: this.productForm.subCategoriaId,
      activo: this.productForm.activo
    };

    try {
      if (this.isEditMode && this.editingProductId != null) {
        await this.productoSvc.update(this.editingProductId, payload);
        this.toast.success('Producto actualizado correctamente');
      } else {
        await this.productoSvc.create(payload);
        this.toast.success('Producto creado correctamente');
      }
      this.closeProductModal();
      await Promise.all([this.loadProductos(), this.loadStockBajo()]);
    } catch (_) {
      this.toast.error('Error al guardar el producto');
    } finally {
      this.productSaving = false;
    }
  }

  // ── Ajustar stock ─────────────────────────────────────────

  openStockModal(p: ProductoDTO) {
    this.stockTargetProduct = p;
    this.stockForm = { tipo: 'ENTRADA', cantidad: 1, motivo: '' };
    this.showStockModal = true;
  }

  closeStockModal() {
    this.showStockModal = false;
    this.stockTargetProduct = null;
  }

  async confirmAjusteStock() {
    if (!this.stockTargetProduct) return;
    if (!this.stockForm.cantidad || this.stockForm.cantidad <= 0) {
      this.toast.warning('La cantidad debe ser mayor a 0');
      return;
    }
    this.stockSaving = true;
    const payload: AjusteStockRequest = {
      cantidad: this.stockForm.cantidad,
      tipo: this.stockForm.tipo,
      motivo: this.stockForm.motivo.trim() || undefined
    };
    try {
      await this.productoSvc.ajustarStock(this.stockTargetProduct.id, payload);
      this.toast.success('Stock actualizado correctamente');
      this.closeStockModal();
      await Promise.all([this.loadProductos(), this.loadStockBajo()]);
    } catch (_) {
      this.toast.error('Error al ajustar el stock');
    } finally {
      this.stockSaving = false;
    }
  }

  // ── Historial de movimientos ───────────────────────────────

  async openHistorial(p: ProductoDTO) {
    this.historialTargetProduct = p;
    this.showHistorialModal = true;
    this.historialLoading = true;
    this.historialList = [];
    try {
      this.historialList = await this.productoSvc.getMovimientosByProducto(p.id);
    } catch (_) {
      this.toast.error('Error al cargar el historial del producto');
    } finally {
      this.historialLoading = false;
    }
  }

  closeHistorialModal() {
    this.showHistorialModal = false;
    this.historialTargetProduct = null;
  }

  // ── Eliminar producto ──────────────────────────────────────

  openDeleteConfirm(p: ProductoDTO) {
    this.deletingProduct = p;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deletingProduct = null;
  }

  async confirmDeleteProduct() {
    if (!this.deletingProduct) return;
    this.deleteLoading = true;
    try {
      await this.productoSvc.delete(this.deletingProduct.id);
      this.toast.success('Producto eliminado');
      this.closeDeleteModal();
      await Promise.all([this.loadProductos(), this.loadStockBajo()]);
    } catch (_) {
      this.toast.error('Error al eliminar el producto');
    } finally {
      this.deleteLoading = false;
    }
  }
}
