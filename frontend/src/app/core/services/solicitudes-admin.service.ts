import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminSolicitudInteresado {
  id: number;
  nombre_completo: string;
  rut: string;
  email: string;
  telefono: string;
}

export interface AdminSolicitud {
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
  interesado: AdminSolicitudInteresado;
}

@Injectable({ providedIn: 'root' })
export class SolicitudesAdminService {
  private apiRoot = environment.apiUrl.replace(/\/+$/, '');
  private apiAdminRoot = `${this.apiRoot}/admin`;

  constructor(private http: HttpClient) {}

  /** Lista de solicitudes de clientes */
  getSolicitudes(): Observable<AdminSolicitud[]> {
    return this.http
      .get<any>(`${this.apiAdminRoot}/solicitudes/`)
      .pipe(
        map((resp) => {
          const data = Array.isArray(resp) ? resp : resp.results || resp.data || [];
          return (data || []) as AdminSolicitud[];
        })
      );
  }

  /** Actualizar solo el estado de una solicitud */
  actualizarEstado(id: number, estado: string): Observable<AdminSolicitud> {
    return this.http.post<AdminSolicitud>(
      `${this.apiAdminRoot}/solicitudes/${id}/cambiar-estado/`,
      { estado }
    );
  }
}
