import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import {
  PropietariosAdminService,
  CrearPropietarioPayload,
  PropietarioListado,
} from '../../core/services/propietarios-admin.service';

@Component({
  standalone: true,
  selector: 'app-admin-propietario-form',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="container my-4">
      <h2 class="mb-3">
        {{ esEdicion ? 'Editar propietario' : 'Crear propietario' }}
      </h2>

      <p class="text-muted mb-4">
        {{ esEdicion
          ? 'Actualiza los datos del propietario seleccionado.'
          : 'Registra un nuevo propietario en el sistema.' }}
      </p>

      <div *ngIf="cargando" class="alert alert-info">Cargando datos...</div>
      <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

      <form
        *ngIf="!cargando"
        [formGroup]="form"
        (ngSubmit)="guardar()"
        class="row g-3"
      >
        <div class="col-md-3">
          <label class="form-label">Primer nombre</label>
          <input type="text" class="form-control" formControlName="primer_nombre" />
          <div class="text-danger small" *ngIf="campoInvalido('primer_nombre')">
            Obligatorio.
          </div>
        </div>

        <div class="col-md-3">
          <label class="form-label">Segundo nombre</label>
          <input type="text" class="form-control" formControlName="segundo_nombre" />
        </div>

        <div class="col-md-3">
          <label class="form-label">Primer apellido</label>
          <input type="text" class="form-control" formControlName="primer_apellido" />
          <div class="text-danger small" *ngIf="campoInvalido('primer_apellido')">
            Obligatorio.
          </div>
        </div>

        <div class="col-md-3">
          <label class="form-label">Segundo apellido</label>
          <input
            type="text"
            class="form-control"
            formControlName="segundo_apellido"
          />
        </div>

        <div class="col-md-4">
          <label class="form-label">RUT</label>
          <input type="text" class="form-control" formControlName="rut" />
          <div class="text-danger small" *ngIf="campoInvalido('rut')">
            Obligatorio (debe ser válido).
          </div>
        </div>

        <div class="col-md-4">
          <label class="form-label">Teléfono</label>
          <input type="text" class="form-control" formControlName="telefono" />
        </div>

        <div class="col-md-4">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" formControlName="email" />
          <div class="text-danger small" *ngIf="campoInvalido('email')">
            Obligatorio.
          </div>
        </div>

        <div class="col-12 d-flex justify-content-end mt-4">
          <button
            type="button"
            class="btn btn-outline-secondary me-2"
            [routerLink]="['/admin/propietarios']"
            [disabled]="guardando"
          >
            Volver
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="guardando"
          >
            {{ guardando ? 'Guardando...' : (esEdicion ? 'Guardar cambios' : 'Crear') }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class AdminPropietarioFormComponent implements OnInit {
  form!: FormGroup;
  cargando = false;
  guardando = false;
  error: string | null = null;
  esEdicion = false;
  idPropietario: number | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private propAdminSvc: PropietariosAdminService
  ) {}

  ngOnInit(): void {
    this.buildForm();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      this.esEdicion = true;
      this.idPropietario = Number(idParam);
      this.cargarPropietario(this.idPropietario);
    }
  }

  private buildForm(): void {
    this.form = this.fb.group({
      primer_nombre: ['', Validators.required],
      segundo_nombre: [''],
      primer_apellido: ['', Validators.required],
      segundo_apellido: [''],
      rut: ['', Validators.required],
      telefono: [''],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  private cargarPropietario(id: number): void {
    this.cargando = true;
    this.error = null;

    this.propAdminSvc.obtener(id).subscribe({
      next: (p: PropietarioListado) => {
        this.form.patchValue({
          primer_nombre: p.primer_nombre,
          segundo_nombre: p.segundo_nombre,
          primer_apellido: p.primer_apellido,
          segundo_apellido: p.segundo_apellido,
          rut: p.rut,
          telefono: p.telefono,
          email: p.email,
        });
        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudieron cargar los datos del propietario.';
        this.cargando = false;
      },
    });
  }

  campoInvalido(campo: string): boolean {
    const c = this.form.get(campo);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: CrearPropietarioPayload = this.form.value;
    this.guardando = true;
    this.error = null;

    if (this.esEdicion && this.idPropietario) {
      this.propAdminSvc.actualizar(this.idPropietario, payload).subscribe({
        next: () => {
          this.guardando = false;
          this.router.navigate(['/admin/propietarios']);
        },
        error: (err) => {
          console.error(err);
          this.error = 'No se pudieron guardar los cambios.';
          this.guardando = false;
        },
      });
    } else {
      this.propAdminSvc.crear(payload).subscribe({
        next: () => {
          this.guardando = false;
          this.router.navigate(['/admin/propietarios']);
        },
        error: (err) => {
          console.error(err);
          const data = err?.error;
          this.error =
            typeof data === 'string'
              ? data
              : JSON.stringify(data || { detail: 'No se pudo crear el propietario.' });
          this.guardando = false;
        },
      });
    }
  }
}
