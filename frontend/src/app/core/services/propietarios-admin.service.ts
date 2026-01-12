import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PropietarioListado {
  id: number;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  rut: string;
  telefono: string;
  email: string;
}

export interface CrearPropietarioPayload {
  primer_nombre: string;
  segundo_nombre?: string | null;
  primer_apellido: string;
  segundo_apellido?: string | null;
  rut: string;
  telefono: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class PropietariosAdminService {
  private apiRoot = environment.apiUrl.replace(/\/+$/, '');
  private apiAdminRoot = `${this.apiRoot}/admin`;

  constructor(private http: HttpClient) {}

  /** Listado completo  */
  listar(): Observable<PropietarioListado[]> {
    return this.http.get<any>(`${this.apiAdminRoot}/propietarios/`).pipe(
      map((resp) => {
        const data = Array.isArray(resp) ? resp : resp.results || resp.data || [];
        return (data || []) as PropietarioListado[];
      })
    );
  }

  /** Crear propietario nuevo */
  crear(data: CrearPropietarioPayload): Observable<PropietarioListado> {
    return this.http.post<PropietarioListado>(
      `${this.apiAdminRoot}/propietarios/`,
      data
    );
  }

  /** Obtener un propietario por id */
  obtener(id: number): Observable<PropietarioListado> {
    return this.http.get<PropietarioListado>(
      `${this.apiAdminRoot}/propietarios/${id}/`
    );
  }

  /** Actualizar propietario existente */
  actualizar(
    id: number,
    data: Partial<CrearPropietarioPayload>
  ): Observable<PropietarioListado> {
    return this.http.put<PropietarioListado>(
      `${this.apiAdminRoot}/propietarios/${id}/`,
      data
    );
  }
}
