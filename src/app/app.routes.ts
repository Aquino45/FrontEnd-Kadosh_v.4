import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { HomeAdminComponent } from './home-admin/home-admin';
import { HomeClientComponent } from './home-client/home-client'; // Importa el nuevo Home del cliente
import { AuthGuard } from './guards/auth.guard'; 

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // --- RUTA PARA EL DUEÑO (ADMIN) ---
  {
    path: 'home-admin',
    component: HomeAdminComponent,
    canActivate: [AuthGuard], 
    children: [
      { path: 'inicio', loadComponent: () => import('./admin/inicio/inicio').then(m => m.InicioComponent) },
      { path: 'clientes', loadComponent: () => import('./admin/clientes/clientes').then(m => m.ClientesComponent) },
      { path: 'historial-optico', loadComponent: () => import('./admin/historial-optico/historial-optico').then(m => m.HistorialOpticoComponent) },
      { path: 'facturacion', loadComponent: () => import('./admin/facturacion/facturacion').then(m => m.FacturacionComponent) },
      { path: 'cotizacion', loadComponent: () => import('./admin/cotizacion/cotizacion').then(m => m.CotizacionComponent) },
      { path: 'ajustes', loadComponent: () => import('./admin/ajustes/ajustes').then(m => m.AjustesComponent) },
      { path: 'ayuda', loadComponent: () => import('./admin/ayuda/ayuda').then(m => m.AyudaComponent) },
      { path: 'chatbot', loadComponent: () => import('./admin/chatbot/chatbot').then(m => m.ChatbotComponent) },
      { path: 'asistente', loadComponent: () => import('./asistente/asistente').then(m => m.AsistenteComponent) },
      { path: 'inventario', loadComponent: () => import('./admin/inventario/inventario').then(m => m.InventarioResumenComponent) },
      { path: 'productos', loadComponent: () => import('./admin/productos/productos').then(m => m.ProductosComponent) },
      { path: 'categorias', loadComponent: () => import('./admin/categorias/categorias').then(m => m.CategoriasComponent) },
      { path: 'inventario-movimientos', loadComponent: () => import('./admin/inventario-movimientos/inventario-movimientos').then(m => m.InventarioMovimientosComponent) },
      { path: 'reportes', loadComponent: () => import('./admin/reportes/reportes').then(m => m.ReportesComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'inicio' }
    ]
  },

  // --- RUTA PARA EL CLIENTE ---
  {
    path: 'home-client',
    component: HomeClientComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'inicio', loadComponent: () => import('./client/inicio/inicio').then(m => m.InicioComponent) },
      //{ path: 'clientes', loadComponent: () => import('./client/clientes/clientes').then(m => m.ClientesComponent) },
      { path: 'historial-optico', loadComponent: () => import('./client/historiales-opticos-usuarios/historiales-opticos-usuarios').then(m => m.HistorialesOpticosUsuariosComponent) },
      { path: 'facturacion', loadComponent: () => import('./client/facturacion/facturacion').then(m => m.FacturacionComponent) },
      { path: 'cotizacion', loadComponent: () => import('./client/cotizaciones-usuarios/cotizaciones-usuarios').then(m => m.CotizacionesUsuariosComponent) },
      { path: 'ajustes', loadComponent: () => import('./client/ajustes/ajustes').then(m => m.AjustesComponent) },
      { path: 'ayuda', loadComponent: () => import('./client/ayuda/ayuda').then(m => m.AyudaComponent) },
      { path: 'asistente', loadComponent: () => import('./asistente/asistente').then(m => m.AsistenteComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'inicio' }
    ]
  }
];