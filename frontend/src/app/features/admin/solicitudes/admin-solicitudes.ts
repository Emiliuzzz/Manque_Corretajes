import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AdminSolicitudesService,
  AdminSolicitud,
  SolicitudesKPI,
} from '../../../core/services/admin-solicitudes.service';

type FiltroEstado = 'TODAS' | 'nueva' | 'en_proceso' | 'respondida' | 'cerrada';

@Component({
  standalone: true,
  selector: 'app-admin-solicitudes',
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container my-4">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
        <div>
          <h2 class="mb-1">Solicitudes de clientes</h2>
          <p class="text-muted mb-0">
            Revisa solicitudes, agrega notas internas, cambia estado y responde por correo.
          </p>
        </div>

        <div class="d-flex gap-2">
          <button
            *ngIf="returnTo"
            type="button"
            class="btn btn-outline-secondary btn-sm"
            (click)="volverAReportes()"
          >
            ← Volver a reportes
          </button>

          <button type="button" class="btn btn-outline-dark btn-sm" (click)="irPanel()">
            Panel admin
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="row g-2 mt-3 mb-4" *ngIf="kpi">
        <div class="col-12 col-md-2">
          <div class="card shadow-sm h-100" style="cursor:pointer;" (click)="cambiarFiltro('TODAS')">
            <div class="card-body py-2 text-center">
              <div class="text-muted small">Total</div>
              <div class="h4 mb-0 fw-bold">{{ kpi.total }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="card shadow-sm h-100 border-success" style="cursor:pointer;" (click)="cambiarFiltro('nueva')">
            <div class="card-body py-2 text-center">
              <div class="text-success small fw-semibold">Nuevas</div>
              <div class="h4 mb-0 text-success">{{ kpi.nuevas }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="card shadow-sm h-100 border-warning" style="cursor:pointer;" (click)="cambiarFiltro('en_proceso')">
            <div class="card-body py-2 text-center">
              <div class="text-warning small fw-semibold">En proceso</div>
              <div class="h4 mb-0 text-warning">{{ kpi.en_proceso }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="card shadow-sm h-100 border-info" style="cursor:pointer;" (click)="cambiarFiltro('respondida')">
            <div class="card-body py-2 text-center">
              <div class="text-info small fw-semibold">Respondidas</div>
              <div class="h4 mb-0 text-info">{{ kpi.respondidas }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <div class="card shadow-sm h-100 border-secondary" style="cursor:pointer;" (click)="cambiarFiltro('cerrada')">
            <div class="card-body py-2 text-center">
              <div class="text-secondary small fw-semibold">Cerradas</div>
              <div class="h4 mb-0 text-secondary">{{ kpi.cerradas }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mensajes -->
      <div *ngIf="cargando" class="alert alert-info">Cargando solicitudes...</div>
      <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

      <!-- Filtros + búsqueda -->
      <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
        <span class="me-2 fw-semibold">Filtro Estado:</span>

        <button type="button" class="btn btn-sm"
          [ngClass]="{'btn-primary': filtroEstado==='TODAS','btn-outline-primary': filtroEstado!=='TODAS'}"
          (click)="cambiarFiltro('TODAS')">Todas</button>

        <button type="button" class="btn btn-sm"
          [ngClass]="{'btn-success': filtroEstado==='nueva','btn-outline-success': filtroEstado!=='nueva'}"
          (click)="cambiarFiltro('nueva')">Nuevas</button>

        <button type="button" class="btn btn-sm"
          [ngClass]="{'btn-warning': filtroEstado==='en_proceso','btn-outline-warning': filtroEstado!=='en_proceso'}"
          (click)="cambiarFiltro('en_proceso')">En proceso</button>

        <button type="button" class="btn btn-sm"
          [ngClass]="{'btn-info': filtroEstado==='respondida','btn-outline-info': filtroEstado!=='respondida'}"
          (click)="cambiarFiltro('respondida')">Respondidas</button>

        <button type="button" class="btn btn-sm"
          [ngClass]="{'btn-secondary': filtroEstado==='cerrada','btn-outline-secondary': filtroEstado!=='cerrada'}"
          (click)="cambiarFiltro('cerrada')">Cerradas</button>
      </div>

      <!-- Rango de fechas + búsqueda -->
      <div class="d-flex flex-wrap align-items-end gap-2 mb-3">
        <div style="max-width: 180px;">
          <label class="form-label small mb-1">Desde</label>
          <input class="form-control form-control-sm" type="date" [(ngModel)]="desde" (change)="aplicarQueryParams()" />
        </div>

        <div style="max-width: 180px;">
          <label class="form-label small mb-1">Hasta</label>
          <input class="form-control form-control-sm" type="date" [(ngModel)]="hasta" (change)="aplicarQueryParams()" />
        </div>

        <div class="ms-auto d-flex gap-2 align-items-center">
          <input
            class="form-control form-control-sm"
            style="max-width: 260px;"
            placeholder="Buscar (nombre, email, ciudad...)"
            [(ngModel)]="search"
            (keyup.enter)="aplicarQueryParams()"
          />
          <button class="btn btn-sm btn-outline-dark" (click)="aplicarQueryParams()" [disabled]="cargando">
            Buscar
          </button>

          <button class="btn btn-sm btn-outline-secondary" (click)="limpiarFiltros()" [disabled]="cargando">
            Limpiar
          </button>
        </div>
      </div>

      <!-- Tabla -->
      <div class="table-responsive" *ngIf="!cargando && solicitudes.length">
        <table class="table align-middle table-hover">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Operación</th>
              <th>Ubicación</th>
              <th>Presupuesto</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>

          <tbody>
            <tr *ngFor="let s of solicitudes" (click)="verDetalle(s)" style="cursor:pointer;">

              <td>
                <div class="fw-semibold">{{ s.interesado?.nombre_completo || '—' }}</div>
                <div class="small text-muted">{{ s.interesado?.email || '' }}</div>
                <div class="small text-muted">{{ s.interesado?.rut || '' }}</div>
              </td>

              <td>
                <div class="fw-semibold">{{ s.tipo_operacion }}</div>
                <div class="small text-muted">{{ s.tipo_propiedad }}</div>
              </td>

              <td>
                <div class="fw-semibold">{{ s.ciudad }}</div>
                <div class="small text-muted">{{ s.comuna }}</div>
              </td>

              <td>
                <div class="small">
                  <span class="text-muted">Min:</span>
                  {{ s.presupuesto_min ? (s.presupuesto_min | currency:'CLP':'symbol-narrow':'1.0-0') : '—' }}
                </div>
                <div class="small">
                  <span class="text-muted">Max:</span>
                  {{ s.presupuesto_max ? (s.presupuesto_max | currency:'CLP':'symbol-narrow':'1.0-0') : '—' }}
                </div>
              </td>

              <td>
                <span class="badge" [ngClass]="badgeEstado(s.estado)">
                  {{ etiquetaEstado(s.estado) }}
                </span>
              </td>

              <td class="small">{{ s.created_at | date:'short' }}</td>

            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="!cargando && !solicitudes.length && !error" class="alert alert-light">
        No se encontraron solicitudes para el filtro seleccionado.
      </div>
    </div>
  `,
})
export class AdminSolicitudesComponent implements OnInit {
  solicitudes: AdminSolicitud[] = [];
  cargando = false;
  error: string | null = null;
  kpi: SolicitudesKPI | null = {
    total: 0,
    nuevas: 0,
    en_proceso: 0,
    respondidas: 0,
    cerradas: 0
  };

  filtroEstado: FiltroEstado = 'TODAS';
  search = '';

  // nuevos
  desde = '';
  hasta = '';
  propiedadId = ''; // opcional si quieres filtrar por propiedad
  returnTo: string | null = null;

  constructor(
    private svc: AdminSolicitudesService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Lee query params (cuando vienes desde reportes)
    this.route.queryParams.subscribe((qp) => {
      this.cargarKPIs(); // Recargar KPIs al navegar/volver

      this.returnTo = (qp['returnTo'] || '').trim() || null;

      const estadoQP = (qp['estado'] || '').trim();
      this.filtroEstado = this.mapEstadoToFiltro(estadoQP);

      this.desde = (qp['desde'] || '').trim();
      this.hasta = (qp['hasta'] || '').trim();
      this.search = (qp['search'] || '').trim();

      this.propiedadId = (qp['propiedad_id'] || '').trim();

      this.cargar();
    });
  }

  cargarKPIs(): void {
    this.svc.getKPIs().subscribe({
      next: (k) => {
        console.log('KPIs cargados:', k);
        this.kpi = k;
      },
      error: (e) => console.error('Error cargando KPIs:', e),
    });
  }


  private mapEstadoToFiltro(estado: string): FiltroEstado {
    // estado puede venir como 'nueva' o 'NUEVAS' dependiendo de quién navega
    const e = (estado || '').toLowerCase();
    if (!e) return 'TODAS';
    if (e.includes('nueva')) return 'nueva';
    if (e.includes('proceso')) return 'en_proceso';
    if (e.includes('respond')) return 'respondida';
    if (e.includes('cerr')) return 'cerrada';
    return 'TODAS';
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

    // limpia undefined
    Object.keys(qp).forEach((k) => (qp[k] == null ? delete qp[k] : null));

    this.router.navigate([], { relativeTo: this.route, queryParams: qp });
    // NO llames cargar() aquí: lo hará el subscribe de queryParams
  }

  limpiarFiltros(): void {
    this.filtroEstado = 'TODAS';
    this.desde = '';
    this.hasta = '';
    this.search = '';
    this.propiedadId = '';
    this.aplicarQueryParams();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;

    this.svc.listar({
      estado: this.filtroEstado,
      search: this.search,
      desde: this.desde,
      hasta: this.hasta,
      propiedad_id: this.propiedadId,
    }).subscribe({
      next: (lista) => {
        this.solicitudes = Array.isArray(lista) ? lista : [];
        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudieron cargar las solicitudes.';
        this.cargando = false;
      },
    });
  }

  verDetalle(s: AdminSolicitud): void {
    // IMPORTANTE: pasa returnTo para volver a reportes desde el detalle
    const qp: any = {};
    if (this.returnTo) qp.returnTo = this.returnTo;

    this.router.navigate(['/admin/solicitudes', s.id], { queryParams: qp });
  }

  volverAReportes(): void {
    if (this.returnTo) this.router.navigateByUrl(this.returnTo);
    else this.router.navigate(['/admin/reportes']);
  }

  irPanel(): void {
    this.router.navigate(['/admin']);
  }

  etiquetaEstado(estado: string): string {
    if (estado === 'nueva') return 'Nueva';
    if (estado === 'en_proceso') return 'En proceso';
    if (estado === 'respondida') return 'Respondida';
    if (estado === 'cerrada') return 'Cerrada';
    return estado || '—';
  }

  badgeEstado(estado: string): string {
    switch (estado) {
      case 'nueva':
        return 'text-bg-success';
      case 'en_proceso':
        return 'text-bg-warning';
      case 'respondida':
        return 'text-bg-info';
      case 'cerrada':
        return 'text-bg-secondary';
      default:
        return 'text-bg-light text-dark border';
    }
  }
}
