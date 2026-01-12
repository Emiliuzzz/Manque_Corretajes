import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  AdminReportesService,
  ReporteResumen,
  GroupBy,
} from '../../../core/services/admin-reportes.service';
import {
  AdminReservasService,
  AdminReserva,
} from '../../../core/services/admin-reservas.service';
import {
  AdminSolicitudesService,
  AdminSolicitud,
} from '../../../core/services/admin-solicitudes.service';

type Preset = '7d' | '30d' | 'mes' | 'anio';

@Component({
  selector: 'app-admin-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-reportes.html',
  styleUrls: ['./admin-reportes.css'],
})
export class AdminReportesComponent implements OnInit {
  cargando = false;
  error: string | null = null;
  data: ReporteResumen | null = null;

  // Listas de reservas y solicitudes recientes
  reservasRecientes: AdminReserva[] = [];
  solicitudesRecientes: AdminSolicitud[] = [];
  cargandoReservas = false;
  cargandoSolicitudes = false;

  // filtros
  preset: Preset = '30d';
  desde = '';
  hasta = '';
  group: GroupBy = 'week';
  propiedadId = '';

  // UI
  mostrarDeudores = true;
  mostrarReservasRecientes = true;
  mostrarSolicitudesRecientes = true;

  constructor(
    private reportes: AdminReportesService,
    private reservasSvc: AdminReservasService,
    private solicitudesSvc: AdminSolicitudesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.aplicarPreset(this.preset);
    this.cargar();
  }

  onPresetChange(): void {
    this.aplicarPreset(this.preset);
    this.cargar();
  }

  aplicarPreset(p: Preset): void {
    const hoy = new Date();
    this.hasta = this.toISO(hoy);

    let desdeDate = new Date(hoy);

    if (p === '7d') {
      desdeDate.setDate(desdeDate.getDate() - 7);
      this.group = 'day';
    } else if (p === '30d') {
      desdeDate.setDate(desdeDate.getDate() - 30);
      this.group = 'week';
    } else if (p === 'mes') {
      desdeDate = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      this.group = 'week';
    } else if (p === 'anio') {
      desdeDate = new Date(hoy.getFullYear(), 0, 1);
      this.group = 'month';
    }

    this.desde = this.toISO(desdeDate);
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;

    const prop = this.propiedadId?.trim();

    // Cargar resumen
    this.reportes
      .getResumen({
        desde: this.desde || undefined,
        hasta: this.hasta || undefined,
        group: this.group,
        propiedad_id: prop ? prop : undefined,
      })
      .subscribe({
        next: (r: ReporteResumen) => {
          this.data = r;
          this.cargando = false;
        },
        error: (e: any) => {
          this.cargando = false;
          this.data = null;
          this.error =
            e?.error?.detail ||
            e?.error?.message ||
            'No se pudo cargar el reporte.';
        },
      });

    // Cargar reservas recientes
    this.cargarReservasRecientes();

    // Cargar solicitudes recientes
    this.cargarSolicitudesRecientes();
  }

  private cargarReservasRecientes(): void {
    this.cargandoReservas = true;
    this.reservasSvc
      .listar('TODAS', {
        desde: this.desde,
        hasta: this.hasta,
        propiedad_id: this.propiedadId?.trim() || undefined,
      })
      .subscribe({
        next: (lista) => {
          // Tomar las últimas 10
          this.reservasRecientes = (lista || []).slice(0, 10);
          this.cargandoReservas = false;
        },
        error: () => {
          this.reservasRecientes = [];
          this.cargandoReservas = false;
        },
      });
  }

  private cargarSolicitudesRecientes(): void {
    this.cargandoSolicitudes = true;
    this.solicitudesSvc
      .listar({
        estado: 'TODAS',
        desde: this.desde,
        hasta: this.hasta,
      })
      .subscribe({
        next: (lista) => {
          // Tomar las últimas 10
          this.solicitudesRecientes = (lista || []).slice(0, 10);
          this.cargandoSolicitudes = false;
        },
        error: () => {
          this.solicitudesRecientes = [];
          this.cargandoSolicitudes = false;
        },
      });
  }

