import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReservaNotaAdmin {
  id: number;
  texto: string;
  created_at: string;
  autor_email?: string | null;
}

export interface AdminReservaMiniUsuario {
  id: number;
  nombre_completo?: string;
  rut?: string;
  email?: string;
  telefono?: string;
}

export interface AdminReserva {
  id: number;
  propiedad: { id: number; titulo: string; codigo?: string } | null;
  interesado: AdminReservaMiniUsuario | null;
  fecha: string;
  expires_at: string | null;
  monto_reserva: string | number;
  notas: string;

  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'expirada' | string;

  notas_admin: ReservaNotaAdmin[];
}

@Injectable({ providedIn: 'root' })
export class AdminReservasService {
  private apiRoot = environment.apiUrl.replace(/\/+$/, '');
  private apiAdminRoot = `${this.apiRoot}/admin`;

  constructor(private http: HttpClient) {}

  listar(estado: string = 'TODAS', extras?: { desde?: string; hasta?: string; search?: string; propiedad_id?: number|string }): Observable<AdminReserva[]> {
    let params = new HttpParams();

    if (estado && estado !== 'TODAS') params = params.set('estado', estado);

    if (extras?.desde) params = params.set('desde', extras.desde);
    if (extras?.hasta) params = params.set('hasta', extras.hasta);
    if (extras?.search) params = params.set('search', extras.search);
    if (extras?.propiedad_id) params = params.set('propiedad_id', String(extras.propiedad_id));

    return this.http.get<any>(`${this.apiAdminRoot}/reservas/`, { params }).pipe(
      map((resp) => Array.isArray(resp) ? resp : (Array.isArray(resp?.results) ? resp.results : []))
    );
  }


  obtener(id: number): Observable<AdminReserva> {
    return this.http.get<AdminReserva>(
      `${this.apiAdminRoot}/reservas/${id}/`
    );
  }
  cancelar(id: number): Observable<AdminReserva> {
    return this.http.post<AdminReserva>(
      `${this.apiAdminRoot}/reservas/${id}/cambiar-estado/`,
      { estado: 'cancelada' }
    );
  }

  agregarNota(id: number, texto: string): Observable<ReservaNotaAdmin> {
    return this.http.post<ReservaNotaAdmin>(
      `${this.apiAdminRoot}/reservas/${id}/agregar-nota/`,
      { texto }
    );
  }
  cambiarEstado(id: number, estado: string) {
    return this.http.post<AdminReserva>(
      `${this.apiAdminRoot}/reservas/${id}/cambiar-estado/`,
      { estado }
    );
  }

  enviarMensaje(id: number, mensaje: string, asunto?: string) {
    const payload: any = { mensaje };
    if (asunto?.trim()) payload.asunto = asunto.trim();

    return this.http.post<{ ok: boolean }>(
      `${this.apiAdminRoot}/reservas/${id}/enviar-mensaje/`,
      payload
    );
  }


}
