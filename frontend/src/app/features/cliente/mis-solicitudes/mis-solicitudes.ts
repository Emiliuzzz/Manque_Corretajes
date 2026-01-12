import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { MisReserva, MisContrato, MisPago } from '../../../core/services/mis-propiedades.service';
import {
  SolicitudClienteResumen,
  MisSolicitudesService,
  FiltrosMisReservas,
} from '../../../core/services/mis-solicitudes.service';

type TabKey = 'reservas' | 'contratos' | 'pagos' | 'solicitudes';
type EstadoReservaFiltro = '' | 'pendiente' | 'confirmada' | 'cancelada' | 'expirada';

@Component({
  selector: 'app-mis-solicitudes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './mis-solicitudes.html',
})
export class MisSolicitudes implements OnInit {
  reservas: MisReserva[] = [];
  contratos: MisContrato[] = [];
  pagos: MisPago[] = [];
  solicitudes: SolicitudClienteResumen[] = [];

  cargandoReservas = true;
  cargandoContratos = true;
  cargandoPagos = true;
  cargandoSolicitudes = true;

  errorReservas: string | null = null;
  errorContratos: string | null = null;
  errorPagos: string | null = null;
  errorSolicitudes: string | null = null;

  activeTab: TabKey = 'reservas';

  filtros: { estado: string; desde: string; hasta: string } = {
    estado: '',
    desde: '',
    hasta: '',
  };

  filtrosReservas: FiltrosMisReservas = {
    estado: '',
    desde: '',
    hasta: '',
    search: '',
  };

  constructor(private svc: MisSolicitudesService) {}

  ngOnInit(): void {
    this.cargarReservas();
    this.cargarContratos();
    this.cargarPagos();
    this.cargarSolicitudes();
  }

  setTab(tab: TabKey): void {
    this.activeTab = tab;
    if (tab === 'solicitudes') {
      this.cargarSolicitudes();
    }
  }

  private cargarReservas(): void {
    this.cargandoReservas = true;
    this.errorReservas = null;

    const params = {
      estado: (this.filtrosReservas.estado || '').trim(),
      desde: this.toISODate(this.filtrosReservas.desde || ''),
      hasta: this.toISODate(this.filtrosReservas.hasta || ''),
      search: (this.filtrosReservas.search || '').trim(),
    };

    this.svc.getMisReservas(params).subscribe({
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

  aplicarFiltrosReservas(): void {
    this.cargarReservas();
  }

  limpiarFiltrosReservas(): void {
    this.filtrosReservas = { estado: '', desde: '', hasta: '', search: '' };
    this.cargarReservas();
  }

  cancelar(r: MisReserva): void {
    if (r.estado_reserva !== 'pendiente') return;
    if (!confirm('¿Cancelar esta reserva?')) return;

    this.svc.cancelarReserva(r.id).subscribe({
      next: () => this.cargarReservas(),
      error: () => alert('No se pudo cancelar la reserva.'),
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

  cargarSolicitudes(): void {
    this.cargandoSolicitudes = true;
    this.errorSolicitudes = null;

    const params = {
      estado: this.filtros.estado || '',
      desde: this.toISODate(this.filtros.desde || ''),
      hasta: this.toISODate(this.filtros.hasta || ''),
    };

    this.svc.getSolicitudesCliente(params).subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.cargandoSolicitudes = false;
      },
      error: (err) => {
        console.error(err);
        this.errorSolicitudes = 'Error al cargar tus solicitudes de búsqueda.';
        this.cargandoSolicitudes = false;
      },
    });
  }

  private toISODate(value: string): string {
    if (!value) return '';
    const v = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    const m = v.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m) {
      const dd = m[1], mm = m[2], yyyy = m[3];
      return `${yyyy}-${mm}-${dd}`;
    }

    return v;
  }

  aplicarFiltrosSolicitudes(): void {
    this.cargarSolicitudes();
  }

  limpiarFiltrosSolicitudes(): void {
    this.filtros = { estado: '', desde: '', hasta: '' };
    this.cargarSolicitudes();
  }

  get totalReservasActivas() {
    return this.reservas.filter(r =>
      r.estado_reserva === 'pendiente' || r.estado_reserva === 'confirmada'
    ).length;
  }


  get totalContratosVigentes() {
    return this.contratos.filter((c) => c.vigente).length;
  }

  get totalPagos() {
    return this.pagos.length;
  }

  get totalSolicitudes() {
    return this.solicitudes.length;
  }

}
