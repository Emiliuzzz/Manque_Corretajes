import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import {
  AdminUsuariosService,
  AdminUsuario,
  RolUsuario,
} from '../../../core/services/admin-usuarios.service';

@Component({
  standalone: true,
  selector: 'app-admin-usuarios-list',
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container my-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="mb-1">Gestión de usuarios</h2>
          <p class="text-muted mb-0">Administra cuentas y perfiles asociados.</p>
        </div>
        
        <button class="btn btn-primary" (click)="crearNuevo()">
          Crear usuario + perfil
        </button>
      </div>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          (click)="irPanel()"
        >
          ← Volver al panel de administración
        </button>


      <div class="row g-2 mb-3">
        <div class="col-12 col-md-3">
          <label class="form-label">Rol</label>
          <select class="form-select" [(ngModel)]="rol" (change)="cargar()">
            <option value="TODOS">Todos</option>
            <option value="ADMIN">Admin</option>
            <option value="PROPIETARIO">Propietario</option>
            <option value="CLIENTE">Cliente</option>
          </select>
        </div>

        <div class="col-12 col-md-6">
          <label class="form-label">Buscar</label>
          <input
            class="form-control"
            placeholder="Email, username, nombre, rut, teléfono..."
            [(ngModel)]="search"
            (keyup.enter)="cargar()"
          />
        </div>

        <div class="col-12 col-md-3 d-flex align-items-end gap-2">
          <button class="btn btn-outline-primary w-100" (click)="cargar()">
            Buscar
          </button>
          <button class="btn btn-outline-secondary" (click)="limpiar()">
            Limpiar
          </button>
        </div>
      </div>

      <div *ngIf="cargando" class="alert alert-info">Cargando usuarios...</div>
      <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

      <div *ngIf="!cargando && !error && usuarios.length === 0" class="alert alert-info">
        No hay usuarios para el filtro seleccionado.
      </div>

      <div class="table-responsive" *ngIf="!cargando && !error && usuarios.length > 0">
        <table class="table table-striped align-middle">
          <thead class="table-light">
            <tr>
              <th>Cuenta</th>
              <th>Rol</th>
              <th>Activo</th>
              <th>Aprobado</th>
              <th>Perfil</th>
              <th class="text-end">Acciones</th>
            </tr>
          </thead>

          <tbody>
            <tr *ngFor="let u of usuarios">
              <td>
                <div class="fw-semibold">{{ u.email || u.username }}</div>
                <div class="text-muted small">username: {{ u.username }}</div>
              </td>
              <td>{{ u.rol }}</td>
              <td>
                <span class="badge" [ngClass]="u.is_active ? 'bg-success' : 'bg-secondary'">
                  {{ u.is_active ? 'SI' : 'NO' }}
                </span>
              </td>
              <td>
                <span class="badge" [ngClass]="u.aprobado ? 'bg-success' : 'bg-warning text-dark'">
                  {{ u.aprobado ? 'SI' : 'NO' }}
                </span>
              </td>
              <td>
                <div *ngIf="u.perfil; else sinPerfil">
                  <div class="fw-semibold">{{ u.perfil.tipo }}</div>
                  <div class="text-muted small">
                    {{ u.perfil.nombre || '' }}
                    <span *ngIf="u.perfil.rut">· {{ u.perfil.rut }}</span>
                  </div>
                </div>
                <ng-template #sinPerfil>
                  <span class="text-muted small">Sin perfil asociado</span>
                </ng-template>
              </td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary" (click)="editar(u.id)">
                  Ver / editar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AdminUsuariosListComponent implements OnInit {
  usuarios: AdminUsuario[] = [];
  cargando = false;
  error: string | null = null;

  rol: RolUsuario = 'TODOS';
  search = '';

  constructor(private svc: AdminUsuariosService, private router: Router) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;

    this.svc.listar(this.rol, this.search).subscribe({
      next: (data) => {
        this.usuarios = data || [];
        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudieron cargar los usuarios.';
        this.cargando = false;
      },
    });
  }

  limpiar(): void {
    this.rol = 'TODOS';
    this.search = '';
    this.cargar();
  }

  editar(id: number): void {
    this.router.navigate(['/admin/usuarios', id]);
  }
  crearNuevo() {
    this.router.navigate(['/admin/usuarios/nuevo']);
  }
  irPanel(): void {
    this.router.navigate(['/admin']);
  }
}



