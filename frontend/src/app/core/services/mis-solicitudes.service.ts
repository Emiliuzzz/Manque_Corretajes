import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import {
  MisReserva,
  MisContrato,
  MisPago,
} from './mis-propiedades.service';

import { environment } from '../../../environments/environment';

export interface NuevaSolicitud {
  id?: number;
  tipo_operacion: 'COMPRA' | 'ARRIENDO';
  tipo_propiedad:
    | 'casa'
    | 'departamento'
    | 'oficina'
    | 'parcela'
    | 'bodega'
    | 'terreno';
  ciudad: string;
  comuna: string;
  presupuesto_min?: number | null;
  presupuesto_max?: number | null;
  mensaje: string;
  estado?: string;
  created_at?: string;
}

export interface SolicitudClienteResumen {
  id: number;
  tipo_operacion: string;
  tipo_propiedad: string;
  ciudad: string;
  comuna: string;
  presupuesto_min: number | null;
  presupuesto_max: number | null;
  mensaje: string;
  estado: string;
  created_at: string;
}

export interface FiltrosMisReservas {
  estado?: string;
  desde?: string;
  hasta?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class MisSolicitudesService {
  private apiRoot = environment.apiUrl.replace(/\/$/, '');

  constructor(private http: HttpClient) {}

  // --- Reservas del cliente ---
  getMisReservas(params?: FiltrosMisReservas): Observable<MisReserva[]> {
    return this.http.get<any>(`${this.apiRoot}/mis-reservas/`, { params: params as any }).pipe(
      map((resp) => {
        const data = Array.isArray(resp) ? resp : resp.results;
        return (data || []) as MisReserva[];
      })
    );
  }

  // --- Contratos del cliente ---
  getMisContratos(): Observable<MisContrato[]> {
    return this.http.get<any>(`${this.apiRoot}/mis-contratos/`).pipe(
      map((resp) => {
        const data = Array.isArray(resp) ? resp : resp.results;
        return (data || []) as MisContrato[];
      })
    );
  }

  // --- Pagos del cliente ---
  getMisPagos(): Observable<MisPago[]> {
    return this.http.get<any>(`${this.apiRoot}/mis-pagos/`).pipe(
      map((resp) => {
        const data = Array.isArray(resp) ? resp : resp.results;
        return (data || []) as MisPago[];
      })
    );
  }

  // --- Nueva solicitud del cliente ---
  crearSolicitud(data: Partial<NuevaSolicitud>): Observable<NuevaSolicitud> {
    return this.http.post<NuevaSolicitud>(
      `${this.apiRoot}/solicitudes-cliente/`,
      data
    );
  }

  // --- Solicitudes del cliente ---
  getSolicitudesCliente(params?: any): Observable<SolicitudClienteResumen[]> {
    return this.http
      .get<any>(`${this.apiRoot}/cliente/mis-solicitudes/`, { params })
      .pipe(
        map((resp) => {
          const data = Array.isArray(resp) ? resp : resp.results || resp.data || [];
          return (data || []) as SolicitudClienteResumen[];
        })
      );
  }

  // --- Cancelar reserva ---
  cancelarReserva(id: number): Observable<any> {
    return this.http.post(`${this.apiRoot}/mis-reservas/${id}/cancelar/`, {});
  }
}
