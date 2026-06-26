import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CotizacionService } from '../../../services/cotizacion.service';
import { ToastService } from '../../shared/toast/toast.service';

// Importamos los componentes hijos para las vistas dinámicas
import { NewCotizacionComponent } from './new-cotizacion/new-cotizacion';
import { CotizacionesUsuariosComponent } from './cotizaciones-usuarios/cotizaciones-usuarios';

@Component({
  standalone: true,
  selector: 'app-cotizacion',
  imports: [
    CommonModule, 
    FormsModule, 
    NewCotizacionComponent, 
    CotizacionesUsuariosComponent
  ],
  templateUrl: './cotizacion.html',
  styleUrls: ['./cotizacion.css']
})
export class CotizacionComponent implements OnInit {
  private location = inject(Location);
  private cotizacionSvc = inject(CotizacionService);
  private toast = inject(ToastService);

  // Estados de carga y visualización
  showForm = false;
  loading = false;
  loadError = '';

  // ID del usuario seleccionado para ver sus "cartitas" de cotización
  idSeleccionado: string | null = null; 

  // Listas de datos
  expedientes: any[] = []; 
  private allExpedientes: any[] = []; 

  // Filtros de la tabla
  filterDni: string = '';
  filterNombre: string = '';
  filterDesde: string = '';
  filterHasta: string = '';
  showDateModal = false;

  ngOnInit(): void {
    this.loadCotizaciones();
  }

  /**
   * Carga la lista de usuarios que tienen al menos una cotización
   */
  async loadCotizaciones() {
    this.loading = true;
    this.loadError = '';
    try {
      // Llamamos al endpoint de tu controlador (/usuarios-con-cotizaciones)
      const data = await this.cotizacionSvc.listUsuariosConCotizacion();
      
      // Ordenamos por la fecha de la última cotización (más reciente primero)
      this.allExpedientes = (data || []).sort((a: any, b: any) => {
        const dateA = this.parseFechaLatina(a.fechaInicialCotizacion);
        const dateB = this.parseFechaLatina(b.fechaInicialCotizacion);
        return dateB - dateA; 
      });

      this.expedientes = [...this.allExpedientes];
    } catch (e: any) {
      this.loadError = e?.error?.message || 'Error al cargar las cotizaciones de Wimiline.';
      this.toast.error(this.loadError);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Lógica de filtrado local para DNI, Nombre y Rango de Fechas
   */
  onSearch() {
    const dniBusqueda = this.filterDni.trim().toLowerCase();
    const nombreBusqueda = this.filterNombre.trim().toLowerCase();

    this.expedientes = this.allExpedientes.filter(item => {
      // Filtramos usando los nombres de campos del Map del Backend
      const matchDni = !dniBusqueda || (item.dniPaciente && item.dniPaciente.toLowerCase().includes(dniBusqueda));
      const nombreCompleto = (item.nombrePaciente || '').toLowerCase();
      const matchNombre = !nombreBusqueda || nombreCompleto.includes(nombreBusqueda);

      let matchFecha = true;
      const fechaTimestamp = this.parseFechaLatina(item.fechaInicialCotizacion);

      if (fechaTimestamp > 0) {
        if (this.filterDesde) {
          const desdeTs = new Date(this.filterDesde).getTime();
          matchFecha = matchFecha && fechaTimestamp >= desdeTs;
        }
        if (this.filterHasta) {
          // Sumamos un día (86400000ms) para incluir todo el día final
          const hastaTs = new Date(this.filterHasta).getTime() + 86400000;
          matchFecha = matchFecha && fechaTimestamp <= hastaTs;
        }
      } else if (this.filterDesde || this.filterHasta) {
        matchFecha = false;
      }

      return matchDni && matchNombre && matchFecha;
    });
  }

  onClear() {
    this.filterDni = '';
    this.filterNombre = '';
    this.filterDesde = '';
    this.filterHasta = '';
    this.expedientes = [...this.allExpedientes];
  }

  openDateModal() { this.showDateModal = true; }
  closeDateModal() { this.showDateModal = false; }

  applyDateFilter() {
    this.showDateModal = false;
    this.onSearch();
  }

  clearDateFilter() {
    this.filterDesde = '';
    this.filterHasta = '';
    this.showDateModal = false;
    this.onSearch();
  }

  goBack() { this.location.back(); }
  
  openForm() { this.showForm = true; }
  
  closeForm() { 
    this.showForm = false; 
    this.loadCotizaciones(); 
  }

  /**
   * Abre el componente de detalle para el usuario seleccionado
   */
  openCotizacionDetail(user: any) {
  // Ahora user.usuarioId ya no será undefined porque el Java ya lo envía
  if (user.usuarioId) {
    this.idSeleccionado = user.usuarioId; 
    this.toast.info(`Cargando cotizaciones de ${user.nombrePaciente}`);
  } else {
    this.toast.error('No se encontró el ID del usuario en la respuesta del servidor.');
  }
}

  // ==========================================
  // 🔧 HELPER PARA FECHAS (dd/MM/yyyy HH:mm:ss)
  // ==========================================
  private parseFechaLatina(fechaStr: string | null): number {
    if (!fechaStr || fechaStr === 'No registrado') return 0;

    // 1. Obtenemos solo la parte de la fecha (ignora la hora)
    const soloFecha = fechaStr.split(' ')[0]; 

    // 2. Formato ISO (yyyy-MM-dd)
    if (soloFecha.includes('-')) {
      return new Date(soloFecha).getTime();
    }

    // 3. Formato Latino (dd/MM/yyyy)
    const partes = soloFecha.split('/');
    if (partes.length === 3) {
      // partes[2]=año, partes[1]=mes, partes[0]=día
      // JS Date usa meses de 0-11
      return new Date(+partes[2], +partes[1] - 1, +partes[0]).getTime();
    }

    return 0;
  }
}