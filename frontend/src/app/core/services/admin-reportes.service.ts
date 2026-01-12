import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl.replace(/\/+$/, '');

export type GroupBy = 'day' | 'week' | 'month';

export interface ReporteResumen {
  periodo: { desde: string; hasta: string; group: GroupBy };
  kpis: {
    contratos_activos: number;
    contratos_finalizados: number;
    arriendos_activos: number;
    ventas_activos: number;

    pagos_total: number;
    ingresos_total: number;

    ingresos_ventas: number;
    ingresos_arriendo_cuotas: number;
    ingresos_arriendo_extras: number;
  };
  mora: {
    vencidas_count: number;
    vencidas_total: number;
    proximas_7d_count: number;
    proximas_7d_total: number;
  };
  top_propiedades: Array<{ propiedad_id: number; titulo: string; total: number; pagos: number }>;
  serie_ingresos: Array<{ periodo: string; total: number }>;
  deudores: Array<{
  contrato_id: number;
  propiedad: { id: number; titulo: string };
  cliente: { id: number; nombre: string; rut: string };
  cuotas_vencidas: number;
  deuda_total: number;
  primera_vencida: string | null;
  dias_atraso: number;}>;

  reservas: {
    total: number;
    por_estado: Array<{ estado: string; count: number }>;
  };

  solicitudes: {
    total: number;
    por_estado: Array<{ estado: string; count: number }>;
  };
}

@Injectable({ providedIn: 'root' })
export class AdminReportesService {
  constructor(private http: HttpClient) {}

  getResumen(params?: { desde?: string; hasta?: string; group?: GroupBy; propiedad_id?: number | string }): Observable<ReporteResumen> {
    let hp = new HttpParams();
    if (params?.desde) hp = hp.set('desde', params.desde);
    if (params?.hasta) hp = hp.set('hasta', params.hasta);
    if (params?.group) hp = hp.set('group', params.group);
    if (params?.propiedad_id) hp = hp.set('propiedad_id', String(params.propiedad_id));
    return this.http.get<ReporteResumen>(`${API}/reportes/resumen/`, { params: hp });
  }
}
