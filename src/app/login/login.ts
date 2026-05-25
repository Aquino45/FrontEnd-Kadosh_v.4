import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';  // Importamos AuthService
import { ToastService } from '../shared/toast/toast.service'; // Ajusta ruta si difiere

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  usuario = '';
  contrasena = '';
  recordar = false;
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toast: ToastService
  ) { }

  async onSubmit() {
    this.loading = true;

    try {
      const res = await this.authService.login(this.usuario, this.contrasena);

      if (res?.success && res?.token) {
        const storage = this.recordar ? localStorage : sessionStorage;
        storage.setItem('token', res.token);

        if (res.user) {
          storage.setItem('user', JSON.stringify(res.user));

          this.toast.success('Inicio de sesión correcto', 'Éxito');

          // --- DIRECCIONAMIENTO INTELIGENTE POR ROL ---
          // Usamos toLowerCase() para que no falle por mayúsculas/minúsculas
          const rolNorm = (res.user.rol ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

          if (['admin', 'dueno', 'dueño'].includes(rolNorm)) {
            this.router.navigateByUrl('/home-admin');
          } else if (rolNorm === 'cliente') {
            this.router.navigateByUrl('/home-client');
          } else {
            console.warn('Rol desconocido:', res.user.rol);
            this.router.navigateByUrl('/login');
          }
        }
      } else {
        this.toast.error(res?.message ?? 'Ocurrió un problema', 'Alerta');
      }
    } catch (err: any) {
      this.loading = false;
      const msg = this.extractBackendMessage(err);
      const title = this.getErrorTitle(err);
      this.toast.error(msg, title);
    } finally {
      this.loading = false;
    }
  }


  private extractBackendMessage(err: any): string {
    if (err?.error?.message) return err.error.message;
    if (typeof err?.error === 'string') return err.error;
    if (err?.message && typeof err.message === 'string') return err.message;
    if (err?.statusText) return err.statusText;
    return 'Ocurrió un error al procesar la solicitud.';
  }


  private getErrorTitle(err: any): string {
    if (err?.status === 401 || err?.status === 403) return 'No autorizado';
    if (err?.status === 400) return 'Solicitud inválida';
    if (err?.status === 0) return 'Sin conexión';
    return 'Alerta';
  }

  irARegistro(): void {
    this.router.navigateByUrl('/register'); // ✅ Directo y sin vueltas como te gusta
  }
}
