import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MisPropiedadesService,
  MisPropiedad,
  MisReserva,
  MisContrato,
  MisPago,
} from '../../core/services/mis-propiedades.service';
import { RouterModule } from '@angular/router';
import {
  NotificacionesService,
  Notificacion,
} from '../../core/services/notificaciones.service';

type TabKey = 'propiedades' | 'reservas' | 'contratos' | 'pagos' | 'notificaciones';

@Component({
  selector: 'app-mis-propiedades',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mis-propiedades.html',
})
export class MisPropiedades implements OnInit {
  propiedades: MisPropiedad[] = [];
  reservas: MisReserva[] = [];
  contratos: MisContrato[] = [];
  pagos: MisPago[] = [];

  // Notificaciones
  notificaciones: Notificacion[] = [];
  cargandoNotificaciones = true;
  errorNotificaciones: string | null = null;

  cargandoPropiedades = true;
  cargandoReservas = true;
  cargandoContratos = true;
  cargandoPagos = true;

  errorPropiedades: string | null = null;
  errorReservas: string | null = null;
  errorContratos: string | null = null;
  errorPagos: string | null = null;

  activeTab: TabKey = 'propiedades';

  selectedReserva?: MisReserva;

  constructor(
    private svc: MisPropiedadesService,
    private notifSvc: NotificacionesService
  ) {}

  ngOnInit(): void {
    this.cargarPropiedades();
    this.cargarReservas();
    this.cargarContratos();
    this.cargarPagos();
    this.cargarNotificaciones();
  }

  setTab(tab: TabKey): void {
    this.activeTab = tab;
  }

  // ---------- Cargas ----------

  private cargarPropiedades(): void {
    this.svc.getMisPropiedades().subscribe({
      next: (data) => {
        this.propiedades = data;
        this.cargandoPropiedades = false;
      },
      error: (err) => {
        console.error(err);
        this.errorPropiedades = 'Error al cargar tus propiedades.';
        this.cargandoPropiedades = false;
      },
    });
  }

  private cargarReservas(): void {
    this.svc.getMisReservas().subscribe({
      next: (data) => {
        this.reservas = data;
        this.cargandoReservas = false;
      },
      error: (err) => {
        console.error(err);
        this.errorReservas = 'Error al cargar tus reservas.';
        this.cargandoReservas = false;
      },
    });
  }

  private cargarContratos(): void {
    this.svc.getMisContratos().subscribe({
      next: (data) => {
        this.contratos = data;
        this.cargandoContratos = false;
      },
      error: (err) => {
        console.error(err);
        this.errorContratos = 'Error al cargar tus contratos.';
        this.cargandoContratos = false;
      },
    });
  }

  private cargarPagos(): void {
    this.svc.getMisPagos().subscribe({
      next: (data) => {
        this.pagos = data;
        this.cargandoPagos = false;
      },
      error: (err) => {
        console.error(err);
        this.errorPagos = 'Error al cargar tus pagos.';
        this.cargandoPagos = false;
      },
    });
  }

  private cargarNotificaciones(): void {
    this.cargandoNotificaciones = true;
    this.errorNotificaciones = null;

    this.notifSvc.listar().subscribe({
      next: (data) => {
        this.notificaciones = data;
        this.cargandoNotificaciones = false;
      },
      error: (err) => {
        console.error('Error al cargar notificaciones', err);
        this.errorNotificaciones = 'Error al cargar tus notificaciones.';
        this.cargandoNotificaciones = false;
      },
    });
  }

  // ---------- Acciones sobre reservas ----------

  cancelarReserva(r: MisReserva): void {
    if (!confirm(`¿Seguro que deseas cancelar la reserva #${r.id}?`)) {
      return;
    }

    this.svc.cancelarReserva(r.id).subscribe({
      next: (resActualizada) => {
        this.reservas = this.reservas.map((x) =>
          x.id === r.id ? resActualizada : x
        );
        alert('Reserva cancelada correctamente.');
      },
      error: (err) => {
        console.error('Error al cancelar reserva', err);
        const msg =
          err?.error?.detail ||
          err?.error?.message ||
          'No fue posible cancelar la reserva.';
        alert(msg);
      },
    });
  }

  verDetalleReserva(r: MisReserva): void {
    this.selectedReserva = r;
  }

  cerrarDetalleReserva(): void {
    this.selectedReserva = undefined;
  }

  // ---------- Acciones sobre notificaciones ----------

  marcarNotificacionLeida(n: Notificacion): void {
    if (n.leida) return;

    this.notifSvc.marcarLeida(n.id).subscribe({
      next: () => {
        n.leida = true;
      },
      error: (err) => {
        console.error('Error al marcar notificación como leída', err);
        alert('No fue posible marcar la notificación como leída.');
      },
    });
  }

  marcarTodasNotificaciones(): void {
    if (!confirm('¿Marcar todas las notificaciones como leídas?')) {
      return;
    }

    this.notifSvc.marcarTodas().subscribe({
      next: () => {
        // Refrescamos la lista
        this.cargarNotificaciones();
      },
      error: (err) => {
        console.error('Error al marcar todas como leídas', err);
        alert('No fue posible marcar todas las notificaciones.');
      },
    });
  }

  // ---------- Getters resumen ----------

  get totalPropiedades() {
    return this.propiedades.length;
  }

  get totalReservasActivas() {
    return this.reservas.filter((r) => r.activa && !r.vencida).length;
  }

  get totalContratosVigentes() {
    return this.contratos.filter((c) => c.vigente).length;
  }

  get totalPagos() {
    return this.pagos.length;
  }

  get totalNotificacionesNoLeidas() {
    return this.notificaciones.filter((n) => !n.leida).length;
  }
}
