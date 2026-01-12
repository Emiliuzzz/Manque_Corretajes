import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  SolicitudesAdminService,
  AdminSolicitud,
} from '../../core/services/solicitudes-admin.service';

type FiltroEstado =
  | 'todas'
  | 'nueva'
  | 'en_proceso'
  | 'respondida'
  | 'cerrada';

@Component({
  standalone: true,
  selector: 'app-admin-solicitudes',
  imports: [CommonModule],
  template: `
    <div class="container my-4">
      <h2 class="mb-3">Solicitudes de clientes</h2>
      <p class="text-muted mb-3">
        Desde esta pantalla el administrador puede revisar las solicitudes
        enviadas por los clientes y cambiar su estado.
      </p>

      <div *ngIf="cargando" class="alert alert-info">
        Cargando solicitudes...
      </div>
      <div *ngIf="error" class="alert alert-danger">
        {{ error }}
      </div>

      <ng-container *ngIf="!cargando && !error">
        <div class="d-flex flex-wrap align-items-center mb-3 gap-2">
          <span class="me-2">Filtrar por estado:</span>
          <button
            class="btn btn-sm"
            [ngClass]="
              filtroEstado === 'todas'
                ? 'btn-primary'
                : 'btn-outline-primary'
            "
            (click)="setFiltro('todas')"
          >
            Todas
          </button>
          <button
            class="btn btn-sm"
            [ngClass]="
              filtroEstado === 'nueva'
                ? 'btn-primary'
                : 'btn-outline-primary'
            "
            (click)="setFiltro('nueva')"
          >
            Nuevas
          </button>
          <button
            class="btn btn-sm"
            [ngClass]="
              filtroEstado === 'en_proceso'
                ? 'btn-primary'
                : 'btn-outline-primary'
            "
            (click)="setFiltro('en_proceso')"
          >
            En proceso
          </button>
          <button
            class="btn btn-sm"
            [ngClass]="
              filtroEstado === 'respondida'
                ? 'btn-primary'
                : 'btn-outline-primary'
            "
            (click)="setFiltro('respondida')"
          >
            Respondidas
          </button>
          <button
            class="btn btn-sm"
            [ngClass]="
              filtroEstado === 'cerrada'
                ? 'btn-primary'
                : 'btn-outline-primary'
            "
            (click)="setFiltro('cerrada')"
          >
            Cerradas
          </button>
        </div>

        <div
          *ngIf="solicitudesFiltradas.length === 0"
          class="alert alert-info"
        >
          No hay solicitudes para el filtro seleccionado.
        </div>

        <div class="table-responsive" *ngIf="solicitudesFiltradas.length > 0">
          <table class="table table-striped align-middle">
            <thead class="table-light">
              <tr>
                <th>Cliente</th>
                <th>Operación / Propiedad</th>
                <th>Ubicación</th>
                <th>Presupuesto</th>
                <th>Estado</th>
                <th>Creada</th>
                <th class="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of solicitudesFiltradas">
                <td>
                  <div class="fw-semibold">
                    {{ s.interesado?.nombre_completo }}
                  </div>
                  <div class="text-muted small">
                    {{ s.interesado?.rut }} · {{ s.interesado?.email }}
                  </div>
                </td>
                <td>
                  <div>{{ s.tipo_operacion }} · {{ s.tipo_propiedad }}</div>
                  <div class="text-muted small">
                    {{
                      (s.mensaje || '').length > 60
                        ? (s.mensaje | slice : 0 : 60) + '...'
                        : s.mensaje
                    }}
                  </div>
                </td>
                <td>
                  {{ s.ciudad }}<br />
                  <span class="text-muted small">{{ s.comuna }}</span>
                </td>
                <td>
                  <div
                    *ngIf="s.presupuesto_min || s.presupuesto_max; else sinPresupuesto"
                  >
                    <div *ngIf="s.presupuesto_min">
                      Min:
                      {{
                        s.presupuesto_min
                          | currency : 'CLP' : 'symbol-narrow'
                      }}
                    </div>
                    <div *ngIf="s.presupuesto_max">
                      Max:
                      {{
                        s.presupuesto_max
                          | currency : 'CLP' : 'symbol-narrow'
                      }}
                    </div>
                  </div>
                  <ng-template #sinPresupuesto>
                    <span class="text-muted small">No especificado</span>
                  </ng-template>
                </td>
                <td>
                  <span
                    class="badge"
                    [ngClass]="{
                      'bg-secondary': s.estado === 'nueva',
                      'bg-info': s.estado === 'en_proceso',
                      'bg-success': s.estado === 'respondida',
                      'bg-dark': s.estado === 'cerrada'
                    }"
                  >
                    {{ s.estado | titlecase }}
                  </span>
                </td>
                <td>
                  {{ s.created_at | date : 'short' }}
                </td>
                <td class="text-end">
                  <div class="btn-group btn-group-sm">
                    <button
                      class="btn btn-outline-info"
                      (click)="cambiarEstado(s, 'en_proceso')"
                      [disabled]="actualizandoId === s.id"
                    >
                      En proceso
                    </button>
                    <button
                      class="btn btn-outline-success"
                      (click)="cambiarEstado(s, 'respondida')"
                      [disabled]="actualizandoId === s.id"
                    >
                      Respondida
                    </button>
                    <button
                      class="btn btn-outline-dark"
                      (click)="cambiarEstado(s, 'cerrada')"
                      [disabled]="actualizandoId === s.id"
                    >
                      Cerrada
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </div>
  `,
})
export class AdminSolicitudesComponent implements OnInit {
  solicitudes: AdminSolicitud[] = [];
  solicitudesFiltradas: AdminSolicitud[] = [];
  filtroEstado: FiltroEstado = 'todas';

  cargando = false;
  error: string | null = null;
  actualizandoId: number | null = null;

  constructor(private svc: SolicitudesAdminService) {}

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando = true;
    this.error = null;
    this.svc.getSolicitudes().subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.aplicarFiltro();
        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error al cargar las solicitudes de clientes.';
        this.cargando = false;
      },
    });
  }

  setFiltro(f: FiltroEstado): void {
    this.filtroEstado = f;
    this.aplicarFiltro();
  }

  private aplicarFiltro(): void {
    this.solicitudesFiltradas =
      this.filtroEstado === 'todas'
        ? [...this.solicitudes]
        : this.solicitudes.filter((s) => s.estado === this.filtroEstado);
  }

  cambiarEstado(sol: AdminSolicitud, nuevoEstado: string): void {
    if (sol.estado === nuevoEstado) return;

    this.actualizandoId = sol.id;
    this.svc.actualizarEstado(sol.id, nuevoEstado).subscribe({
      next: (actualizada) => {
        const idx = this.solicitudes.findIndex((s) => s.id === sol.id);
        if (idx !== -1) {
          this.solicitudes[idx] = actualizada;
        }
        this.aplicarFiltro();
        this.actualizandoId = null;
      },
      error: (err) => {
        console.error(err);
        alert('No se pudo actualizar el estado de la solicitud.');
        this.actualizandoId = null;
      },
    });
  }
}
