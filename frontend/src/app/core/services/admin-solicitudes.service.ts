import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoSolicitud = 'nueva' | 'en_proceso' | 'respondida' | 'cerrada';

export interface AdminSolicitudNota {
  id: number;
  texto: string;
  created_at: string;
  autor_email?: string | null;
}

export interface AdminSolicitud {
  id: number;

  interesado: {
    id: number;
    nombre_completo?: string;
    rut?: string;
    email?: string;
    telefono?: string;
  } | null;

  tipo_operacion: 'COMPRA' | 'ARRIENDO' | string;
  tipo_propiedad: string;

  ciudad: string;
  comuna: string;

  presupuesto_min: string | null;
  presupuesto_max: string | null;

  mensaje: string;
  estado: EstadoSolicitud | string;

  created_at: string;

  notas_admin?: AdminSolicitudNota[];
}

type ApiAdminSolicitud = Omit<AdminSolicitud, 'interesado' | 'created_at'> & {
  interesado: AdminSolicitud['interesado'];
  created_at: string;
};

export interface SolicitudesKPI {
  total: number;
  nuevas: number;
  en_proceso: number;
  respondidas: number;
  cerradas: number;
}

@Injectable({ providedIn: 'root' })
export class AdminSolicitudesService {
  private apiRoot = environment.apiUrl.replace(/\/+$/, '');
  private apiAdminRoot = `${this.apiRoot}/admin`;

  constructor(private http: HttpClient) {}

  getKPIs(): Observable<SolicitudesKPI> {
    return this.http.get<SolicitudesKPI>(`${this.apiAdminRoot}/solicitudes/kpis/`);
  }

  private mapEstadoParam(estado: string): string {
    if (!estado) return 'TODAS';
    if (estado === 'TODAS') return 'TODAS';

    const mapa: Record<string, string> = {
      nueva: 'NUEVAS',
      en_proceso: 'EN_PROCESO',
      respondida: 'RESPONDIDAS',
      cerrada: 'CERRADAS',
    };

    return mapa[estado] || estado;
  }

  private normalizeApiToAdmin(s: ApiAdminSolicitud): AdminSolicitud {
    return {
      ...s,
      interesado: s.interesado ?? null,
      created_at: s.created_at,
    };
  }

  listar(paramsIn: { estado?: string; search?: string; desde?: string; hasta?: string; propiedad_id?: string } = {}): Observable<AdminSolicitud[]> {
    let params = new HttpParams();

    const estadoParam = this.mapEstadoParam(paramsIn.estado || 'TODAS');
    if (estadoParam && estadoParam !== 'TODAS') {
      params = params.set('estado', estadoParam);
    }

    if (paramsIn.search?.trim()) params = params.set('search', paramsIn.search.trim());
    if (paramsIn.desde?.trim())  params = params.set('desde', paramsIn.desde.trim());
    if (paramsIn.hasta?.trim())  params = params.set('hasta', paramsIn.hasta.trim());
    if (paramsIn.propiedad_id?.trim()) params = params.set('propiedad_id', paramsIn.propiedad_id.trim());

    return this.http
      .get<any>(`${this.apiAdminRoot}/solicitudes/`, { params })
      .pipe(
        map((resp) => {
          // Manejar respuestas paginadas {count, results} o arrays directos
          const lista: ApiAdminSolicitud[] = Array.isArray(resp)
            ? resp
            : Array.isArray(resp?.results)
              ? resp.results
              : [];
          return lista.map((x) => this.normalizeApiToAdmin(x));
        })
      );
  }

  obtener(id: number): Observable<AdminSolicitud> {
    return this.http
      .get<ApiAdminSolicitud>(`${this.apiAdminRoot}/solicitudes/${id}/`)
      .pipe(map((s) => this.normalizeApiToAdmin(s)));
  }

  cambiarEstado(id: number, estado: EstadoSolicitud): Observable<AdminSolicitud> {
    return this.http
      .post<ApiAdminSolicitud>(`${this.apiAdminRoot}/solicitudes/${id}/cambiar-estado/`, { estado })
      .pipe(map((s) => this.normalizeApiToAdmin(s)));
  }

  agregarNota(id: number, texto: string): Observable<AdminSolicitudNota> {
    return this.http.post<AdminSolicitudNota>(`${this.apiAdminRoot}/solicitudes/${id}/notas/`, { texto });
  }

  enviarMensaje(id: number, mensaje: string, asunto?: string): Observable<{ ok: boolean }> {
    const payload: any = { mensaje };
    if (asunto?.trim()) payload.asunto = asunto.trim();

    return this.http.post<{ ok: boolean }>(`${this.apiAdminRoot}/solicitudes/${id}/enviar-mensaje/`, payload);
  }
}