  // Navegación a detalle
  verReservaDetalle(id: number): void {
    const returnTo = this.router.url;
    this.router.navigate(['/admin/reservas', id], {
      queryParams: { returnTo },
    });
  }

  verSolicitudDetalle(id: number): void {
    const returnTo = this.router.url;
    this.router.navigate(['/admin/solicitudes', id], {
      queryParams: { returnTo },
    });
  }

  verContrato(id: number): void {
    const returnTo = this.router.url;
    this.router.navigate(['/admin/contratos', id], {
      queryParams: { returnTo },
    });
  }

  verPropiedad(id: number): void {
    this.router.navigate(['/admin/propiedades', id]);
  }

  volverPanel(): void {
    this.router.navigate(['/admin']);
  }

  // Ir a lista filtrada por estado
  verOperacion(tipo: 'reservas' | 'solicitudes', estado: string): void {
    const returnTo = this.router.url;

    const qp: any = {
      estado: (estado || '').trim(),
      desde: this.desde || undefined,
      hasta: this.hasta || undefined,
      returnTo,
    };

    const prop = this.propiedadId?.trim();
    if (prop) qp.propiedad_id = prop;

    if (tipo === 'reservas') {
      this.router.navigate(['/admin/reservas'], { queryParams: qp });
    } else {
      this.router.navigate(['/admin/solicitudes'], { queryParams: qp });
    }
  }

  // helpers
  moneda(v: number): string {
    const n = Number(v || 0);
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(n);
  }

  numero(v: number): string {
    return new Intl.NumberFormat('es-CL').format(Number(v || 0));
  }

  maxSerie(): number {
    const arr = this.data?.serie_ingresos ?? [];
    const max = arr.reduce(
      (m: number, x: { periodo: string; total: number }) =>
        Math.max(m, Number(x.total || 0)),
      0
    );
    return max > 0 ? max : 1;
  }

  barraPct(total: number): number {
    return Math.round((Number(total || 0) / this.maxSerie()) * 100);
  }

  badgeAtraso(dias: number): 'ok' | 'warn' | 'danger' {
    if (dias >= 30) return 'danger';
    if (dias >= 7) return 'warn';
    return 'ok';
  }

  estadoLabel(e: string): string {
    const v = String(e || '').trim().toLowerCase();

    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      confirmada: 'Confirmada',
      cancelada: 'Cancelada',
      expirada: 'Expirada',

      nueva: 'Nueva',
      en_proceso: 'En proceso',
      respondida: 'Respondida',
      cerrada: 'Cerrada',
    };

    return map[v] || (e ? e.replace(/_/g, ' ') : '');
  }

  estadoBadge(e: string): 'ok' | 'warn' | 'danger' {
    const v = String(e || '').toLowerCase();

    if (v.includes('confirm') || v.includes('respond') || v.includes('cerrad'))
      return 'ok';
    if (v.includes('pend') || v.includes('proceso') || v.includes('nueva'))
      return 'warn';
    if (v.includes('cancel') || v.includes('expir')) return 'danger';

    return 'warn';
  }

  badgeClaseReserva(estado: string): string {
    if (estado === 'pendiente') return 'text-bg-warning';
    if (estado === 'confirmada') return 'text-bg-success';
    if (estado === 'cancelada') return 'text-bg-secondary';
    if (estado === 'expirada') return 'text-bg-dark';
    return 'text-bg-light text-dark border';
  }

  badgeClaseSolicitud(estado: string): string {
    if (estado === 'nueva') return 'text-bg-info';
    if (estado === 'en_proceso') return 'text-bg-warning';
    if (estado === 'respondida') return 'text-bg-success';
    if (estado === 'cerrada') return 'text-bg-secondary';
    return 'text-bg-light text-dark border';
  }

  sumEstados(arr?: Array<{ count: number }>): number {
    return (arr || []).reduce((a, x) => a + Number(x?.count || 0), 0);
  }

  private toISO(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
