import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router'; // Importa el Router
import { AuthService } from '../../services/auth.service'; // Cambiado a AuthService
import { UsuariosService } from '../../services/usuarios.service'; // Añadido UsuariosService

type Item = { icon: string; label: string; link: string };
type SidebarUser = { name: string; email: string; avatarUrl?: string | null; rol?: string | null };

@Component({
  selector: 'app-sidebar-client',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar-client.html',
  styleUrls: ['./sidebar-client.css']
})
export class SidebarClientComponent implements OnInit {
  @Input() collapsed = false;
  @Output() sidebarToggle = new EventEmitter<boolean>();

  

  
  user: SidebarUser = {
    name: '—',
    email: '—',
    avatarUrl: null,
    rol: null
  };

  primaryItems: Item[] = [
    { icon: 'fa-solid fa-house',   label: 'Inicio',           link: '/home-client/inicio' },
    //{ icon: 'fa-solid fa-users',   label: 'Clientes',         link: '/home-client/clientes' },
    { icon: 'fa-solid fa-history', label: 'Historial Óptico', link: '/home-client/historial-optico' },
    { icon: 'fa-solid fa-file-invoice', label: 'Cotización',  link: '/home-client/cotizacion' },
    { icon: 'fa-solid fa-receipt', label: 'Facturación',      link: '/home-client/facturacion' },
    //{ icon: 'fa-solid fa-gear',    label: 'Ajustes',          link: '/home-client/ajustes' },
    //{ icon: 'fa-solid fa-circle-question', label: 'Ayuda',    link: '/home-client/ayuda' },
  ];

  bottomItem: Item = { icon: 'fa-solid fa-sign-out-alt', label: 'Cerrar Sesión', link: '' };

  constructor(
    private authService: AuthService,
    private router: Router // Inyecta el Router
  ) {}
  

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

  // 1. Agregamos la función de cerrar sesión
  logout() {
    // Limpiamos los dos posibles almacenamientos que usaste en el login
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');

    // Opcional: Si quieres limpiar TODO de una vez
    // localStorage.clear();
    // sessionStorage.clear();

    // Redirigimos al login
    this.router.navigate(['/login']);
  }
}
