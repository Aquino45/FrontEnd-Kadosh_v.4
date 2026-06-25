import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductoService, MovimientoStockDTO, TipoMovimientoStock } from '../../../services/producto.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-inventario-movimientos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventario-movimientos.html',
  styleUrls: ['./inventario-movimientos.css']
})
export class InventarioMovimientosComponent implements OnInit {
  movimientos: MovimientoStockDTO[] = [];
  filtered: MovimientoStockDTO[] = [];
  loading = false;

  searchText = '';
  filterTipo: '' | TipoMovimientoStock = '';

  constructor(
    private productoSvc: ProductoService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.loadMovimientos();
  }

  async loadMovimientos() {
    this.loading = true;
    try {
      this.movimientos = await this.productoSvc.getMovimientos();
      this.movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      this.applyFilters();
    } catch (_) {
      this.toast.error('Error al cargar el historial de movimientos');
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    const text = this.searchText.trim().toLowerCase();
    this.filtered = this.movimientos.filter(m => {
      const matchesText = !text || (m.productoNombre ?? '').toLowerCase().includes(text);
      const matchesTipo = !this.filterTipo || m.tipo === this.filterTipo;
      return matchesText && matchesTipo;
    });
  }
}
