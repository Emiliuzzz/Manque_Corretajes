import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AdminReservasService,
  AdminReserva,
} from '../../../core/services/admin-reservas.service';

type EstadoReserva = 'pendiente' | 'confirmada' | 'cancelada' | 'expirada';

@Component({
  standalone: true,
  selector: 'app-admin-reserva-detalle',
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container py-4" *ngIf="reserva">
      <div class="d-flex gap-2 mb-3">
        <button type="button" class="btn btn-outline-secondary" (click)="volver()">
          Volver
        </button>
        <button type="button" class="btn btn-outline-dark" (click)="irPanel()">
          Panel admin
        </button>
      </div>

      <div class="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <h1 class="h4 mb-1">
            Reserva #{{ reserva.id }}
            <span class="badge ms-2" [ngClass]="badgeClase(reserva.estado)">
              {{ etiquetaEstado(reserva.estado) }}
            </span>
          </h1>

          <p class="text-muted mb-0">
            Creada el {{ reserva.fecha | date:'short' }}
            • Vence {{ reserva.expires_at ? (reserva.expires_at | date:'short') : '—' }}
          </p>
        </div>

        <!-- Cambiar estado -->
        <div class="d-flex align-items-center gap-2">
          <select class="form-select form-select-sm" style="min-width: 170px;" [(ngModel)]="nuevoEstado">
          <option value="pendiente">Pendiente</option>
          <option value="confirmada">Confirmada</option>
          <option value="expirada">Expirada</option>
          <option value="cancelada">Cancelada</option>
        </select>


          <button class="btn btn-sm btn-primary" (click)="guardarEstado()" [disabled]="guardandoEstado">
            Guardar
          </button>
        </div>
      </div>

      <div class="row g-3">
        <!-- Cliente -->
        <div class="col-12 col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title mb-3">Cliente</h5>
              <ng-container *ngIf="reserva.interesado; else sinCliente">
                <div class="fw-semibold">{{ reserva.interesado?.nombre_completo || 'Sin nombre' }}</div>
                <div class="small text-muted">RUT: {{ reserva.interesado?.rut || '—' }}</div>
                <div class="small">Teléfono: {{ reserva.interesado?.telefono || '—' }}</div>
                <div class="small">Email: {{ reserva.interesado?.email || '—' }}</div>
              </ng-container>
              <ng-template #sinCliente>
                <p class="text-muted mb-0">No hay información de cliente asociada.</p>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- Propiedad -->
        <div class="col-12 col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title mb-3">Propiedad</h5>
              <ng-container *ngIf="reserva.propiedad; else sinProp">
                <div class="fw-semibold">{{ reserva.propiedad?.titulo }}</div>
                <div class="small text-muted">Código: {{ reserva.propiedad?.codigo || '—' }}</div>
                <button class="btn btn-outline-secondary btn-sm mt-2" (click)="verPropiedad()">
                  Ver ficha de propiedad
                </button>
              </ng-container>
              <ng-template #sinProp>
                <p class="text-muted mb-0">No hay propiedad asociada.</p>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- Datos -->
        <div class="col-12 col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <h5 class="card-title mb-3">Datos de la reserva</h5>

              <div class="mb-2">
                <span class="text-muted small d-block">Monto de reserva</span>
                <span class="fw-semibold">{{ reserva.monto_reserva | currency:'CLP':'symbol-narrow' }}</span>
              </div>

              <div>
                <span class="text-muted small d-block">Notas del cliente</span>
                <p class="mb-0" *ngIf="reserva.notas; else sinNotas">{{ reserva.notas }}</p>
                <ng-template #sinNotas>
                  <span class="text-muted">Sin notas registradas.</span>
                </ng-template>
              </div>

              <div class="mt-3">
                <button
                  class="btn btn-outline-danger btn-sm"
                  (click)="cancelarReserva()"
                  [disabled]="reserva.estado === 'cancelada' || reserva.estado === 'expirada'"
                >
                  Cancelar reserva
                </button>
              </div>
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
                  placeholder="Agregar una nota interna sobre esta reserva..."
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

              <div *ngIf="reserva?.notas_admin?.length; else sinNotasAdmin">
                <div class="border rounded p-2 mb-2" *ngFor="let nota of reserva?.notas_admin">
                  <div class="small text-muted">
                    {{ nota.created_at | date:'short' }}
                    <span *ngIf="nota.autor_email"> • {{ nota.autor_email }}</span>
                  </div>
                  <div>{{ nota.texto }}</div>
                </div>
              </div>

              <ng-template #sinNotasAdmin>
                <p class="text-muted mb-0">Aún no hay notas internas registradas para esta reserva.</p>
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
              <p class="text-muted small">
                El mensaje se enviará al correo asociado ({{ reserva?.interesado?.email || 'sin email' }}).
              </p>

              <input class="form-control mb-2" [(ngModel)]="asunto" placeholder="Asunto (opcional)" />

              <textarea
                class="form-control"
                rows="4"
                [(ngModel)]="mensajeCliente"
                placeholder="Ej: Hola Laura, hemos recibido tu reserva y queremos coordinar una visita..."
              ></textarea>

              <div class="mt-2 text-end">
                <button
                  class="btn btn-primary btn-sm"
                  (click)="enviarMensajeCliente()"
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

    <div class="container py-5 text-center text-muted" *ngIf="!reserva && !cargando">
      No se pudo cargar la reserva.
    </div>
  `,
})

export class AdminReservaDetalleComponent implements OnInit {
  reserva: AdminReserva | null = null;
  cargando = false;
  id!: number;

  
  nuevoEstado: EstadoReserva = 'pendiente';
  guardandoEstado = false;

  nuevaNota = '';
  guardandoNota = false;

  asunto = '';
  mensajeCliente = '';
  enviandoMensaje = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reservasSvc: AdminReservasService
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
    this.reservasSvc.obtener(this.id).subscribe({
      next: (r) => {
        this.reserva = r;
        this.nuevoEstado = (r.estado as EstadoReserva) || 'pendiente';
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error cargando reserva', err);
        this.cargando = false;
      },
    });
  }

  volver(): void {
    const returnTo = (this.route.snapshot.queryParamMap.get('returnTo') || '').trim();
    if (returnTo) this.router.navigateByUrl(returnTo);
    else this.router.navigate(['/admin/reservas']);
  }

  irPanel(): void {
    this.router.navigate(['/admin']);
  }

  verPropiedad(): void {
    if (this.reserva?.propiedad?.id) {
      this.router.navigate(['/admin/propiedades', this.reserva.propiedad.id]);
    }
  }

  badgeClase(estado: string): string {
    switch (estado) {
      case 'pendiente':
        return 'bg-warning text-dark';
      case 'confirmada':
        return 'bg-success text-white';
      case 'expirada':
        return 'bg-dark text-white';
      case 'cancelada':
        return 'bg-secondary text-white';
      default:
        return 'bg-light text-dark border';
    }
  }

  etiquetaEstado(estado: string): string {
    if (estado === 'pendiente') return 'Pendiente';
    if (estado === 'confirmada') return 'Confirmada';
    if (estado === 'expirada') return 'Expirada';
    if (estado === 'cancelada') return 'Cancelada';
    return estado || '—';
  }

  guardarEstado(): void {
    if (!this.reserva) return;
    if (!confirm('¿Guardar el nuevo estado de la reserva?')) return;

    this.guardandoEstado = true;
    this.reservasSvc.cambiarEstado(this.id, this.nuevoEstado).subscribe({
      next: (r) => {
        this.reserva = r;
        this.nuevoEstado = (r.estado as EstadoReserva) || this.nuevoEstado;
        this.guardandoEstado = false;
      },
      error: (err) => {
        console.error('Error cambiando estado', err);
        alert('No fue posible cambiar el estado.');
        this.guardandoEstado = false;
      },
    });
  }

  cancelarReserva(): void {
    if (!this.reserva) return;
    if (this.reserva.estado === 'cancelada' || this.reserva.estado === 'expirada') return;

    if (!confirm('¿Seguro que deseas cancelar esta reserva?')) return;

    this.guardandoEstado = true;
    this.reservasSvc.cambiarEstado(this.id, 'cancelada').subscribe({
      next: (r) => {
        this.reserva = r;
        this.nuevoEstado = 'cancelada';
        alert('Reserva cancelada correctamente.');
        this.guardandoEstado = false;
      },
      error: (err) => {
        console.error('Error al cancelar reserva', err);
        alert('No fue posible cancelar la reserva.');
        this.guardandoEstado = false;
      },
    });
  }

  guardarNota(): void {
    const texto = this.nuevaNota.trim();
    if (!texto) return;

    this.guardandoNota = true;
    this.reservasSvc.agregarNota(this.id, texto).subscribe({
      next: (nota) => {
        if (this.reserva) {
          this.reserva.notas_admin = this.reserva.notas_admin || [];
          this.reserva.notas_admin.unshift(nota);
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

  enviarMensajeCliente(): void {
    const msg = this.mensajeCliente.trim();
    if (!msg) return;

    if (!confirm('¿Enviar este mensaje al cliente por correo electrónico?')) return;

    this.enviandoMensaje = true;
    this.reservasSvc.enviarMensaje(this.id, msg, this.asunto).subscribe({
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
