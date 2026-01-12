import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import {
  MisReserva,
  MisContrato,
  MisPago,
} from '../../core/services/mis-propiedades.service';

import {
  SolicitudClienteResumen,
  MisSolicitudesService,
} from '../../core/services/mis-solicitudes.service';

type TabKey = 'reservas' | 'contratos' | 'pagos' | 'solicitudes';

@Component({
  selector: 'app-mis-solicitudes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mis-solicitudes.html',
})
export class MisSolicitudes implements OnInit {
  // --- Datos ---
  reservas: MisReserva[] = [];
  contratos: MisContrato[] = [];
  pagos: MisPago[] = [];
  solicitudes: SolicitudClienteResumen[] = [];

  // --- Cargando flags ---
  cargandoReservas = true;
  cargandoContratos = true;
  cargandoPagos = true;
  cargandoSolicitudes = true;

  // --- Errores ---
  errorReservas: string | null = null;
  errorContratos: string | null = null;
  errorPagos: string | null = null;
  errorSolicitudes: string | null = null;

  activeTab: TabKey = 'reservas';

  constructor(private svc: MisSolicitudesService) {}

  ngOnInit(): void {
    this.cargarReservas();
    this.cargarContratos();
    this.cargarPagos();
    this.cargarSolicitudes(); 
  }

  setTab(tab: TabKey): void {
    this.activeTab = tab;
  }

  // --- Cargas ---

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

  private cargarSolicitudes(): void {
    this.cargandoSolicitudes = true;
    this.errorSolicitudes = null;

    this.svc.getSolicitudesCliente().subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.cargandoSolicitudes = false;
      },
      error: (err) => {
        console.error(err);
        this.errorSolicitudes =
          'Error al cargar tus solicitudes de búsqueda.';
        this.cargandoSolicitudes = false;
      },
    });
  }

  // --- Getters resumen ---

  get totalReservasActivas() {
    return this.reservas.filter((r) => r.activa && !r.vencida).length;
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
