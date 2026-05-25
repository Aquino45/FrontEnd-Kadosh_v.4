import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
    try {
      const resp = await this.authService.me();
      
      // 1. Si la respuesta no es exitosa, mándalo al login
      if (!resp?.success || !resp.data) {
        return this.router.parseUrl('/login');
      }

      const rolRaw = resp.data.rol ?? '';
      const rol = rolRaw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const urlDestino = state.url;

      console.log('[Guard] URL:', urlDestino, '| rolRaw:', JSON.stringify(rolRaw), '| rolNorm:', JSON.stringify(rol));

      const esAdmin = ['admin', 'dueno', 'dueño'].includes(rol);
      const esCliente = rol === 'cliente';
      console.log('[Guard] esAdmin:', esAdmin, '| esCliente:', esCliente);

      // 2. LÓGICA PARA RUTAS DE ADMIN
      if (urlDestino.startsWith('/home-admin')) {
        if (esAdmin) return true;
        if (esCliente) return this.router.parseUrl('/home-client/inicio');
      }

      // 3. LÓGICA PARA RUTAS DE CLIENTE
      if (urlDestino.startsWith('/home-client')) {
        if (esCliente) return true;
        if (esAdmin) return this.router.parseUrl('/home-admin/inicio');
      }

      // 4. SI NO COINCIDE NADA (Seguridad por defecto)
      console.warn('Acceso denegado: Rol no autorizado para esta ruta');
      return this.router.parseUrl('/login');
      
    } catch (error) {
      console.error('Error crítico en AuthGuard:', error);
      return this.router.parseUrl('/login');
    }
  }
}