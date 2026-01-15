import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { AdminLayoutComponent } from './features/admin/admin-layout/admin-layout';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'catalogo' },

  {
    path: 'catalogo',
    loadComponent: () =>
      import('./features/catalogo/catalogo.component').then(
        (m) => m.Catalogo
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./features/auth/registro').then((m) => m.Registro),
  },
  {
    path: 'propiedad/:id',
    loadComponent: () =>
      import('./features/propiedad-detalle/propiedad-detalle.component').then(
        (m) => m.PropiedadDetalleComponent
      ),
  },

  // --------- Rutas por rol ---------

  // ADMIN
   {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [roleGuard],
    data: { roles: ['ADMIN'] },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/admin-dashboard').then((m) => m.AdminDashboard),
      },

      {
        path: 'propiedades',
        loadComponent: () =>
          import('./features/admin/admin-propiedades-list').then(
            (m) => m.AdminPropiedadesListComponent
          ),
      },
      {
        path: 'propiedades/nueva',
        loadComponent: () =>
          import('./features/admin/admin-propiedad-form').then(
            (m) => m.AdminPropiedadFormComponent
          ),
      },
      {
        path: 'propiedades/:id',
        loadComponent: () =>
          import('./features/admin/admin-propiedad-form').then(
            (m) => m.AdminPropiedadFormComponent
          ),
      },
      {
        path: 'propiedades/:id/historial',
        loadComponent: () =>
          import('./features/admin/admin-propiedad-historial').then(
            (m) => m.AdminPropiedadHistorialComponent
          ),
      },

      {
        path: 'solicitudes',
        loadComponent: () =>
          import('./features/admin/solicitudes/admin-solicitudes').then(
            (m) => m.AdminSolicitudesComponent
          ),
      },
      {
        path: 'solicitudes/:id',
        loadComponent: () =>
          import('./features/admin/solicitudes/admin-solicitud-detalle').then(
            (m) => m.AdminSolicitudDetalleComponent
          ),
      },

      {
        path: 'reservas',
        loadComponent: () =>
          import('./features/admin/reservas/admin-reservas').then(
            (m) => m.AdminReservasComponent
          ),
      },
      {
        path: 'reservas/:id',
        loadComponent: () =>
          import('./features/admin/reservas/admin-reserva-detalle').then(
            (m) => m.AdminReservaDetalleComponent
          ),
      },

      {
        path: 'propietarios/nuevo',
        loadComponent: () =>
          import('./features/admin/admin-propietario-form').then(
            (m) => m.AdminPropietarioFormComponent
          ),
      },
      {
        path: 'propietarios/:id',
        loadComponent: () =>
          import('./features/admin/admin-propietario-form').then(
            (m) => m.AdminPropietarioFormComponent
          ),
      },

      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/admin/usuarios/admin-usuarios-list').then(
            (m) => m.AdminUsuariosListComponent
          ),
      },
      {
        path: 'usuarios/nuevo',
        loadComponent: () =>
          import('./features/admin/usuarios/admin-usuario-create').then(
            (m) => m.AdminUsuarioCreateComponent
          ),
      },
      {
        path: 'usuarios/:id',
        loadComponent: () =>
          import('./features/admin/usuarios/admin-usuario-form').then(
            (m) => m.AdminUsuarioFormComponent
          ),
      },

      {
        path: 'contratos',
        loadComponent: () =>
          import('./features/admin/admin-contratos/admin-contratos').then(
            (m) => m.AdminContratosComponent
          ),
      },
      {
        path: 'contratos/:id',
        loadComponent: () =>
          import('./features/admin/admin-contratos/admin-contrato-detalle').then(
            (m) => m.AdminContratoDetalleComponent
          ),
      },

      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/admin/reportes/admin-reportes').then(
            (m) => m.AdminReportesComponent
          ),
      },
    ],
  },




  // PROPIETARIO
  {
    path: 'perfil',
    loadComponent: () =>
      import('./features/auth/perfil').then((m) => m.PerfilComponent),
    canActivate: [authGuard],
  },
  {
    path: 'mis-propiedades',
    loadComponent: () =>
      import('./features/propietario/mis-propiedades').then(
        (m) => m.MisPropiedades
      ),
    canActivate: [roleGuard],
    data: { roles: ['PROPIETARIO'] },
  },
  {
    path: 'propietario/nueva-propiedad',
    loadComponent: () =>
      import('./features/propietario/nueva-propiedad').then(
        (m) => m.NuevaPropiedadComponent
      ),
    canActivate: [roleGuard],
    data: { roles: ['PROPIETARIO'] },
  },
  {
    path: 'propietario/editar-propiedad/:id',
    loadComponent: () =>
      import('./features/propietario/editar-propiedad').then(
        (m) => m.EditarPropiedadComponent
      ),
    canActivate: [roleGuard],
    data: { roles: ['PROPIETARIO'] },
  },
  {
    path: 'propietario/propiedad/:id/fotos',
    loadComponent: () =>
      import('./features/propietario/gestionar-fotos').then(
        (m) => m.GestionarFotosComponent
      ),
    canActivate: [roleGuard],
    data: { roles: ['PROPIETARIO', 'ADMIN'] },
  },
  {
    path: 'propiedades/:id/historial',
    loadComponent: () =>
      import('./features/propietario/historial-propiedad').then(
        (m) => m.HistorialPropiedadComponent
      ),
    canActivate: [roleGuard],
    data: { roles: ['PROPIETARIO', 'ADMIN'] },
  },

  // CLIENTE
  {
    path: 'mis-solicitudes',
    loadComponent: () =>
      import('./features/cliente/mis-solicitudes').then(
        (m) => m.MisSolicitudes
      ),
    canActivate: [roleGuard],
    data: { roles: ['CLIENTE', 'ADMIN'] },
  },

  // CONTRATOS
  {
    path: 'contratos',
    loadComponent: () =>
      import('./features/contratos/contratos')
        .then(m => m.ContratosComponent),
  },

  // Wildcard
  { path: '**', redirectTo: 'catalogo' },
];
