import {
  Component,
  OnInit,
  inject,
  EnvironmentInjector,
  createComponent,
  ApplicationRef,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalInfoComponent, InfoClient } from './modal-info/modal-info';
import { NewClientComponent } from './new-client/new-client';
import { ModalEditComponent } from './modal-edit/modal-edit';
import { ModalDeleteComponent } from './modal-delete/modal-delete';
import { UsuariosService, ClienteListItemDTO } from '../../../services/usuarios.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  standalone: true,
  selector: 'app-clientes',
  imports: [
    CommonModule,
    FormsModule,
    ModalInfoComponent,
    NewClientComponent,
    ModalDeleteComponent,
  ],
  templateUrl: './clientes.html',
  styleUrls: ['./clientes.css'],
})
export class ClientesComponent implements OnInit {
  private location = inject(Location);
  private usuariosSvc = inject(UsuariosService);
  private injector = inject(EnvironmentInjector);
  private appRef = inject(ApplicationRef);
  private toast = inject(ToastService);


  isInfoOpen = false;
  clientToView: InfoClient | null = null;

  isDeleteOpen = false;
  clientToDelete: { id: string; nombre: string; apellido: string } | null = null;

  showForm = false;

  clients: { id: string; dni: string; nombre: string; apellido: string; telefono: string; imagenUrl: string | null }[] = [];
  loading = false;
  loadError = '';


  filterDni: string = '';
  filterNombre: string = '';

  ngOnInit(): void {
    this.loadClientes();
  }


  async loadClientes() {
    this.loading = true;
    this.loadError = '';
    try {
      const data: ClienteListItemDTO[] = await this.usuariosSvc.listClientes();
      this.clients = (data || []).map((u) => ({
        id: u.id || '',
        dni: u.dni || '---',
        nombre: u.nombre || '',
        apellido: u.apellido || '',
        telefono: u.telefono || '',
        imagenUrl: u.imagenUrl || null,
      }));
    } catch (e: any) {
      console.error('Error cargando clientes:', e);
      this.loadError =
        e?.error?.message || 'No se pudo cargar la lista de clientes.';
      this.clients = [];
    } finally {
      this.loading = false;
    }
  }


  async onSearch() {
    const dni = (this.filterDni || '').trim();
    const nombre = (this.filterNombre || '').trim();

    if (!dni && !nombre) {
      this.loadClientes();
      return;
    }

    this.loading = true;
    this.loadError = '';
    try {
      const data = await this.usuariosSvc.searchClientes({ dni, nombre });
      this.clients = (data || []).map((u) => ({
        id: u.id || '',
        dni: u.dni || '---',
        nombre: u.nombre || '',
        apellido: u.apellido || '',
        telefono: u.telefono || '',
        imagenUrl: u.imagenUrl || null,
      }));
    } catch (e: any) {
      console.error('Error filtrando:', e);
      this.loadError = e?.error?.message || 'No se pudo filtrar la lista.';
      this.clients = [];
    } finally {
      this.loading = false;
    }
  }


  onClear() {
    this.filterDni = '';
    this.filterNombre = '';
    this.loadClientes();
  }


  goBack() {
    this.location.back();
  }


  openInfo(client: { id: string }) {
    this.clientToView = { id: client.id };
    this.isInfoOpen = true;
  }

  closeInfo() {
    this.isInfoOpen = false;
    this.clientToView = null;
  }


  editClient(client: { id: string }) {
    try {
      const host = document.createElement('div');
      document.body.appendChild(host);

      const ref = createComponent(ModalEditComponent, {
        environmentInjector: this.injector,
        hostElement: host,
      });

      this.appRef.attachView(ref.hostView);

      ref.instance.client = { id: client.id };
      ref.instance.open = true;


      ref.instance.loadClient();

      ref.changeDetectorRef.detectChanges();

      const cleanup = () => {
        this.appRef.detachView(ref.hostView);
        ref.destroy();
        host.remove();
      };

      ref.instance.close.subscribe(cleanup);
      ref.instance.saved.subscribe(() => {
        this.loadClientes();
        cleanup();
      });
    } catch (err) {
      console.error('[editClient] fallo creando modal:', err);
    }
  }



  openDeleteConfirm(client: { id: string; nombre: string; apellido: string }) {
    this.clientToDelete = { ...client };
    this.isDeleteOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteOpen = false;
    this.clientToDelete = null;
  }


  async deleteClientConfirm() {
    if (!this.clientToDelete) return;

    try {
      const res: any = await this.usuariosSvc.deleteUsuario(this.clientToDelete.id);


      this.toast.success(res?.message);

      this.clients = this.clients.filter((c) => c.id !== this.clientToDelete!.id);
    } catch (e: any) {
      console.error('Error eliminando:', e);
      this.toast.error(
        e?.error?.message || 'No se pudo eliminar el cliente',
        'Alerta'
      );
    } finally {
      this.closeDeleteModal();
    }
  }


  newClient() {
    this.showForm = true;
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  }

  closeForm() {
    this.showForm = false;
    this.loadClientes();
  }
}
