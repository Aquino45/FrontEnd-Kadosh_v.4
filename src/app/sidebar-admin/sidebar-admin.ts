import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Cambiado a AuthService
import { UsuariosService } from '../../services/usuarios.service'; // Añadido UsuariosService

type Item = { icon: string; label: string; link: string };
type SidebarUser = { name: string; email: string; avatarUrl?: string | null; rol?: string | null };

@Component({
  selector: 'app-sidebar-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar-admin.html',
  styleUrls: ['./sidebar-admin.css']
})
export class SidebarAdminComponent implements OnInit {
  @Input() collapsed = false;
  @Output() sidebarToggle = new EventEmitter<boolean>();

  
  user: SidebarUser = {
    name: '—',
    email: '—',
    avatarUrl: null,
    rol: null
  };

  primaryItems: Item[] = [
    { icon: 'fa-solid fa-house',   label: 'Inicio',           link: '/home-admin/inicio' },
    { icon: 'fa-solid fa-users',   label: 'Clientes',         link: '/home-admin/clientes' },
    { icon: 'fa-solid fa-history', label: 'Historial Óptico', link: '/home-admin/historial-optico' },
    { icon: 'fa-solid fa-file-invoice', label: 'Cotización',   link: '/home-admin/cotizacion' },
    { icon: 'fa-solid fa-receipt',      label: 'Facturación',  link: '/home-admin/facturacion' },
    //{ icon: 'fa-solid fa-gear',    label: 'Ajustes',          link: '/home-admin/ajustes' },
    //{ icon: 'fa-solid fa-circle-question', label: 'Ayuda',    link: '/home-admin/ayuda' },
  ];

  bottomItem: Item = { icon: 'fa-solid fa-sign-out-alt', label: 'Cerrar Sesión', link: '' };

  constructor(private authService: AuthService) {} 

  async ngOnInit() {
    try {
      const resp = await this.authService.me(); 
      if (resp?.success && resp.data) {
        const d = resp.data;
        this.user = {
          name: `${d.nombre ?? ''} ${d.apellido ?? ''}`.trim(),
          email: d.correo ?? '—',
          avatarUrl: d.imagenUrl ?? null,
          rol: d.rol ?? null
        };
      }
    } catch (e) {
      
      console.error('No se pudo obtener /me', e);
    }
  }
}
