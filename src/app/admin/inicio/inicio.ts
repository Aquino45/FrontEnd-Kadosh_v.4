import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})
export class InicioComponent implements OnInit {
  
  // Inicializamos con valores por defecto para evitar errores de renderizado
  user = {
    name: 'Cargando...',
    rol: ''
  };

  constructor(private authService: AuthService) {}

  async ngOnInit() {
    try {
      const resp = await this.authService.me();
      if (resp?.success && resp.data) {
        const d = resp.data;
        this.user = {
          // Unimos nombre y apellido, si no existen ponemos 'Administrador'
          name: `${d.nombre ?? ''} ${d.apellido ?? ''}`.trim() || 'Administrador',
          rol: d.rol ?? 'Admin'
        };
      }
    } catch (error) {
      console.error('Error al obtener datos en Inicio:', error);
      this.user.name = 'Administrador'; // Fallback en caso de error
    }
  }

  // Método opcional por si quieres mostrar la fecha actual en el panel
  get greetingTime(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }
}