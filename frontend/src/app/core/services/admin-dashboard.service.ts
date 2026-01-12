import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminResumen {
  total_propiedades: number;
  total_propietarios: number;
  propiedades_por_aprobar: number;
  reservas_activas: number;
  solicitudes_nuevas: number;
  pagos_mes: number;
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private apiRoot = environment.apiUrl.replace(/\/+$/, '');
  private apiAdminRoot = `${this.apiRoot}/admin`;

  constructor(private http: HttpClient) {}

  getResumen(): Observable<AdminResumen> {
    return this.http.get<AdminResumen>(`${this.apiAdminRoot}/resumen/`);
  }
}
