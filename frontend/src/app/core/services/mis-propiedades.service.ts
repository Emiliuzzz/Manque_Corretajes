import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface MisPropiedad {
  id: number;
  titulo: string;
  ciudad: string;
  direccion: string;
  precio: number;
  estado: string;
  estado_aprobacion: string;
  observacion_admin?: string;
  foto_principal?: string;
}


// --- Reservas ---
export interface MiniPropSimple {
  id: number;
  titulo: string;
  ciudad: string;
  tipo: string;
  estado: string;
}

export interface MiniInteresado {
  id: number;
  nombre_completo: string;
  rut: string;
  email: string;
  telefono: string;
}

export interface MisReserva {
  id: number;
  propiedad: MiniPropSimple;
  interesado: MiniInteresado;
  fecha: string;
  expires_at: string | null;
  monto_reserva: number;
  activa: boolean;
  vencida: boolean;
  estado_reserva: string;
  notas: string;
}

// --- Contratos ---
export interface MisContrato {
  id: number;
  tipo: string;
  tipo_display: string;
  propiedad: MiniPropSimple;
  comprador_arrendatario: MiniInteresado;
  fecha_firma: string;
  precio_pactado: number;
  vigente: boolean;
  total_pagos: number;
  saldo: number;

  archivo_pdf_url?: string | null;
}

// --- Pagos ---
export interface MisPago {
  id: number;
  contrato_id: number;
  fecha: string;
  monto: number;
  medio: string;
  notas: string;
  propiedad: { id: number; titulo: string; ciudad: string; tipo: string } | null;
  cliente: { id: number; nombre: string; rut: string } | null;
  comprobante_url?: string | null;
}


export interface PerfilPropietario {
  id: number;
  primer_nombre: string;
  segundo_nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  rut: string;
  telefono: string;
  email: string;
}

// --- Crear propiedad ---
export interface NuevaPropiedadPayload {
  propietario: number;
  titulo: string;
  descripcion?: string;
  direccion: string;
  ciudad: string;
  tipo: string;
  dormitorios: number;
  baos: number;
  metros2?: number;
  precio: number;
  orientación?: string;
  estado?: string;
}

// --- Fotos ---
export interface FotoPropiedad {
  id: number;
  propiedad: number;
  url: string;
  orden: number;
  principal: boolean;
}

export interface HistorialEntry {
  id: number;
  usuario: string;
  fecha: string;
  accion: string;
  descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class MisPropiedadesService {
  private apiRoot = 'http://127.0.0.1:8000';
  private baseUrl = `${this.apiRoot}/api`;

  constructor(private http: HttpClient) {}

  // ---- Helpers ----
  private mapearFoto(raw: any): FotoPropiedad {
    const path = raw.url || raw.foto || '';
    const fullUrl = path && !String(path).startsWith('http')
      ? `${this.apiRoot}${path}`
      : path;

    return {
      id: raw.id,
      propiedad: raw.propiedad,
      url: fullUrl,
      orden: raw.orden ?? 0,
      principal: !!raw.principal,
    };
  }

  // --- Mis propiedades ---
  getMisPropiedades(): Observable<MisPropiedad[]> {
    return this.http.get<any>(`${this.baseUrl}/propietario/mis-propiedades/`).pipe(
      map((resp) => {
        const data = Array.isArray(resp) ? resp : resp.results;
        return (data || []) as MisPropiedad[];
      })
    );
  }

  // --- Mis reservas ---
  getMisReservas(): Observable<MisReserva[]> {
    return this.http.get<any>(`${this.baseUrl}/mis-reservas/`).pipe(
      map((resp) => {
        const data = Array.isArray(resp) ? resp : resp.results;
        return (data || []) as MisReserva[];
      })
    );
  }
  cancelarReserva(id: number): Observable<MisReserva> {
  return this.http.post<MisReserva>(`${this.baseUrl}/reservas/${id}/cancelar/`, {});
  }



  // --- Mis contratos ---
  getMisContratos(): Observable<MisContrato[]> {
    return this.http.get<any>(`${this.baseUrl}/mis-contratos/`).pipe(
      map((resp) => {
        const data = Array.isArray(resp) ? resp : resp.results;
        return (data || []) as MisContrato[];
      })
    );
  }

  // --- Mis pagos ---
  getMisPagos(): Observable<MisPago[]> {
    return this.http.get<any>(`${this.baseUrl}/mis-pagos/`).pipe(
      map((resp) => {
        const data = Array.isArray(resp) ? resp : resp.results;
        return (data || []) as MisPago[];
      })
    );
  }

  // --- Crear nueva propiedad ---
  crearPropiedad(payload: NuevaPropiedadPayload) {
    return this.http.post<any>(`${this.baseUrl}/propiedades/`, {
      ...payload,
      orientación: payload.orientación || 'sur',
      estado: payload.estado || 'disponible',
    });
  }

  // --- Obtener propiedad por id (para edición) ---
  getPropiedad(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/propiedades/${id}/`);
  }

  // --- Actualizar propiedad ---
  actualizarPropiedad(id: number, payload: Partial<NuevaPropiedadPayload>) {
    return this.http.patch<any>(`${this.baseUrl}/propiedades/${id}/`, payload);
  }

  //        FOTOS


  // Listar fotos de una propiedad
  listarFotos(propiedadId: number): Observable<FotoPropiedad[]> {
    return this.http
      .get<any>(`${this.baseUrl}/propiedad-fotos/?propiedad=${propiedadId}`)
      .pipe(
        map((resp) => {
          const data = Array.isArray(resp) ? resp : resp.results || resp;
          return (data || []).map((f: any) => this.mapearFoto(f));
        })
      );
  }

  // Subir nueva foto
  subirFoto(propiedadId: number, archivo: File): Observable<FotoPropiedad> {
    const formData = new FormData();
    formData.append('propiedad', String(propiedadId));
    formData.append('foto', archivo);
    // orden opcional: 0, se puede ordenar después
    formData.append('orden', '0');

    return this.http
      .post<any>(`${this.baseUrl}/propiedad-fotos/`, formData)
      .pipe(map((raw) => this.mapearFoto(raw)));
  }

  // Eliminar foto
  eliminarFoto(fotoId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/propiedad-fotos/${fotoId}/`);
  }

  // Marcar foto como principal
  marcarFotoPrincipal(fotoId: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/propiedad-fotos/${fotoId}/marcar_principal/`,
      {}
    );
  }
  // --- Historial de una propiedad ---
  getHistorialPropiedad(id: number) {
    return this.http.get<HistorialEntry[]>(
      `${this.baseUrl}/propiedades/${id}/historial/`
    );
  }

  // --- Perfil ---
  getMiPerfilPropietario() {
    return this.http.get<PerfilPropietario>(`${this.baseUrl}/propietario/mi-perfil/`);
  }

  actualizarMiPerfilPropietario(payload: Partial<PerfilPropietario>) {
    return this.http.put<PerfilPropietario>(`${this.baseUrl}/propietario/mi-perfil/`, payload);
  }


}

