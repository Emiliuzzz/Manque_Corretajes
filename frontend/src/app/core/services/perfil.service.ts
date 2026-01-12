import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';



export interface PropietarioPerfil {
  id: number;
  primer_nombre: string;
  segundo_nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  rut: string;
  telefono: string;
  email: string;
  calle?: string;
  numero?: string;
  poblacion_o_villa?: string;
  comuna?: string;
  region?: string;
  codigo_postal?: string;
  referencia?: string;
}

export interface ClientePerfil {
  id: number;
  primer_nombre: string;
  segundo_nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  rut: string;
  telefono: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class PerfilService {
  private apiRoot = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  getPerfilPropietario(): Observable<PropietarioPerfil> {
    return this.http.get<PropietarioPerfil>(
      `${this.apiRoot}/propietario/mi-perfil/`
    );
  }

  actualizarPerfilPropietario(
    data: Partial<PropietarioPerfil>
  ): Observable<PropietarioPerfil> {
    return this.http.put<PropietarioPerfil>(
      `${this.apiRoot}/propietario/mi-perfil/`,
      data
    );
  }


  getPerfilCliente(): Observable<ClientePerfil> {
  return this.http.get<ClientePerfil>(
    `${this.apiRoot}/cliente/mi-perfil/`
  );
  }

  actualizarPerfilCliente(
    data: Partial<ClientePerfil>
  ): Observable<ClientePerfil> {
    return this.http.put<ClientePerfil>(
      `${this.apiRoot}/cliente/mi-perfil/`,
      data
    );
  }

  cambiarPassword(data: { password_actual: string; password_nuevo?: string; password_nueva?: string }): Observable<any> {
    return this.http.post(`${this.apiRoot}/mi-perfil/cambiar-password/`, data);
  }
}
