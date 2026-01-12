import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Notificacion {
  id: number;
  usuario: number | null;
  titulo: string;
  mensaje: string;
  tipo: 'RESERVA' | 'VISITA' | 'PAGO' | 'SISTEMA' | string;
  leida: boolean;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificacionesService {
  private apiRoot = 'http://127.0.0.1:8000/api';
  private baseUrl = `${this.apiRoot}/notificaciones/`;

  constructor(private http: HttpClient) {}

  listar(filtro?: { tipo?: string; leida?: boolean }): Observable<Notificacion[]> {
    let params = new HttpParams();
    if (filtro?.tipo) params = params.set('tipo', filtro.tipo);
    if (filtro?.leida !== undefined) params = params.set('leida', String(filtro.leida));

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map((resp) => {
        const data = Array.isArray(resp) ? resp : resp.results;
        return (data || []) as Notificacion[];
      })
    );
  }

  marcarLeida(id: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}${id}/leer/`, {});
  }

  marcarTodas(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}marcar-todas/`, {});
  }
}
