import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

/* =========================
 * TIPOS Y MODELOS
 * ========================= */

export type RolUsuario = 'TODOS' | 'ADMIN' | 'PROPIETARIO' | 'CLIENTE';

export interface AdminUsuarioPerfil {
  tipo: 'PROPIETARIO' | 'CLIENTE' | 'ADMIN' | string;
  id?: number;
  nombre?: string;
  rut?: string;
  telefono?: string;
  email?: string;

  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;

  direccion_principal?: {
    id?: number;
    calle_o_pasaje?: string;
    numero?: string;
    poblacion_o_villa?: string;

    // si tu API los devuelve, quedan disponibles
    comuna_id?: number;
    region_id?: number;

    // ideal: nombres para mostrar
    comuna_nombre?: string;
    region_nombre?: string;

    referencia?: string;
    codigo_postal?: string;
  } | null;
}

export interface AdminUsuario {
  id: number;
  username: string;
  email: string;
  rol: 'ADMIN' | 'PROPIETARIO' | 'CLIENTE' | string;
  is_active: boolean;
  aprobado: boolean;
  perfil: AdminUsuarioPerfil | null;
}

export interface AdminUsuarioUpdatePayload {
  email?: string;
  rol?: 'ADMIN' | 'PROPIETARIO' | 'CLIENTE';
  is_active?: boolean;
  aprobado?: boolean;

  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  telefono?: string;
}

export interface AdminUsuarioCrearPerfilPayload {
  rut: string;
  telefono: string;
  primer_nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  fecha_registro?: string;
}

export interface AdminUsuarioCreatePayload {
  email: string;
  rol: 'ADMIN' | 'PROPIETARIO' | 'CLIENTE';
  password?: string;

  is_active?: boolean;
  aprobado?: boolean;

  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  rut?: string;
  telefono?: string;
}

/* =========================
 * SERVICE
 * ========================= */

@Injectable({ providedIn: 'root' })
export class AdminUsuariosService {
  private apiRoot = environment.apiUrl.replace(/\/+$/, '');
  private apiAdminRoot = `${this.apiRoot}/admin`;

  constructor(private http: HttpClient) {}

  /* =========================
   * LISTAR USUARIOS
   * ========================= */

  listar(rol: RolUsuario = 'TODOS', search: string = ''): Observable<AdminUsuario[]> {
    let params = new HttpParams();

    if (rol) params = params.set('rol', rol);
    if (search) params = params.set('search', search);

    return this.http
      .get<any>(`${this.apiAdminRoot}/usuarios/`, { params })
      .pipe(
        map((resp) => {
          const data = Array.isArray(resp) ? resp : resp.results || resp.data || [];
          return (data || []) as AdminUsuario[];
        })
      );
  }

  /* =========================
   * OBTENER USUARIO
   * ========================= */

  obtener(id: number): Observable<AdminUsuario> {
    return this.http.get<AdminUsuario>(`${this.apiAdminRoot}/usuarios/${id}/`);
  }

  /* =========================
   * ACTUALIZAR USUARIO + PERFIL
   * ========================= */

  actualizar(id: number, payload: AdminUsuarioUpdatePayload): Observable<AdminUsuario> {
    return this.http.put<AdminUsuario>(`${this.apiAdminRoot}/usuarios/${id}/`, payload);
  }

  /* =========================
   * ACTIVAR / DESACTIVAR
   * ========================= */

  activar(id: number): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.apiAdminRoot}/usuarios/${id}/activar/`, {});
  }

  desactivar(id: number): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.apiAdminRoot}/usuarios/${id}/desactivar/`, {});
  }

  /* =========================
   * CREAR PERFIL PARA USUARIO EXISTENTE
   * ========================= */

  crearPerfil(id: number, payload: AdminUsuarioCrearPerfilPayload): Observable<AdminUsuario> {
    return this.http.post<AdminUsuario>(
      `${this.apiAdminRoot}/usuarios/${id}/crear-perfil/`,
      payload
    );
  }

  /* =========================
   * CREAR USUARIO + PERFIL DESDE CERO
   * ========================= */

  crear(payload: AdminUsuarioCreatePayload): Observable<AdminUsuario> {
    return this.http.post<AdminUsuario>(`${this.apiAdminRoot}/usuarios/`, payload);
  }
}
