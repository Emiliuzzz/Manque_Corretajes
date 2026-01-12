import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Contrato {
  id: number;
  tipo: 'venta' | 'arriendo';
  tipo_display?: string;
  propiedad?: {
    id: number;
    titulo: string;
    precio?: number;
    ciudad?: string;
    tipo?: string;
  };
  comprador_arrendatario?: {
    id: number;
    nombre_completo: string;
    rut?: string;
    email?: string;
    telefono?: string;
  };
  fecha_firma: string;
  precio_pactado: number;
  vigente: boolean;
  total_pagos?: number;
  saldo?: number;
  archivo_pdf_url?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ContratoService {
  private apiUrl = environment.apiUrl.replace(/\/+$/, '');

  constructor(private http: HttpClient) {}

  listar(): Observable<Contrato[]> {
    return this.http.get<any>(`${this.apiUrl}/contratos/`).pipe(
      map((resp) => {
        if (Array.isArray(resp)) return resp;
        return resp?.results ?? [];
      })
    );
  }

  obtener(id: number): Observable<Contrato> {
    return this.http.get<Contrato>(`${this.apiUrl}/contratos/${id}/`);
  }
}
