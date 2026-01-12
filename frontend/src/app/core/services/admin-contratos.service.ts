import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl.replace(/\/+$/, '');

type ApiList<T> = T[] | { results: T[]; count?: number; next?: string | null; previous?: string | null };

export interface MiniPropiedad {
  id: number;
  titulo: string;
  precio?: number;
  ciudad?: string;
  tipo?: string;
}

export interface MiniInteresado {
  id: number;
  nombre_completo: string;
  rut?: string;
  email?: string;
  telefono?: string;
}

export interface Contrato {
  id: number;
  tipo: 'venta' | 'arriendo';
  tipo_display?: string;
  propiedad?: MiniPropiedad;
  comprador_arrendatario?: MiniInteresado;
  fecha_firma: string;
  precio_pactado: number;
  vigente: boolean;

  total_pagos?: number;
  saldo?: number;
  archivo_pdf_url?: string | null;
  archivo_pdf?: string | null;
}

export interface ContratoCreateUpdate {
  tipo: 'venta' | 'arriendo';
  propiedad_id: number;
  comprador_arrendatario_id: number;
  fecha_firma: string;
  precio_pactado: number;
  vigente: boolean;
  archivo_pdf?: File | null;
}

export interface Pago {
  id: number;
  contrato_id: number;
  fecha: string;
  monto: number;
  medio: string;
  notas?: string;
  comprobante_url?: string | null;
  propiedad?: any;
  cliente?: any;
}

export interface ContratoDocumento {
  id: number;
  contrato: number;
  tipo: string;
  nombre?: string;
  archivo_url?: string;
  created_at?: string;
}

export interface Cuota {
  id: number;
  contrato_id: number;
  vencimiento: string;
  monto: number;
  pagada: boolean;
  pago?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AdminContratosService {
  constructor(private http: HttpClient) {}

  // -------- Contratos --------
  listarContratos(params?: Record<string, any>): Observable<{ items: Contrato[]; count: number }> {
    const qp = this.toQuery(params);
    return this.http.get<ApiList<Contrato>>(`${API}/contratos/${qp}`).pipe(
      map((resp: any) => {
        if (Array.isArray(resp)) return { items: resp, count: resp.length };
        return { items: resp?.results ?? [], count: resp?.count ?? (resp?.results?.length ?? 0) };
      })
    );
  }

  obtenerContrato(id: number): Observable<Contrato> {
    return this.http.get<Contrato>(`${API}/contratos/${id}/`);
  }

  crearContrato(payload: ContratoCreateUpdate): Observable<Contrato> {
    const fd = this.contratoToFormData(payload);
    return this.http.post<Contrato>(`${API}/contratos/`, fd);
  }

  actualizarContrato(id: number, payload: Partial<ContratoCreateUpdate>): Observable<Contrato> {
    const fd = this.contratoToFormData(payload);
    return this.http.patch<Contrato>(`${API}/contratos/${id}/`, fd);
  }

  finalizarContrato(id: number): Observable<any> {
    return this.http.patch(`${API}/contratos/${id}/`, { vigente: false });
  }

  listarPagosContrato(contratoId: number) {
    return this.http.get<ApiList<Pago>>(`${API}/contratos/${contratoId}/pagos/`).pipe(
      map((resp: any) => Array.isArray(resp) ? { items: resp, count: resp.length } : { items: resp.results ?? [], count: resp.count ?? 0 })
    );
  }

  crearPago(contratoId: number, data: { fecha: string; monto: number; medio: string; notas?: string; comprobante?: File | null }) {
    const fd = new FormData();
    fd.append('fecha', data.fecha);
    fd.append('monto', String(data.monto));
    fd.append('medio', data.medio);
    fd.append('notas', data.notas ?? '');
    if (data.comprobante) fd.append('comprobante', data.comprobante);
    return this.http.post<Pago>(`${API}/contratos/${contratoId}/pagos/`, fd);
  }


  // -------- Documentos contrato --------
  listarDocsContrato(contratoId: number): Observable<ContratoDocumento[]> {
    // si tu back no filtra por query, cambia a endpoint anidado si lo tienes
    return this.http.get<ApiList<ContratoDocumento>>(`${API}/contratos-documentos/?contrato=${contratoId}`).pipe(
      map((resp: any) => Array.isArray(resp) ? resp : (resp?.results ?? []))
    );
  }

  subirDocContrato(contratoId: number, data: { tipo: string; nombre?: string; archivo: File }): Observable<ContratoDocumento> {
    const fd = new FormData();
    fd.append('contrato', String(contratoId));
    fd.append('tipo', data.tipo);
    fd.append('nombre', data.nombre ?? '');
    fd.append('archivo', data.archivo);
    return this.http.post<ContratoDocumento>(`${API}/contratos-documentos/`, fd);
  }

  eliminarDocContrato(id: number): Observable<any> {
    return this.http.delete(`${API}/contratos-documentos/${id}/`);
  }

  // -------- Cuotas --------
  listarCuotas(contratoId: number): Observable<Cuota[]> {
    return this.http.get<ApiList<Cuota>>(`${API}/cuotas/?contrato=${contratoId}`).pipe(
      map((resp: any) => Array.isArray(resp) ? resp : (resp?.results ?? []))
    );
  }

  crearCuota(contratoId: number, vencimiento: string, monto: number): Observable<Cuota> {
    return this.http.post<Cuota>(`${API}/cuotas/`, { contrato: contratoId, vencimiento, monto });
  }

  pagarCuota(
    cuotaId: number,
    data: { monto: number; fecha?: string; medio?: string; notas?: string; comprobante?: File | null }
  ): Observable<any> {
    const fd = new FormData();
    fd.append('monto', String(data.monto));
    if (data.fecha) fd.append('fecha', data.fecha);
    if (data.medio) fd.append('medio', data.medio);
    if (data.notas) fd.append('notas', data.notas);
    if (data.comprobante) fd.append('comprobante', data.comprobante);

    return this.http.post(`${API}/cuotas/${cuotaId}/pagar/`, fd);
  }


  // -------- helpers --------
  private contratoToFormData(obj: any): FormData {
    const fd = new FormData();
    Object.entries(obj || {}).forEach(([k, v]: any) => {
      if (v === undefined || v === null) return;
      if (v instanceof File) fd.append(k, v);
      else fd.append(k, String(v));
    });
    return fd;
  }

  private toQuery(params?: Record<string, any>): string {
    if (!params) return '';
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      q.set(k, String(v));
    });
    const s = q.toString();
    return s ? `?${s}` : '';
  }
}
