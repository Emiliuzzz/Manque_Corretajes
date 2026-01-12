import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  AdminDashboardService,
  AdminResumen,
} from '../../core/services/admin-dashboard.service';

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container py-4">
      <!-- Título -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="h3 mb-1">Panel de administración</h1>
          <p class="text-muted mb-0">
            Resumen general de propiedades, reservas, contratos, pagos y solicitudes.
          </p>
        </div>
      </div>

      <!-- FILA DE MÉTRICAS -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card shadow-sm h-100">
            <div class="card-body py-3">
              <div class="text-muted small">Propiedades por aprobar</div>
              <div class="h3 mb-0">
                {{ resumen?.propiedades_por_aprobar ?? '—' }}
              </div>
              <small class="text-muted">pendientes o en revisión</small>
            </div>
          </div>
        </div>

        <div class="col-6 col-md-3">
          <div class="card shadow-sm h-100">
            <div class="card-body py-3">
              <div class="text-muted small">Reservas activas</div>
              <div class="h3 mb-0">
                {{ resumen?.reservas_activas ?? '—' }}
              </div>
              <small class="text-muted">asociadas a propiedades</small>
            </div>
          </div>
        </div>

        <div class="col-6 col-md-3">
          <div class="card shadow-sm h-100">
            <div class="card-body py-3">
              <div class="text-muted small">Solicitudes nuevas</div>
              <div class="h3 mb-0">
                {{ resumen?.solicitudes_nuevas ?? '—' }}
              </div>
              <small class="text-muted">de clientes por revisar</small>
            </div>
          </div>
        </div>

        <div class="col-6 col-md-3">
          <div class="card shadow-sm h-100">
            <div class="card-body py-3">
              <div class="text-muted small">Pagos del mes (CLP)</div>
              <div class="h4 mb-0">
                {{ resumen?.pagos_mes || 0 | currency:'CLP':'symbol-narrow' }}
              </div>
              <small class="text-muted">pagos registrados este mes</small>
            </div>
          </div>
        </div>
      </div>

      <!-- FILA PRINCIPAL: PROPIEDADES / SOLICITUDES -->
      <div class="row g-3 mb-3">
        <!-- Gestión de propiedades -->
        <div class="col-12 col-lg-6">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title">Gestión de propiedades</h5>
              <p class="card-text text-muted">
                Aprobación, rechazo, pausa y seguimiento del historial de cambios.
                Desde aquí también puedes crear nuevas propiedades.
              </p>
              <ul class="mb-3">
                <li>Ver propiedades pendientes de aprobación</li>
                <li>Consultar propiedades arrendadas / vendidas</li>
                <li>Revisar historial de cambios por propiedad</li>
              </ul>
              <div class="d-flex flex-wrap gap-2">
                <button
                  class="btn btn-outline-secondary btn-sm"
                  (click)="ir('/admin/propiedades')"
                >
                  Ver propiedades
                </button>
                <button
                  class="btn btn-primary btn-sm"
                  (click)="ir('/admin/propiedades/nueva')"
                >
                  Crear nueva propiedad
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Solicitudes y reservas -->
        <div class="col-12 col-lg-6">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title">Solicitudes y reservas</h5>
              <p class="card-text text-muted">
                Visión general de las solicitudes enviadas por clientes y la
                actividad de reservas sobre las distintas propiedades.
              </p>
              <ul class="mb-3">
                <li>Revisar solicitudes de búsqueda de propiedades</li>
                <li>Ver estado y evolución de las reservas</li>
                <li>Coordinar seguimiento con propietarios y clientes</li>
              </ul>
              <div class="d-flex flex-wrap gap-2">
                <button
                  class="btn btn-outline-primary btn-sm"
                  (click)="ir('/admin/solicitudes')"
                >
                  Ver solicitudes de clientes
                </button>

                <button
                  class="btn btn-outline-secondary btn-sm"
                  (click)="ir('/admin/reservas')"
                >
                  Ver reservas
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- FILA SECUNDARIA: PROPIETARIOS / CONTRATOS / REPORTES -->
      <div class="row g-3">
        <!-- Gestión de propietarios -->
        <div class="col-12 col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title">Gestión de usuarios</h5>
              <p class="card-text text-muted">
                Administración de usuarios registrados en la corredora.
              </p>
              <ul class="mb-3">
                <li>Ver listado de usuarios</li>
                <li>Consultar datos de contacto y propiedades asociadas</li>
              </ul>
              <button
                class="btn btn-outline-secondary btn-sm"
                (click)="ir('/admin/usuarios')"
              >
                Ver usuarios
              </button>
              <div class="mt-3 text-muted small">
                Total propietarios: <strong>{{ resumen?.total_propietarios ?? '—' }}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Contratos y pagos -->
        <div class="col-12 col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title">Contratos y pagos</h5>
              <p class="card-text text-muted">
                Control de contratos de arriendo/venta y sus pagos asociados.
              </p>
              <ul class="mb-3">
                <li>Listar contratos vigentes y finalizados</li>
                <li>Revisar pagos realizados y saldos pendientes</li>
                <li>Registrar nuevos pagos desde backoffice</li>
              </ul>
              <button class="btn btn-outline-primary" routerLink="/admin/contratos">
                Ver contratos y pagos
              </button>
            </div>
          </div>
        </div>

        <!-- Reportes -->
        <div class="col-12 col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title">Reportes</h5>
              <p class="card-text text-muted">
                Resumen de ingresos, contratos activos y actividad por período
                (hoy / semana / mes).
              </p>
              <ul class="mb-3">
                <li>Ingresos por arriendos y ventas</li>
                <li>Contratos vigentes vs finalizados</li>
                <li>Pagos manuales vs cuotas pagadas</li>
              </ul>

              <button class="btn btn-outline-success btn-sm" (click)="ir('/admin/reportes')">
                Ver reportes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminDashboard implements OnInit {
  resumen: AdminResumen | null = null;

  constructor(
    private dashSvc: AdminDashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.dashSvc.getResumen().subscribe({
      next: (data) => (this.resumen = data),
      error: (err) => {
        console.error('Error cargando resumen admin', err);
        this.resumen = null;
      },
    });
  }

  ir(path: string): void {
    this.router.navigate([path]);
  }
}
