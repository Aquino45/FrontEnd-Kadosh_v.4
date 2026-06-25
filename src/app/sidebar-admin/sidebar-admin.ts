import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service'; // Cambiado a AuthService

type Item = { icon: string; label: string; link: string; children?: Item[] };
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
    {
      icon: 'fa-solid fa-warehouse', label: 'Inventarios', link: '',
      children: [
        { icon: 'fa-solid fa-gauge-high',    label: 'Resumen',     link: '/home-admin/inventario' },
        { icon: 'fa-solid fa-boxes-stacked', label: 'Productos',   link: '/home-admin/productos' },
        { icon: 'fa-solid fa-folder-tree',   label: 'Categorías',  link: '/home-admin/categorias' },
        { icon: 'fa-solid fa-chart-line',    label: 'Kardex',      link: '/home-admin/inventario-movimientos' },
      ]
    },
    { icon: 'fa-solid fa-robot',        label: 'Chatbot',      link: '/home-admin/chatbot' },
    { icon: 'fa-solid fa-message',      label: 'Asistente',    link: '/home-admin/asistente' },
    //{ icon: 'fa-solid fa-gear',    label: 'Ajustes',          link: '/home-admin/ajustes' },
    //{ icon: 'fa-solid fa-circle-question', label: 'Ayuda',    link: '/home-admin/ayuda' },
  ];

  expandedGroups = new Set<string>();

  bottomItem: Item = { icon: 'fa-solid fa-sign-out-alt', label: 'Cerrar Sesión', link: '' };

  constructor(private authService: AuthService, private router: Router) {}

  toggleGroup(label: string) {
    if (this.expandedGroups.has(label)) {
      this.expandedGroups.delete(label);
    } else {
      this.expandedGroups.add(label);
    }
  }

  isGroupExpanded(label: string): boolean {
    return this.expandedGroups.has(label);
  }

  isGroupActive(item: Item): boolean {
    return !!item.children?.some(child => this.router.url.startsWith(child.link));
  }

  getInitials(): string {
    const parts = this.user.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  async ngOnInit() {
    for (const item of this.primaryItems) {
      if (item.children && this.isGroupActive(item)) {
        this.expandedGroups.add(item.label);
      }
    }

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
