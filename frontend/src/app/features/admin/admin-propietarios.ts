import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PropietariosAdminService,
  PropietarioListado,
} from '../../core/services/propietarios-admin.service';

@Component({
  standalone: true,
  selector: 'app-admin-propietarios',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container my-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 class="mb-0">Propietarios</h2>
          <p class="text-muted mb-0">
            Listado de propietarios registrados en la corredora Manque.
          </p>
        </div>

        <!-- futuro botón crear propietario si lo necesitas -->
        <!--
        <button class="btn btn-primary">
          Nuevo propietario
        </button>
        -->
      </div>

      <!-- Filtros -->
      <div class="row g-2 mb-3">
        <div class="col-12 col-md-4">
          <input
            type="text"
            class="form-control"
            placeholder="Buscar por nombre, RUT o email..."
            [(ngModel)]="busqueda"
            (ngModelChange)="aplicarFiltro()"
          />
        </div>
      </div>

      <!-- Estados -->
      <div *ngIf="cargando" class="alert alert-info">
        Cargando propietarios...
      </div>

      <div *ngIf="error" class="alert alert-danger">
        {{ error }}
      </div>

      <div
        *ngIf="!cargando && !error && propietariosFiltrados.length === 0"
        class="alert alert-info"
      >
        No se encontraron propietarios para los criterios seleccionados.
      </div>

      <!-- Tabla -->
      <div
        class="table-responsive"
        *ngIf="!cargando && !error && propietariosFiltrados.length > 0"
      >
        <table class="table table-striped align-middle">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>RUT</th>
              <th>Teléfono</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of propietariosFiltrados">
              <td>{{ p.id }}</td>
              <td>
                {{ p.primer_nombre }}
                {{ p.segundo_nombre || '' }}
                {{ p.primer_apellido }}
                {{ p.segundo_apellido || '' }}
              </td>
              <td>{{ p.rut }}</td>
              <td>{{ p.telefono }}</td>
              <td>{{ p.email }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AdminPropietariosComponent implements OnInit {
  propietarios: PropietarioListado[] = [];
  propietariosFiltrados: PropietarioListado[] = [];

  cargando = false;
  error: string | null = null;

  busqueda = '';

  constructor(private propietariosSvc: PropietariosAdminService) {}

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando = true;
    this.error = null;

    this.propietariosSvc.listar().subscribe({
      next: (lista) => {
        this.propietarios = lista;
        this.propietariosFiltrados = [...lista];
        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudieron cargar los propietarios.';
        this.cargando = false;
      },
    });
  }

  aplicarFiltro(): void {
    const term = (this.busqueda || '').toLowerCase().trim();
    if (!term) {
      this.propietariosFiltrados = [...this.propietarios];
      return;
    }

    this.propietariosFiltrados = this.propietarios.filter((p) => {
      const texto =
        `${p.primer_nombre} ${p.segundo_nombre || ''} ${p.primer_apellido} ${
          p.segundo_apellido || ''
        } ${p.rut} ${p.email}`.toLowerCase();
      return texto.includes(term);
    });
  }
}
