import { Component, EventEmitter, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { CotizacionService, CotizacionRequest } from '../../../../services/cotizacion.service';
import { InventarioService } from '../../../../services/inventario.service';
import { UsuariosService, ClienteListItemDTO } from '../../../../services/usuarios.service';
import { HistorialOpticoService, HistorialOpticoResponse } from '../../../../services/historial-optico.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  standalone: true,
  selector: 'app-new-cotizacion',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './new-cotizacion.html',
  styleUrls: ['./new-cotizacion.css']
})
export class NewCotizacionComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private cotizacionSvc = inject(CotizacionService);
  private inventarioSvc = inject(InventarioService);
  private usuariosSvc = inject(UsuariosService);
  private historialOpticoSvc = inject(HistorialOpticoService);
  private toast = inject(ToastService);

  // =============== FORM PRINCIPAL DE COTIZACIÓN ===============
  // Se eliminó el control 'recomendaciones'
  form: FormGroup = this.fb.group({
    usuarioId: [null, Validators.required],
    fecha: [this.getLocalDate()],
    paciente: [{ value: '', disabled: true }],
    dni: [{ value: '', disabled: true }],
    nombreApoderado: [{ value: '', disabled: true }],
    telefono: [{ value: '', disabled: true }],
    edad: ['', [Validators.min(0)]],
    correo: [{ value: '', disabled: true }]
  });

  loading = false;

  // =============== BUSCADOR DE CLIENTES ===============
  search = { dni: '', nombre: '' };
  suggestions: ClienteListItemDTO[] = [];
  selectedCliente: any = null;
  idUsuarioSeleccionado: string | null = null;

  // =============== HISTORIALES ÓPTICOS ===============
  historiales: HistorialOpticoResponse[] = [];
  loadingHistoriales = false;
  historialSeleccionadoId: string | null = null;
  verDetalle = false;
  historialSeleccionadoParaVer: HistorialOpticoResponse | null = null;

  // =============== LISTAS PARA SELECCIÓN TÉCNICA (HILO) ===============
  categorias: any[] = [];
  subcategorias: any[] = [];
  productos: any[] = [];

  categoriaSel: any = null;
  subcategoriaSel: any = null;
  itemsSeleccionados: any[] = [];

  // =============== SERVICIOS ADICIONALES ===============
  serviciosAgregados: { descripcion: string; precio: number; cantidad: number }[] = [];
  nuevoServicio = { descripcion: '', precio: null as number | null, cantidad: 1 };

  ngOnInit(): void { }

  // ===================== BUSCADOR — LÓGICA =====================

  onSearchChange() {
    this.selectedCliente = null;
    this.idUsuarioSeleccionado = null;
    this.form.patchValue({ usuarioId: null });
    this.historiales = [];
    this.historialSeleccionadoId = null;
    if (!this.search.dni.trim() && !this.search.nombre.trim()) {
      this.suggestions = [];
    }
  }

  async onSearchClick() {
    const { dni, nombre } = this.search;
    if (!dni.trim() && !nombre.trim()) {
      this.toast.info('Ingresa DNI o nombre para buscar.');
      return;
    }
    try {
      const res = await this.usuariosSvc.searchClientes({ dni, nombre });
      this.suggestions = res;
      if (!res.length) this.toast.info('No se encontraron clientes.');
    } catch (e) {
      this.toast.error('Error al buscar clientes.');
    }
  }

  onSearchEnter() { this.onSearchClick(); }

  onClearSearch() {
    this.search = { dni: '', nombre: '' };
    this.suggestions = [];
    this.selectedCliente = null;
    this.idUsuarioSeleccionado = null;
    this.historiales = [];
    this.historialSeleccionadoId = null;
    this.form.reset({ fecha: this.getLocalDate() });
    this.limpiarSeleccionTecnica();
  }

  async onSelectUser(cli: any) {
    this.selectedCliente = cli;
    this.idUsuarioSeleccionado = cli.id;

    const nombreCompleto = `${cli.nombre ?? ''} ${cli.apellido ?? ''}`.trim();
    const apoderado = cli.nombreApoderado ? `${cli.nombreApoderado} ${cli.apellidoApoderado || ''}` : 'Ninguno';

    this.form.patchValue({
      usuarioId: cli.id,
      paciente: nombreCompleto,
      dni: cli.dni ?? '',
      nombreApoderado: apoderado,
      telefono: cli.telefono ?? '',
      edad: cli.edad ?? null,
      correo: cli.correo ?? cli.email ?? ''
    });

    this.suggestions = [];
    this.toast.success(`Cliente ${cli.nombre} vinculado.`);

    await this.cargarHistorialesOpticos(cli.id);
    await this.cargarCategorias();
  }

  // ===================== LÓGICA DE HISTORIALES =====================

  async cargarHistorialesOpticos(usuarioId: string) {
    this.loadingHistoriales = true;
    try {
      this.historiales = await this.historialOpticoSvc.getHistorialesByUsuario(usuarioId);
    } catch (e) {
      this.toast.error('Error al cargar expedientes ópticos.');
    } finally {
      this.loadingHistoriales = false;
    }
  }

  onSelectHistorial(h: HistorialOpticoResponse) {
    this.historialSeleccionadoId = h.historialOpticoId || null;
    this.toast.info(`Medidas del ${h.fecha} seleccionadas.`);
  }

  onVerDetalleCompleto(h: HistorialOpticoResponse) {
    this.historialSeleccionadoParaVer = h;
    this.verDetalle = true;
  }

  onCerrarDetalle() {
    this.verDetalle = false;
    this.historialSeleccionadoParaVer = null;
  }

  // ===================== LÓGICA DE PRODUCTOS (HILO) =====================

  async cargarCategorias() {
    try {
      this.categorias = await this.inventarioSvc.listarCategorias();
    } catch (e) {
      this.toast.error('Error al cargar las categorías de inventario.');
    }
  }

  async onSelectCategoria(cat: any) {
    this.categoriaSel = cat;
    this.subcategoriaSel = null;
    this.productos = [];
    const idABuscar = cat.categoriaId || cat.id;
    try {
      this.subcategorias = await this.inventarioSvc.listarSubcategoriasPorCategoria(idABuscar);
    } catch (e) {
      this.toast.error('Error al cargar tipos de productos.');
    }
  }

  async onSelectSubcategoria(sub: any) {
    const idReal = sub.subCategoriaId || sub.subcategoriaId || sub.id;
    if (!idReal) {
      this.toast.error("Error: La subcategoría no tiene un ID válido.");
      return;
    }
    this.subcategoriaSel = sub;
    try {
      this.productos = await this.inventarioSvc.listarProductosPorSubcategoria(idReal);
    } catch (e) {
      this.toast.error('Error al cargar la lista de productos.');
    }
  }

  agregarProducto(prod: any) {
    const idReal = prod.productoId || prod.id;
    if (!idReal) return;

    const existe = this.itemsSeleccionados.find(i => i.productoId === idReal);

    if (existe) {
      if (existe.cantidad < prod.stock) {
        existe.cantidad++;
        this.toast.success(`Añadido: ahora tienes ${existe.cantidad}`);
      } else {
        this.toast.warning(`Límite alcanzado: Solo hay ${prod.stock} en stock.`);
      }
    } else {
      if (prod.stock > 0) {
        this.itemsSeleccionados.push({
          productoId: idReal,
          nombre: prod.nombre,
          precio: prod.precioActual,
          cantidad: 1,
          stockMax: prod.stock 
        });
        this.toast.success(`${prod.nombre} añadido.`);
      } else {
        this.toast.error('No hay stock disponible.');
      }
    }
  }

  cambiarCantidad(index: number, cambio: number) {
    const item = this.itemsSeleccionados[index];
    const nuevaCant = item.cantidad + cambio;
    if (nuevaCant >= 1 && nuevaCant <= item.stockMax) {
      item.cantidad = nuevaCant;
    } else if (nuevaCant > item.stockMax) {
      this.toast.warning(`Stock máximo disponible: ${item.stockMax}`);
    }
  }

  calcularTotal(): number {
    const productos = this.itemsSeleccionados.reduce((t, i) => t + (i.precio * i.cantidad), 0);
    const servicios = this.serviciosAgregados.reduce((t, s) => t + (s.precio * s.cantidad), 0);
    return productos + servicios;
  }

  eliminarItem(index: number) {
    const nombre = this.itemsSeleccionados[index].nombre;
    this.itemsSeleccionados.splice(index, 1);
    this.toast.info(`${nombre} eliminado de la cotización.`);
  }

  // ===================== SERVICIOS — LÓGICA =====================

  agregarServicio(): void {
    const { descripcion, precio, cantidad } = this.nuevoServicio;
    if (!descripcion.trim()) { this.toast.warning('Escribe una descripción del servicio.'); return; }
    if (!precio || precio <= 0) { this.toast.warning('Ingresa un precio válido.'); return; }
    if (cantidad < 1) { this.toast.warning('La cantidad debe ser al menos 1.'); return; }
    this.serviciosAgregados.push({ descripcion: descripcion.trim(), precio: precio!, cantidad });
    this.nuevoServicio = { descripcion: '', precio: null, cantidad: 1 };
  }

  eliminarServicio(index: number): void {
    const nombre = this.serviciosAgregados[index].descripcion;
    this.serviciosAgregados.splice(index, 1);
    this.toast.info(`"${nombre}" eliminado.`);
  }

  limpiarSeleccionTecnica() {
    this.categoriaSel = null;
    this.subcategoriaSel = null;
    this.subcategorias = [];
    this.productos = [];
    this.serviciosAgregados = [];
    this.nuevoServicio = { descripcion: '', precio: null, cantidad: 1 };
  }

  // ===================== FORMATEO Y ENVÍO =====================

  private formatFechaParaBack(fechaInput: string): string {
    if (!fechaInput) return "";
    const [year, month, day] = fechaInput.split('-');
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${h}:${m}:${s}`;
  }

  async submit() {
    if (this.form.invalid || !this.idUsuarioSeleccionado) {
      this.form.markAllAsTouched();
      this.toast.error('Faltan datos del paciente.');
      return;
    }

    if (!this.historialSeleccionadoId) {
      this.toast.error('Debes seleccionar un historial óptico para continuar.');
      return;
    }

    if (this.itemsSeleccionados.length === 0 && this.serviciosAgregados.length === 0) {
      this.toast.error('Debes agregar al menos un producto o servicio.');
      return;
    }

    this.loading = true;
    try {
      const raw = this.form.getRawValue();
      const payload: CotizacionRequest = {
        usuarioId: raw.usuarioId,
        historialId: this.historialSeleccionadoId,
        fechaCreacion: this.formatFechaParaBack(raw.fecha),
        items: this.itemsSeleccionados.map(i => ({
          productoId: i.productoId,
          cantidad: i.cantidad
        })),
        servicios: this.serviciosAgregados.map(s => ({
          descripcion: s.descripcion,
          precio: s.precio,
          cantidad: s.cantidad
        }))
      };

      await this.cotizacionSvc.create(payload);
      this.toast.success('Cotización registrada con éxito en Wimiline.');
      this.onClearSearch();
      this.close.emit();
    } catch (e) {
      this.toast.error('Error al guardar la cotización.');
    } finally {
      this.loading = false;
    }
  }

  cancel() {
    if (!this.loading) this.close.emit();
  }

  private getLocalDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}