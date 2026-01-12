import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  PropietariosAdminService,
  PropietarioListado,
} from '../../core/services/propietarios-admin.service';

@Component({
  standalone: true,
  selector: 'app-admin-propietarios-list',
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container my-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="mb-0">Propietarios (administrador)</h2>
        <button
          class="btn btn-primary"
          [routerLink]="['/admin/propietarios/nuevo']"

        >
          Crear propietario
        </button>
      </div>
        
      <p class="text-muted mb-3">
        Listado de propietarios registrados en el sistema Manque. Desde aquí el
        administrador puede revisar o actualizar sus datos.
      </p>

      <!-- Filtro simple -->
      <div class="row mb-3">
        <div class="col-md-6">
          <input
            type="text"
            class="form-control"
            placeholder="Buscar por nombre o RUT..."
            [(ngModel)]="filtro"
          />
        </div>
      </div>

      <div *ngIf="cargando" class="alert alert-info">
        Cargando propietarios...
      </div>
      <div *ngIf="error" class="alert alert-danger">
        {{ error }}
      </div>

      <div
        *ngIf="!cargando && propietariosFiltrados.length === 0 && !error"
        class="alert alert-info"
      >
        No hay propietarios que coincidan con el filtro.
      </div>

      <div
        class="table-responsive"
        *ngIf="!cargando && propietariosFiltrados.length > 0"
      >
        <table class="table table-striped align-middle">
          <thead class="table-light">
            <tr>
              <th>Nombre</th>
              <th>RUT</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th class="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of propietariosFiltrados">
              <td>
                {{ p.primer_nombre }} {{ p.segundo_nombre || '' }}
                {{ p.primer_apellido }} {{ p.segundo_apellido || '' }}
              </td>
              <td>{{ p.rut }}</td>
              <td>{{ p.telefono }}</td>
              <td>{{ p.email }}</td>
              <td class="text-end">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  (click)="editar(p.id)"
                >
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
export class AdminPropietariosListComponent implements OnInit {
  propietarios: PropietarioListado[] = [];
  cargando = false;
  error: string | null = null;
  filtro = '';

  constructor(
    private propAdminSvc: PropietariosAdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando = true;
    this.error = null;

    this.propAdminSvc.listar().subscribe({
      next: (data) => {
        this.propietarios = data;
        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudieron cargar los propietarios.';
        this.cargando = false;
      },
    });
  }

  get propietariosFiltrados(): PropietarioListado[] {
    const f = this.filtro.trim().toLowerCase();
    if (!f) return this.propietarios;

    return this.propietarios.filter((p) => {
      const nombre =
        `${p.primer_nombre} ${p.segundo_nombre || ''} ${p.primer_apellido} ${p.segundo_apellido || ''}`.toLowerCase();
      const rut = (p.rut || '').toLowerCase();
      return nombre.includes(f) || rut.includes(f);
    });
  }

  editar(id: number): void {
    this.router.navigate(['/admin/propietarios', id]);
  }
}
