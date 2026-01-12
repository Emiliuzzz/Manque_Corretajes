import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AdminSolicitudesService,
  AdminSolicitud,
  EstadoSolicitud,
} from '../../../core/services/admin-solicitudes.service';

@Component({
  standalone: true,
  selector: 'app-admin-solicitud-detalle',
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container py-4" *ngIf="solicitud">
      <div class="d-flex flex-wrap gap-2 mb-3">
        <button type="button" class="btn btn-outline-secondary" (click)="volver()">Volver</button>
        <button type="button" class="btn btn-outline-dark" (click)="irPanel()">Panel admin</button>
      </div>

      <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h1 class="h4 mb-1">
            Solicitud #{{ solicitud.id }}
            <span class="badge ms-2" [ngClass]="badgeEstado(solicitud.estado)">
              {{ etiquetaEstado(solicitud.estado) }}
            </span>
          </h1>
          <p class="text-muted mb-0">
            Creada el {{ solicitud.created_at | date:'short' }}
          </p>
        </div>

        <!-- Cambiar estado -->
        <div class="d-flex align-items-center gap-2">
          <select class="form-select form-select-sm" style="min-width: 160px;" [(ngModel)]="nuevoEstado">
            <option [ngValue]="'nueva'">Nueva</option>
            <option [ngValue]="'en_proceso'">En proceso</option>
            <option [ngValue]="'respondida'">Respondida</option>
            <option [ngValue]="'cerrada'">Cerrada</option>
          </select>

          <button class="btn btn-sm btn-primary" (click)="guardarEstado()" [disabled]="guardandoEstado">
            Guardar estado
          </button>
        </div>
      </div>

      <div class="row g-3">
        <!-- Cliente -->
        <div class="col-12 col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title mb-3">Cliente</h5>

              <ng-container *ngIf="solicitud.interesado; else sinCliente">
                <div class="fw-semibold">{{ solicitud.interesado?.nombre_completo || 'Sin nombre' }}</div>
                <div class="small text-muted">RUT: {{ solicitud.interesado?.rut || '—' }}</div>
                <div class="small">Teléfono: {{ solicitud.interesado?.telefono || '—' }}</div>
                <div class="small">Email: {{ solicitud.interesado?.email || '—' }}</div>
              </ng-container>

              <ng-template #sinCliente>
                <p class="text-muted mb-0">No hay información de cliente asociada.</p>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- Criterios -->
        <div class="col-12 col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title mb-3">Criterios</h5>

              <div class="mb-2">
                <div class="text-muted small">Operación</div>
                <div class="fw-semibold">{{ solicitud.tipo_operacion }}</div>
              </div>

              <div class="mb-2">
                <div class="text-muted small">Tipo de propiedad</div>
                <div class="fw-semibold">{{ solicitud.tipo_propiedad }}</div>
              </div>

              <div class="mb-2">
                <div class="text-muted small">Ubicación</div>
                <div class="fw-semibold">{{ solicitud.ciudad }} • {{ solicitud.comuna }}</div>
              </div>

              <div>
                <div class="text-muted small">Presupuesto</div>
                <div class="small">
                  Min:
                  {{ solicitud.presupuesto_min ? (solicitud.presupuesto_min | currency:'CLP':'symbol-narrow':'1.0-0') : '—' }}
                </div>
                <div class="small">
                  Max:
                  {{ solicitud.presupuesto_max ? (solicitud.presupuesto_max | currency:'CLP':'symbol-narrow':'1.0-0') : '—' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mensaje -->
        <div class="col-12 col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title mb-3">Mensaje del cliente</h5>
              <p class="mb-0" *ngIf="solicitud.mensaje; else sinMsg">{{ solicitud.mensaje }}</p>
              <ng-template #sinMsg>
                <span class="text-muted">Sin mensaje.</span>
              </ng-template>
            </div>
          </div>
        </div>
      </div>

      <!-- Notas internas -->
      <div class="row g-3 mt-4">
        <div class="col-12 col-lg-8">
          <div class="card shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Notas internas</h5>

              <div class="mb-3">
                <textarea
                  class="form-control"
                  rows="3"
                  [(ngModel)]="nuevaNota"
                  placeholder="Agregar una nota interna sobre esta solicitud..."
                ></textarea>

                <div class="mt-2 text-end">
                  <button
                    class="btn btn-outline-primary btn-sm"
                    (click)="guardarNota()"
                    [disabled]="!nuevaNota || guardandoNota"
                  >
                    Guardar nota
                  </button>
                </div>
              </div>

              <div *ngIf="solicitud?.notas_admin?.length; else sinNotas">
                <div class="border rounded p-2 mb-2" *ngFor="let nota of solicitud?.notas_admin">
                  <div class="small text-muted">
                    {{ nota.created_at | date:'short' }}
                    <span *ngIf="nota.autor_email"> • {{ nota.autor_email }}</span>
                  </div>
                  <div>{{ nota.texto }}</div>
                </div>
              </div>

              <ng-template #sinNotas>
                <p class="text-muted mb-0">Aún no hay notas internas para esta solicitud.</p>
              </ng-template>
            </div>
          </div>
        </div>
      </div>

      <!-- Mensaje al cliente -->
      <div class="row g-3 mt-3">
        <div class="col-12 col-lg-8">
          <div class="card shadow-sm">
            <div class="card-body">
              <h5 class="card-title">Enviar mensaje al cliente</h5>
              <p class="text-muted small mb-2">
                Se enviará al correo asociado ({{ solicitud?.interesado?.email || 'sin email' }}).
              </p>

              <input
                class="form-control mb-2"
                [(ngModel)]="asunto"
                placeholder="Asunto (opcional)"
              />

              <textarea
                class="form-control"
                rows="4"
                [(ngModel)]="mensajeCliente"
                placeholder="Escribe el mensaje..."
              ></textarea>

              <div class="mt-2 text-end">
                <button
                  class="btn btn-primary btn-sm"
                  (click)="enviarMensaje()"
                  [disabled]="enviandoMensaje || !mensajeCliente"
                >
                  Enviar correo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <div class="container py-5 text-center text-muted" *ngIf="!solicitud && !cargando">
      No se pudo cargar la solicitud.
    </div>
  `,
})
export class AdminSolicitudDetalleComponent implements OnInit {
  solicitud: AdminSolicitud | null = null;
  cargando = false;
  id!: number;

  nuevoEstado: EstadoSolicitud = 'nueva';
  guardandoEstado = false;

  nuevaNota = '';
  guardandoNota = false;

  asunto = '';
  mensajeCliente = '';
  enviandoMensaje = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: AdminSolicitudesService
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id') || 0);
    if (!this.id) {
      this.volver();
      return;
    }
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.svc.obtener(this.id).subscribe({
      next: (s) => {
        this.solicitud = s;
        this.nuevoEstado = (s.estado as EstadoSolicitud) || 'nueva';
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando solicitud', err);
        this.cargando = false;
      },
    });
  }

  volver(): void {
    const returnTo = (this.route.snapshot.queryParamMap.get('returnTo') || '').trim();
    if (returnTo) this.router.navigateByUrl(returnTo);
    else this.router.navigate(['/admin/solicitudes']);
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

  guardarEstado(): void {
    if (!this.solicitud) return;

    if (!confirm('¿Guardar el nuevo estado de la solicitud?')) return;

    this.guardandoEstado = true;
    this.svc.cambiarEstado(this.id, this.nuevoEstado).subscribe({
      next: (updated) => {
        this.solicitud = updated;
        this.guardandoEstado = false;
      },
      error: (err) => {
        console.error('Error cambiando estado', err);
        alert('No fue posible cambiar el estado.');
        this.guardandoEstado = false;
      },
    });
  }

  guardarNota(): void {
    const texto = this.nuevaNota.trim();
    if (!texto) return;

    this.guardandoNota = true;
    this.svc.agregarNota(this.id, texto).subscribe({
      next: (nota) => {
        if (this.solicitud) {
          this.solicitud.notas_admin = this.solicitud.notas_admin || [];
          this.solicitud.notas_admin.unshift(nota);
        }
        this.nuevaNota = '';
        this.guardandoNota = false;
      },
      error: (err) => {
        console.error('Error guardando nota', err);
        alert('No fue posible guardar la nota.');
        this.guardandoNota = false;
      },
    });
  }

  enviarMensaje(): void {
    const msg = this.mensajeCliente.trim();
    if (!msg) return;

    if (!confirm('¿Enviar este mensaje al cliente por correo electrónico?')) return;

    this.enviandoMensaje = true;
    this.svc.enviarMensaje(this.id, msg, this.asunto).subscribe({
      next: () => {
        alert('Mensaje enviado correctamente.');
        this.mensajeCliente = '';
        this.asunto = '';
        this.enviandoMensaje = false;
        this.cargar();
      },
      error: (err) => {
        console.error('Error enviando mensaje', err);
        alert('No fue posible enviar el mensaje.');
        this.enviandoMensaje = false;
      },
    });
  }
}

