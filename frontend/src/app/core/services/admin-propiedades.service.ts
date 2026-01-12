import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminPropietario {
  id: number;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  rut: string;
  telefono: string;
  email: string;
}

export type EstadoAprobacion = 'pendiente' | 'aprobada' | 'rechazada';

export interface AdminPropiedadResumen {
  id: number;
  titulo: string;
  ciudad: string;
  tipo: string;
  precio: number;
  estado: string;
  estado_aprobacion: EstadoAprobacion;
  tiene_fotos: boolean;
  propietario: {
    primer_nombre: string;
    primer_apellido: string;
    rut: string;
    email: string;
  };
}

export interface NuevaPropiedadAdmin {
  propietario_id: number;
  titulo: string;
  direccion: string;
  ciudad: string;
  descripcion?: string;
  tipo: string;
  dormitorios: number;
  baos: number;
  metros2: number;
  precio: number;
  estado?: string;
  observacion_admin?: string;
  orientacion?: string;
}

export interface PropiedadDocumento {
  id: number;
  propiedad: number;
  tipo: string;
  nombre: string;
  archivo: string; // URL
  created_at: string;
  subido_por?: number;
}

export interface FotoPropiedad {
  id: number;
  propiedad: number;
  url: string;
  orden: number;
  principal: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminPropiedadesService {
  private apiRoot = environment.apiUrl.replace(/\/+$/, '');
  private apiAdminRoot = `${this.apiRoot}/admin`;
  private apiDocs = `${this.apiRoot}/propiedad-documentos`; 
  private apiFotos = `${this.apiRoot}/propiedad-fotos`;
  
  // Base URL del backend (sin /api) para archivos media
  private backendUrl = (() => {
    try {
      const url = new URL(this.apiRoot);
      return url.origin;
    } catch {
      return 'http://127.0.0.1:8000'; // Fallback
    }
  })();

  constructor(private http: HttpClient) {}

  // LISTAR
  getPropiedades(): Observable<AdminPropiedadResumen[]> {
    return this.http.get<any>(`${this.apiAdminRoot}/propiedades/`).pipe(
      map((resp) => {
        const data = Array.isArray(resp) ? resp : resp.results || resp.data || [];
        return (data || []) as AdminPropiedadResumen[];
      })
    );
  }

  // Alias para compatibilidad con componentes
  listar(): Observable<AdminPropiedadResumen[]> {
    return this.getPropiedades();
  }

  // CREAR
  crearPropiedad(data: NuevaPropiedadAdmin): Observable<any> {
    return this.http.post<any>(`${this.apiAdminRoot}/propiedades/`, data);
  }

  // DETALLE
  getPropiedad(id: number): Observable<NuevaPropiedadAdmin & { id: number }> {
    return this.http.get<NuevaPropiedadAdmin & { id: number }>(
      `${this.apiAdminRoot}/propiedades/${id}/`
    );
  }

  // ACTUALIZAR COMPLETA 
  actualizarPropiedad(
    id: number,
    data: Partial<NuevaPropiedadAdmin>
  ): Observable<any> {
    return this.http.put<any>(
      `${this.apiAdminRoot}/propiedades/${id}/`,
      data
    );
  }

  // CAMBIAR SOLO ESTADO_APROBACION
  cambiarEstadoAprobacion(
    id: number,
    estado_aprobacion: EstadoAprobacion
  ): Observable<any> {
    return this.http.patch<any>(
      `${this.apiAdminRoot}/propiedades/${id}/`,
      { estado_aprobacion }
    );
  }

  // HISTORIAL
  getHistorial(id: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiRoot}/propiedades/${id}/historial/`).pipe(
      map((resp) => {
        if (Array.isArray(resp)) return resp;
        return resp?.results ?? resp?.data ?? [];
      })
    );
  }

  // === DOCUMENTOS ===
  getDocumentos(propiedadId: number): Observable<PropiedadDocumento[]> {
    return this.http.get<any>(`${this.apiDocs}/?propiedad=${propiedadId}`).pipe(
      map((resp) => {
        const data = Array.isArray(resp) ? resp : resp.results ?? resp.data ?? [];
        return (data || []).map((d: any) => {
          let archivoUrl = d.archivo;
          if (archivoUrl && !archivoUrl.startsWith('http')) {
             const path = archivoUrl.startsWith('/') ? archivoUrl : `/${archivoUrl}`;
             archivoUrl = `${this.backendUrl}${path}`;
          }
          return { ...d, archivo: archivoUrl };
        });
      })
    );
  }

  subirDocumento(propiedadId: number, file: File, tipo: string, nombre: string): Observable<PropiedadDocumento> {
    const formData = new FormData();
    formData.append('propiedad', String(propiedadId));
    formData.append('archivo', file);
    formData.append('tipo', tipo);
    formData.append('nombre', nombre || '');

    return this.http.post<PropiedadDocumento>(`${this.apiDocs}/`, formData).pipe(
      map((d: any) => {
        let archivoUrl = d.archivo;
        if (archivoUrl && !archivoUrl.startsWith('http')) {
           const path = archivoUrl.startsWith('/') ? archivoUrl : `/${archivoUrl}`;
           archivoUrl = `${this.backendUrl}${path}`;
        }
        return { ...d, archivo: archivoUrl };
      })
    );
  }

  eliminarDocumento(docId: number): Observable<any> {
    return this.http.delete(`${this.apiDocs}/${docId}/`);
  }

  // === FOTOS ===
  private mapearFoto(raw: any): FotoPropiedad {
    let url = raw.url || raw.foto || '';
    if (url && !url.startsWith('http')) {
      const path = url.startsWith('/') ? url : `/${url}`;
      url = `${this.backendUrl}${path}`;
    }

    return {
      id: raw.id,
      propiedad: raw.propiedad,
      url: url,
      orden: raw.orden ?? 0,
      principal: !!raw.principal,
    };
  }

  listarFotos(propiedadId: number): Observable<FotoPropiedad[]> {
    return this.http.get<any>(`${this.apiFotos}/?propiedad=${propiedadId}`).pipe(
      map((resp) => {
        const data = Array.isArray(resp) ? resp : resp.results || resp.data || [];
        return (data || []).map((f: any) => this.mapearFoto(f));
      })
    );
  }

  subirFoto(propiedadId: number, archivo: File): Observable<FotoPropiedad> {
    const formData = new FormData();
    formData.append('propiedad', String(propiedadId));
    formData.append('foto', archivo);
    formData.append('orden', '0');

    return this.http.post<any>(`${this.apiFotos}/`, formData).pipe(
      map((raw) => this.mapearFoto(raw))
    );
  }

  eliminarFoto(fotoId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiFotos}/${fotoId}/`);
  }

  marcarFotoPrincipal(fotoId: number): Observable<any> {
    return this.http.post<any>(`${this.apiFotos}/${fotoId}/marcar_principal/`, {});
  }
}
