import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductoService, ProductoDTO, MovimientoStockDTO } from '../../../services/producto.service';
import { CategoriaService } from '../../../services/categoria.service';
import { ToastService } from '../../shared/toast/toast.service';

const DEFAULT_STOCK_MINIMO = 5;

@Component({
  selector: 'app-inventario-resumen',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.css']
})
export class InventarioResumenComponent implements OnInit {
  loading = false;

  totalProductos = 0;
  productosActivos = 0;
  totalStockBajo = 0;
  totalCategorias = 0;
  totalMovimientos = 0;

  stockBajo: ProductoDTO[] = [];
  ultimosMovimientos: MovimientoStockDTO[] = [];

  constructor(
    private productoSvc: ProductoService,
    private categoriaSvc: CategoriaService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    this.loading = true;
    try {
      const [productos, categorias, stockBajo, movimientos] = await Promise.all([
        this.productoSvc.listAll(),
        this.categoriaSvc.listAll(),
        this.productoSvc.getStockBajo(DEFAULT_STOCK_MINIMO),
        this.productoSvc.getMovimientos()
      ]);

      this.totalProductos = productos.length;
      this.productosActivos = productos.filter(p => p.activo).length;
      this.totalCategorias = categorias.length;
      this.totalMovimientos = movimientos.length;

      this.totalStockBajo = stockBajo.length;
      this.stockBajo = stockBajo.slice(0, 5);

      this.ultimosMovimientos = [...movimientos]
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 5);
    } catch (_) {
      this.toast.error('Error al cargar el resumen de inventario');
    } finally {
      this.loading = false;
    }
  }
}
