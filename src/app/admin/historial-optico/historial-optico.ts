import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewHistorialComponent } from './new-historial/new-historial';
import { HistorialOpticoService } from '../../../services/historial-optico.service';
import { ToastService } from '../../shared/toast/toast.service';

// Importamos el componente con el nombre de archivo limpio UwU
import { HistorialesOpticosUsuariosComponent } from './historiales-opticos-usuarios/historiales-opticos-usuarios';

@Component({
  standalone: true,
  selector: 'app-historial-optico',
  imports: [
    CommonModule, 
    FormsModule, 
    NewHistorialComponent, 
    HistorialesOpticosUsuariosComponent // Agregado aquí
  ],
  templateUrl: './historial-optico.html',
  styleUrls: ['./historial-optico.css']
})
export class HistorialOpticoComponent implements OnInit {
  private location = inject(Location);
  private historialSvc = inject(HistorialOpticoService) as HistorialOpticoService;
  private toast = inject(ToastService) as ToastService;

  showForm = false;
  loading = false;
  loadError = '';

  // Variable mágica para alternar vistas
  idSeleccionado: string | null = null; 

  expedientes: any[] = []; 
  private allExpedientes: any[] = []; 

  filterDni: string = '';
  filterNombre: string = '';
  filterDesde: string = '';
  filterHasta: string = '';
  showDateModal = false;

  ngOnInit(): void {
    this.loadExpedientes();
  }

  async loadExpedientes() {
    this.loading = true;
    this.loadError = '';
    try {
      const data = await this.historialSvc.listUsuariosConExpediente();
      
      // ✅ CORREGIDO: Usamos parseFechaLatina para ordenar correctamente
      this.allExpedientes = (data || []).sort((a: any, b: any) => {
        const dateA = this.parseFechaLatina(a.fechaPrimerHistorial);
        const dateB = this.parseFechaLatina(b.fechaPrimerHistorial);
        return dateB - dateA; // De más reciente a más antiguo
      });

      this.expedientes = [...this.allExpedientes];
    } catch (e: any) {
      this.loadError = e?.error?.message || 'Error al cargar expedientes.';
      this.toast.error(this.loadError);
    } finally {
      this.loading = false;
    }
  }

  onSearch() {
    const dniBusqueda = this.filterDni.trim().toLowerCase();
    const nombreBusqueda = this.filterNombre.trim().toLowerCase();

    this.expedientes = this.allExpedientes.filter(item => {
      const matchDni = !dniBusqueda || (item.dni && item.dni.toLowerCase().includes(dniBusqueda));
      const nombreCompleto = `${item.nombre} ${item.apellido}`.toLowerCase();
      const matchNombre = !nombreBusqueda || nombreCompleto.includes(nombreBusqueda);

      let matchFecha = true;
      
      // ✅ CORREGIDO: Convertimos la fecha que viene del backend (dd/MM/yyyy) a timestamp
      const fechaTimestamp = this.parseFechaLatina(item.fechaPrimerHistorial);

      if (fechaTimestamp > 0) {
        if (this.filterDesde) {
          // El input date HTML devuelve yyyy-MM-dd, eso lo lee bien el new Date()
          const desdeTs = new Date(this.filterDesde).getTime();
          matchFecha = matchFecha && fechaTimestamp >= desdeTs;
        }
        if (this.filterHasta) {
          // Sumamos 1 día (86400000ms) para incluir el día final completo
          const hastaTs = new Date(this.filterHasta).getTime() + 86400000;
          matchFecha = matchFecha && fechaTimestamp <= hastaTs;
        }
      } else if (this.filterDesde || this.filterHasta) {
        // Si hay filtro de fecha pero el ítem no tiene fecha válida, lo ocultamos
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
    this.loadExpedientes(); 
  }

  // Ahora esta función activa el componente de cartitas
  openHistoryDetail(user: any) {
    this.idSeleccionado = user.usuarioId; 
    this.toast.info(`Cargando historial de ${user.nombre}`);
  }

  // ==========================================
  // 🔧 HELPER PARA FECHAS (dd/MM/yyyy)
  // ==========================================
  private parseFechaLatina(fechaStr: string | null): number {
    if (!fechaStr) return 0;

    // 1. Si viene con hora "05/02/2026 14:30:00", nos quedamos solo con la fecha
    const soloFecha = fechaStr.split(' ')[0]; 

    // 2. Si tiene guiones (formato antiguo o ISO), dejamos que JS lo intente
    if (soloFecha.includes('-')) {
      return new Date(soloFecha).getTime();
    }

    // 3. Si tiene barras (05/02/2026), lo parseamos manualmente
    const partes = soloFecha.split('/');
    if (partes.length === 3) {
      // new Date(año, mesIndexadoEn0, dia)
      // partes[2] = año, partes[1] = mes (restamos 1), partes[0] = día
      return new Date(+partes[2], +partes[1] - 1, +partes[0]).getTime();
    }

    return 0;
  }
}