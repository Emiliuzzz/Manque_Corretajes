import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AdminPropiedadesService,
  AdminPropiedadResumen,
  EstadoAprobacion,
} from '../../core/services/admin-propiedades.service';

type Orden = 'id_desc' | 'id_asc' | 'precio_desc' | 'precio_asc' | 'ciudad_asc' | 'ciudad_desc';

@Component({
  standalone: true,
  selector: 'app-admin-propiedades-list',
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container my-4">

      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
        <div>
          <h2 class="mb-1">Propiedades (administrador)</h2>
          <p class="text-muted mb-0">
            Panel de gestión: filtra, busca, aprueba y administra propiedades.
          </p>
        </div>

        <div class="d-flex gap-2">
          <button type="button" class="btn btn-outline-secondary" (click)="irPanel()">
            ← Volver al panel
          </button>

          <button class="btn btn-primary" [routerLink]="['/admin/propiedades/nueva']">
            Crear nueva propiedad
          </button>
        </div>
      </div>

      <!-- Estados -->
      <div *ngIf="cargando" class="alert alert-info mt-3">Cargando propiedades...</div>
      <div *ngIf="error" class="alert alert-danger mt-3">{{ error }}</div>

      <!-- KPIs -->
      <div class="row g-2 mt-2" *ngIf="!cargando && !error">
        <div class="col-12 col-md-3">
          <div class="card shadow-sm" style="cursor:pointer;" (click)="aplicarPreset('todas')">
            <div class="card-body py-3">
              <div class="text-muted small">Total</div>
              <div class="h4 mb-0">{{ kpi.total }}</div>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-3">
          <div class="card shadow-sm" style="cursor:pointer;" (click)="aplicarPreset('pendientes')">
            <div class="card-body py-3">
              <div class="text-muted small">Pendientes</div>
              <div class="h4 mb-0">{{ kpi.pendientes }}</div>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-3">
          <div class="card shadow-sm" style="cursor:pointer;" (click)="aplicarPreset('aprobadas')">
            <div class="card-body py-3">
              <div class="text-muted small">Aprobadas</div>
              <div class="h4 mb-0">{{ kpi.aprobadas }}</div>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-3">
          <div class="card shadow-sm" style="cursor:pointer;" (click)="aplicarPreset('reservadas')">
            <div class="card-body py-3">
              <div class="text-muted small">Reservadas</div>
              <div class="h4 mb-0">{{ kpi.reservadas }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="card shadow-sm mt-3" *ngIf="!cargando && !error">
        <div class="card-body">
          <div class="row g-2 align-items-end">

            <div class="col-12 col-lg-4">
              <label class="form-label small text-muted">Buscar</label>
              <input
                class="form-control"
                placeholder="Título, propietario, RUT, email, ciudad..."
                [(ngModel)]="search"
                (keyup.enter)="aplicarFiltros()"
              />
            </div>

            <div class="col-6 col-lg-2">
              <label class="form-label small text-muted">Estado</label>
              <select class="form-select" [(ngModel)]="fEstado" (change)="aplicarFiltros()">
                <option value="">Todos</option>
                <option value="disponible">Disponible</option>
                <option value="reservada">Reservada</option>
                <option value="arrendada">Arrendada</option>
                <option value="vendida">Vendida</option>
              </select>
            </div>

            <div class="col-6 col-lg-2">
              <label class="form-label small text-muted">Aprobación</label>
              <select class="form-select" [(ngModel)]="fAprob" (change)="aplicarFiltros()">
                <option value="">Todas</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
                <option value="pausada">Pausada</option>
              </select>
            </div>

            <div class="col-6 col-lg-2">
              <label class="form-label small text-muted">Tipo</label>
              <select class="form-select" [(ngModel)]="fTipo" (change)="aplicarFiltros()">
                <option value="">Todos</option>
                <option *ngFor="let t of tiposDisponibles" [value]="t">{{ t | titlecase }}</option>
              </select>
            </div>

            <div class="col-6 col-lg-2">
              <label class="form-label small text-muted">Orden</label>
              <select class="form-select" [(ngModel)]="orden" (change)="aplicarFiltros()">
                <option value="id_desc">Más nuevas</option>
                <option value="id_asc">Más antiguas</option>
                <option value="precio_desc">Precio: mayor</option>
                <option value="precio_asc">Precio: menor</option>
                <option value="ciudad_asc">Ciudad: A–Z</option>
                <option value="ciudad_desc">Ciudad: Z–A</option>
              </select>
            </div>

            <div class="col-12 d-flex justify-content-end gap-2 mt-2">
              <button class="btn btn-outline-dark" (click)="aplicarFiltros()">Aplicar</button>
              <button class="btn btn-outline-secondary" (click)="limpiar()">Limpiar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabla -->
      <div class="mt-3" *ngIf="!cargando && !error">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <div class="text-muted small">
            Mostrando {{ desde }}–{{ hasta }} de {{ totalFiltrado }}
          </div>

          <div class="d-flex gap-2 align-items-center">
            <span class="text-muted small">Por página</span>
            <select class="form-select form-select-sm" style="width:90px" [(ngModel)]="pageSize" (change)="irPagina(1)">
              <option [ngValue]="10">10</option>
              <option [ngValue]="25">25</option>
              <option [ngValue]="50">50</option>
            </select>
          </div>
        </div>

        <div class="table-responsive" *ngIf="pageItems.length > 0; else sinDatos">
          <table class="table align-middle table-hover">
            <thead class="table-light">
              <tr>
                <th>Propiedad</th>
                <th>Propietario</th>
                <th>Ciudad</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Aprobación</th>
                <th style="width:220px" class="text-end">Acciones</th>
              </tr>
            </thead>

            <tbody>
              <tr *ngFor="let p of pageItems">

                <td>
                  <div class="fw-semibold">{{ p.titulo }}</div>
                  <div class="small text-muted">
                    {{ p.tipo | titlecase }}
                  </div>
                </td>

                <td>
                  <div class="fw-semibold">
                    {{ p.propietario?.primer_nombre }} {{ p.propietario?.primer_apellido }}
                  </div>
                  <div class="small text-muted">
                    {{ p.propietario?.rut }} · {{ p.propietario?.email }}
                  </div>
                </td>

                <td>{{ p.ciudad }}</td>

                <td class="fw-semibold">
                  {{ p.precio | currency:'CLP':'symbol-narrow':'1.0-0' }}
                </td>

                <td>
                  <span class="badge" [ngClass]="badgeEstado(p.estado)">
                    {{ (p.estado || '—') | titlecase }}
                  </span>
                </td>

                <td>
                  <span class="badge" [ngClass]="badgeAprob(p.estado_aprobacion)">
                    {{ (p.estado_aprobacion || '—') | titlecase }}
                  </span>
                </td>

                <td class="text-end">
                  <!-- Aprobar/Rechazar solo si pendiente -->
                  <button
                    *ngIf="p.estado_aprobacion === 'pendiente'"
                    class="btn btn-sm btn-success me-2"
                    (click)="cambiarAprobacion(p, 'aprobada')"
                  >
                    Aprobar
                  </button>

                  <button
                    *ngIf="p.estado_aprobacion === 'pendiente'"
                    class="btn btn-sm btn-danger me-2"
                    (click)="cambiarAprobacion(p, 'rechazada')"
                  >
                    Rechazar
                  </button>

                  <button
                    class="btn btn-sm btn-outline-primary me-2"
                    [routerLink]="['/propietario/propiedad', p.id, 'fotos']"
                    [queryParams]="{ returnUrl: '/admin/propiedades' }"
                  >
                    {{ p.tiene_fotos ? 'Gestionar fotos' : 'Subir fotos' }}
                  </button>


                  <button
                    class="btn btn-sm btn-outline-secondary"
                    (click)="verDetalle(p.id)"
                  >
                    Ver / editar
                  </button>
                  <button
                    class="btn btn-sm btn-outline-dark me-2"
                    (click)="$event.stopPropagation(); verHistorial(p.id)"
                  >
                    Historial
                  </button>

                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ng-template #sinDatos>
          <div class="alert alert-light">No hay propiedades con los filtros seleccionados.</div>
        </ng-template>

        <!-- Paginación -->
        <div class="d-flex justify-content-center mt-3" *ngIf="totalPages > 1">
          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" [class.disabled]="page === 1">
                <button class="page-link" (click)="irPagina(page - 1)">Anterior</button>
              </li>

              <li class="page-item" *ngFor="let n of paginas" [class.active]="n === page">
                <button class="page-link" (click)="irPagina(n)">{{ n }}</button>
              </li>

              <li class="page-item" [class.disabled]="page === totalPages">
                <button class="page-link" (click)="irPagina(page + 1)">Siguiente</button>
              </li>
            </ul>
          </nav>
        </div>

      </div>
    </div>
  `,
})
export class AdminPropiedadesListComponent implements OnInit {
  // data
  todas: AdminPropiedadResumen[] = [];
  filtradas: AdminPropiedadResumen[] = [];
  pageItems: AdminPropiedadResumen[] = [];

  // ui state
  cargando = false;
  error: string | null = null;

  // filtros
  search = '';
  fEstado = '';
  fAprob: '' | EstadoAprobacion = '';
  fTipo = '';
  orden: Orden = 'id_desc';

  // pagination
  page = 1;
  pageSize = 10;
  totalPages = 1;

  // computed
  tiposDisponibles: string[] = [];
  kpi = { total: 0, pendientes: 0, aprobadas: 0, reservadas: 0 };

  constructor(private svc: AdminPropiedadesService, private router: Router) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;

    this.svc.listar().subscribe({
      next: (data) => {
        this.todas = Array.isArray(data) ? data : [];
        this.tiposDisponibles = this.extraerTipos(this.todas);
        this.recalcularKPIs();
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudieron cargar las propiedades.';
        this.cargando = false;
      },
    });
  }

  // ---------- UI helpers ----------
  irPanel(): void {
    this.router.navigate(['/admin']);
  }

  verDetalle(id: number): void {
    this.router.navigate(['/admin/propiedades', id]);
  }

  limpiar(): void {
    this.search = '';
    this.fEstado = '';
    this.fAprob = '';
    this.fTipo = '';
    this.orden = 'id_desc';
    this.aplicarFiltros();
  }

  aplicarPreset(preset: 'todas' | 'pendientes' | 'aprobadas' | 'reservadas'): void {
    if (preset === 'todas') {
      this.fAprob = '';
      this.fEstado = '';
    }
    if (preset === 'pendientes') {
      this.fAprob = 'pendiente';
      this.fEstado = '';
    }
    if (preset === 'aprobadas') {
      this.fAprob = 'aprobada';
      this.fEstado = '';
    }
    if (preset === 'reservadas') {
      this.fEstado = 'reservada';
      this.fAprob = '';
    }
    this.aplicarFiltros();
  }

  // ---------- filtros / búsqueda / orden ----------
  aplicarFiltros(): void {
    const q = (this.search || '').trim().toLowerCase();

    let arr = [...this.todas];

    // Estado
    if (this.fEstado) {
      arr = arr.filter((p) => (p.estado || '').toLowerCase() === this.fEstado.toLowerCase());
    }

    // Aprobación
    if (this.fAprob) {
      arr = arr.filter((p) => p.estado_aprobacion === this.fAprob);
    }

    // Tipo
    if (this.fTipo) {
      arr = arr.filter((p) => (p.tipo || '').toLowerCase() === this.fTipo.toLowerCase());
    }

    // Search
    if (q) {
      arr = arr.filter((p) => {
        const propietario = `${p.propietario?.primer_nombre || ''} ${p.propietario?.primer_apellido || ''}`.toLowerCase();
        const rut = (p.propietario?.rut || '').toLowerCase();
        const email = (p.propietario?.email || '').toLowerCase();
        const ciudad = (p.ciudad || '').toLowerCase();
        const titulo = (p.titulo || '').toLowerCase();
        const tipo = (p.tipo || '').toLowerCase();
        return (
          titulo.includes(q) ||
          propietario.includes(q) ||
          rut.includes(q) ||
          email.includes(q) ||
          ciudad.includes(q) ||
          tipo.includes(q)
        );
      });
    }

    // Orden
    arr.sort((a, b) => this.compararOrden(a, b));

    this.filtradas = arr;
    this.irPagina(1);
  }

  private toNumber(v: any): number {
    if (v === null || v === undefined) return 0;

    const s = String(v).replace(/\./g, '').replace(',', '.');

    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  private compararOrden(a: AdminPropiedadResumen, b: AdminPropiedadResumen): number {
    if (this.orden === 'precio_desc') return this.toNumber(b.precio) - this.toNumber(a.precio);
    if (this.orden === 'precio_asc') return this.toNumber(a.precio) - this.toNumber(b.precio);
    if (this.orden === 'id_desc') return (b.id ?? 0) - (a.id ?? 0);
    if (this.orden === 'id_asc') return (a.id ?? 0) - (b.id ?? 0);
    if (this.orden === 'ciudad_asc') return (a.ciudad || '').localeCompare(b.ciudad || '');
    if (this.orden === 'ciudad_desc') return (b.ciudad || '').localeCompare(a.ciudad || '');
    return 0;
  }

  // ---------- paginación ----------
  irPagina(n: number): void {
    const total = this.filtradas.length;
    this.totalPages = Math.max(1, Math.ceil(total / this.pageSize));
    this.page = Math.min(Math.max(1, n), this.totalPages);

    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pageItems = this.filtradas.slice(start, end);
  }

  get paginas(): number[] {
    // paginación corta: hasta 7 páginas visible
    const max = 7;
    const total = this.totalPages;
    if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);

    const half = Math.floor(max / 2);
    let start = Math.max(1, this.page - half);
    let end = Math.min(total, start + max - 1);
    start = Math.max(1, end - max + 1);

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  get totalFiltrado(): number {
    return this.filtradas.length;
  }

  get desde(): number {
    if (!this.totalFiltrado) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get hasta(): number {
    return Math.min(this.page * this.pageSize, this.totalFiltrado);
  }

  // ---------- KPIs ----------
  private recalcularKPIs(): void {
    const all = this.todas;
    this.kpi.total = all.length;
    this.kpi.pendientes = all.filter((p) => p.estado_aprobacion === 'pendiente').length;
    this.kpi.aprobadas = all.filter((p) => p.estado_aprobacion === 'aprobada').length;
    this.kpi.reservadas = all.filter((p) => (p.estado || '').toLowerCase() === 'reservada').length;
  }

  private extraerTipos(arr: AdminPropiedadResumen[]): string[] {
    const set = new Set<string>();
    for (const p of arr) {
      const t = (p.tipo || '').trim().toLowerCase();
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  // ---------- badges ----------
  badgeAprob(ap: string): string {
    if (ap === 'pendiente') return 'bg-warning text-dark';
    if (ap === 'aprobada') return 'bg-success';
    if (ap === 'rechazada') return 'bg-danger';
    if (ap === 'pausada') return 'bg-secondary';
    return 'bg-light text-dark border';
  }

  badgeEstado(est: string): string {
    const e = (est || '').toLowerCase();
    if (e === 'disponible') return 'bg-success';
    if (e === 'reservada') return 'bg-warning text-dark';
    if (e === 'arrendada') return 'bg-info text-dark';
    if (e === 'vendida') return 'bg-secondary';
    return 'bg-light text-dark border';
  }

  // ---------- acciones ----------
  cambiarAprobacion(prop: AdminPropiedadResumen, nuevo: EstadoAprobacion): void {
    if (!confirm(`¿Seguro que quieres marcar "${prop.titulo}" como ${nuevo}?`)) return;

    this.svc.cambiarEstadoAprobacion(prop.id, nuevo).subscribe({
      next: () => {
        prop.estado_aprobacion = nuevo;
        this.recalcularKPIs();
        this.aplicarFiltros();
      },
      error: (err) => {
        console.error(err);
        alert('No se pudo actualizar el estado de aprobación.');
      },
    });
  }
  verHistorial(id: number): void {
    this.router.navigate(['/admin/propiedades', id, 'historial']);
  }
}
