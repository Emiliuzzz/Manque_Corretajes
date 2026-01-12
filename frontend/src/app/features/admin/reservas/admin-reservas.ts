import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AdminReservasService,
  AdminReserva,
} from '../../../core/services/admin-reservas.service';

type FiltroEstado =
  | 'TODAS'
  | 'pendiente'
  | 'confirmada'
  | 'expirada'
  | 'cancelada';

@Component({
  standalone: true,
  selector: 'app-admin-reservas',
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container my-4">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h2 class="mb-1">Reservas de clientes</h2>
          <p class="text-muted mb-0">
            Gestiona las reservas realizadas por los clientes.
          </p>
        </div>

        <div class="d-flex gap-2">
          <button
            *ngIf="returnTo"
            type="button"
            class="btn btn-outline-secondary"
            (click)="volverAReportes()"
          >
            ← Volver a reportes
          </button>

          <button
            type="button"
            class="btn btn-outline-dark"
            (click)="irPanel()"
          >
            Panel admin
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="row g-3 mb-4" *ngIf="!cargando && !error">
        <div class="col-6 col-md-3">
          <div class="card shadow-sm h-100" style="cursor:pointer" (click)="cambiarFiltro('TODAS')">
            <div class="card-body text-center py-3">
              <div class="text-muted small mb-1">Total</div>
              <div class="h3 mb-0 text-primary">{{ kpi.total }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm h-100" style="cursor:pointer" (click)="cambiarFiltro('pendiente')">
            <div class="card-body text-center py-3">
              <div class="text-muted small mb-1">Pendientes</div>
              <div class="h3 mb-0 text-warning">{{ kpi.pendientes }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm h-100" style="cursor:pointer" (click)="cambiarFiltro('confirmada')">
            <div class="card-body text-center py-3">
              <div class="text-muted small mb-1">Confirmadas</div>
              <div class="h3 mb-0 text-success">{{ kpi.confirmadas }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card shadow-sm h-100" style="cursor:pointer" (click)="cambiarFiltro('cancelada')">
            <div class="card-body text-center py-3">
              <div class="text-muted small mb-1">Canceladas</div>
              <div class="h3 mb-0 text-secondary">{{ kpi.canceladas }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mensajes de estado -->
      <div *ngIf="cargando" class="alert alert-info">
        <span class="spinner-border spinner-border-sm me-2"></span>
        Cargando reservas...
      </div>
      <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

      <!-- Filtros -->
      <div class="card shadow-sm mb-4" *ngIf="!cargando && !error">
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <!-- Filtro estado -->
            <div class="col-12">
              <label class="form-label small text-muted mb-2">Estado</label>
              <div class="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  class="btn btn-sm"
                  [ngClass]="{
                    'btn-primary': filtroEstado === 'TODAS',
                    'btn-outline-primary': filtroEstado !== 'TODAS'
                  }"
                  (click)="cambiarFiltro('TODAS')"
                >
                  Todas
                </button>

                <button
                  type="button"
                  class="btn btn-sm"
                  [ngClass]="{
                    'btn-warning': filtroEstado === 'pendiente',
                    'btn-outline-warning': filtroEstado !== 'pendiente'
                  }"
                  (click)="cambiarFiltro('pendiente')"
                >
                  Pendientes
                </button>

                <button
                  type="button"
                  class="btn btn-sm"
                  [ngClass]="{
                    'btn-success': filtroEstado === 'confirmada',
                    'btn-outline-success': filtroEstado !== 'confirmada'
                  }"
                  (click)="cambiarFiltro('confirmada')"
                >
                  Confirmadas
                </button>

                <button
                  type="button"
                  class="btn btn-sm"
                  [ngClass]="{
                    'btn-dark': filtroEstado === 'expirada',
                    'btn-outline-dark': filtroEstado !== 'expirada'
                  }"
                  (click)="cambiarFiltro('expirada')"
                >
                  Expiradas
                </button>

                <button
                  type="button"
                  class="btn btn-sm"
                  [ngClass]="{
                    'btn-secondary': filtroEstado === 'cancelada',
                    'btn-outline-secondary': filtroEstado !== 'cancelada'
                  }"
                  (click)="cambiarFiltro('cancelada')"
                >
                  Canceladas
                </button>
              </div>
            </div>

            <!-- Fechas y búsqueda -->
            <div class="col-12 col-md-3">
              <label class="form-label small text-muted">Desde</label>
              <input
                class="form-control form-control-sm"
                type="date"
                [(ngModel)]="desde"
                (change)="aplicarQueryParams()"
              />
            </div>

            <div class="col-12 col-md-3">
              <label class="form-label small text-muted">Hasta</label>
              <input
                class="form-control form-control-sm"
                type="date"
                [(ngModel)]="hasta"
                (change)="aplicarQueryParams()"
              />
            </div>

            <div class="col-12 col-md-4">
              <label class="form-label small text-muted">Buscar</label>
              <input
                class="form-control form-control-sm"
                placeholder="Cliente, email, propiedad..."
                [(ngModel)]="search"
                (keyup.enter)="aplicarQueryParams()"
              />
            </div>

            <div class="col-12 col-md-2 d-flex gap-2">
              <button
                class="btn btn-sm btn-primary flex-grow-1"
                (click)="aplicarQueryParams()"
                [disabled]="cargando"
              >
                Buscar
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                (click)="limpiarFiltros()"
                [disabled]="cargando"
                title="Limpiar filtros"
              >
                <span>✕</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla -->
      <div class="card shadow-sm" *ngIf="!cargando && !error">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0" *ngIf="reservas.length">
            <thead class="table-light">
              <tr>
                <th>Cliente</th>
                <th>Propiedad</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Creada</th>
                <th>Vence</th>
                <th class="text-end" style="width: 100px">Acciones</th>
              </tr>
            </thead>

            <tbody>
              <tr
                *ngFor="let r of reservas"
                class="reserva-row"
                (click)="verDetalle(r.id)"
              >
                <td>
                  <div class="fw-semibold">
                    {{ r.interesado?.nombre_completo || '—' }}
                  </div>
                  <div class="small text-muted">{{ r.interesado?.rut || '' }}</div>
                  <div class="small text-muted">{{ r.interesado?.email || '' }}</div>
                </td>

                <td>
                  <div class="fw-semibold">{{ r.propiedad?.titulo || '—' }}</div>
                  <div class="small text-muted" *ngIf="r.propiedad?.codigo">
                    Cód: {{ r.propiedad?.codigo }}
                  </div>
                </td>

                <td>
                  <span class="fw-semibold text-success">
                    {{ r.monto_reserva | currency:'CLP':'symbol-narrow':'1.0-0' }}
                  </span>
                </td>

                <td>
                  <span class="badge" [ngClass]="badgeClase(r.estado)">
                    {{ etiquetaReserva(r.estado) }}
                  </span>
                </td>

                <td class="small text-muted">{{ r.fecha | date:'dd/MM/yyyy' }}</td>
                <td class="small text-muted">
                  {{ r.expires_at ? (r.expires_at | date:'dd/MM/yyyy') : '—' }}
                </td>

                <td class="text-end">
                  <button
                    class="btn btn-sm btn-outline-primary"
                    (click)="$event.stopPropagation(); verDetalle(r.id)"
                  >
                    Ver
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div *ngIf="!reservas.length" class="text-center text-muted py-5">
            <div class="mb-2" style="font-size: 3rem;">📋</div>
            <p class="mb-0">No se encontraron reservas para los filtros seleccionados.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reserva-row {
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .reserva-row:hover {
      background-color: rgba(0, 123, 255, 0.05);
    }
    .card {
      border: none;
      border-radius: 0.5rem;
    }
    .badge {
      font-weight: 500;
      padding: 0.4em 0.8em;
    }
  `],
})
export class AdminReservasComponent implements OnInit {
  reservas: AdminReserva[] = [];
  todasReservas: AdminReserva[] = [];
  cargando = false;
  error: string | null = null;

  filtroEstado: FiltroEstado = 'TODAS';

  desde = '';
  hasta = '';
  search = '';
  propiedadId = '';
  returnTo: string | null = null;

  kpi = { total: 0, pendientes: 0, confirmadas: 0, canceladas: 0, expiradas: 0 };

  constructor(
    private svc: AdminReservasService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((qp) => {
      this.returnTo = (qp['returnTo'] || '').trim() || null;

      const estadoQP = (qp['estado'] || '').trim().toLowerCase();
      const permitidos = ['pendiente', 'confirmada', 'expirada', 'cancelada'];

      this.filtroEstado = (permitidos.includes(estadoQP)
        ? (estadoQP as FiltroEstado)
        : 'TODAS');

      this.desde = (qp['desde'] || '').trim();
      this.hasta = (qp['hasta'] || '').trim();
      this.search = (qp['search'] || '').trim();
      this.propiedadId = (qp['propiedad_id'] || '').trim();

      this.cargar();
    });
  }

  cambiarFiltro(estado: FiltroEstado): void {
    if (this.filtroEstado === estado) return;
    this.filtroEstado = estado;
    this.aplicarQueryParams();
  }

  aplicarQueryParams(): void {
    const qp: any = {
      estado: this.filtroEstado !== 'TODAS' ? this.filtroEstado : undefined,
      desde: this.desde || undefined,
      hasta: this.hasta || undefined,
      search: this.search?.trim() || undefined,
      propiedad_id: this.propiedadId?.trim() || undefined,
      returnTo: this.returnTo || undefined,
    };

    Object.keys(qp).forEach((k) => (qp[k] == null ? delete qp[k] : null));

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
    });
  }

  limpiarFiltros(): void {
    this.filtroEstado = 'TODAS';
    this.desde = '';
    this.hasta = '';
    this.search = '';
    this.propiedadId = '';
    this.aplicarQueryParams();
  }

  private cargar(): void {
    this.cargando = true;
    this.error = null;

    this.svc
      .listar(
        this.filtroEstado,
        {
          desde: this.desde,
          hasta: this.hasta,
          search: this.search,
          propiedad_id: this.propiedadId,
        }
      )
      .subscribe({
        next: (lista) => {
          this.reservas = Array.isArray(lista) ? lista : [];
          this.calcularKPIs(this.reservas);
          this.cargando = false;
        },
        error: (err) => {
          console.error(err);
          this.error = 'No se pudieron cargar las reservas.';
          this.cargando = false;
        },
      });
  }

  private calcularKPIs(reservas: AdminReserva[]): void {
    this.kpi.total = reservas.length;
    this.kpi.pendientes = reservas.filter(r => r.estado === 'pendiente').length;
    this.kpi.confirmadas = reservas.filter(r => r.estado === 'confirmada').length;
    this.kpi.canceladas = reservas.filter(r => r.estado === 'cancelada').length;
    this.kpi.expiradas = reservas.filter(r => r.estado === 'expirada').length;
  }

  etiquetaReserva(e: string): string {
    if (e === 'pendiente') return 'Pendiente';
    if (e === 'confirmada') return 'Confirmada';
    if (e === 'cancelada') return 'Cancelada';
    if (e === 'expirada') return 'Expirada';
    return e || '—';
  }

  badgeClase(estado: string): string {
    if (estado === 'pendiente') return 'text-bg-warning';
    if (estado === 'confirmada') return 'text-bg-success';
    if (estado === 'cancelada') return 'text-bg-secondary';
    if (estado === 'expirada') return 'text-bg-dark';
    return 'text-bg-light text-dark border';
  }

  verDetalle(id: number): void {
    const qp: any = {};
    if (this.returnTo) qp.returnTo = this.returnTo;

    this.router.navigate(['/admin/reservas', id], { queryParams: qp });
  }

  volverAReportes(): void {
    if (this.returnTo) this.router.navigateByUrl(this.returnTo);
    else this.router.navigate(['/admin/reportes']);
  }

  irPanel(): void {
    this.router.navigate(['/admin']);
  }
}
