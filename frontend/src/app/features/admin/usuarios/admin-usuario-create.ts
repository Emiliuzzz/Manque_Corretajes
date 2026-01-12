import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import {
  AdminUsuariosService,
  AdminUsuarioCreatePayload,
} from '../../../core/services/admin-usuarios.service';

@Component({
  standalone: true,
  selector: 'app-admin-usuario-create',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="container my-4">
      <h2 class="mb-2">Crear usuario</h2>
      <p class="text-muted mb-4">
        Crea una nueva cuenta de usuario y, según el rol, el perfil asociado:
        <strong>Propietario</strong> o <strong>Cliente</strong>.
      </p>

      <form [formGroup]="form" (ngSubmit)="guardar()" class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title mb-3">Datos de la cuenta</h5>

          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Email (login)</label>
              <input
                class="form-control"
                type="email"
                formControlName="email"
                placeholder="usuario@correo.com"
              />
              <div class="text-danger small" *ngIf="campoInvalido('email')">
                Email obligatorio y válido.
              </div>
            </div>

            <div class="col-md-3">
              <label class="form-label">Rol</label>
              <select class="form-select" formControlName="rol">
                <option value="ADMIN">ADMIN</option>
                <option value="PROPIETARIO">PROPIETARIO</option>
                <option value="CLIENTE">CLIENTE</option>
              </select>
            </div>

            <div class="col-md-3">
              <label class="form-label">Contraseña inicial</label>
              <input
                class="form-control"
                type="text"
                formControlName="password"
                placeholder="Opcional (por defecto se usa el RUT)"
              />
            </div>

            <div class="col-md-3">
              <label class="form-label">Activo</label>
              <select class="form-select" formControlName="is_active">
                <option [ngValue]="true">SI</option>
                <option [ngValue]="false">NO</option>
              </select>
            </div>

            <div class="col-md-3">
              <label class="form-label">Aprobado</label>
              <select class="form-select" formControlName="aprobado">
                <option [ngValue]="true">SI</option>
                <option [ngValue]="false">NO</option>
              </select>
            </div>
          </div>

          <hr class="my-4" />

          <!-- PERFIL BÁSICO (para propietario / cliente) -->
          <h5 class="card-title mb-2">Perfil (nombre, RUT y teléfono)</h5>
          <p class="text-muted mb-3">
            El administrador crea el perfil básico. La dirección la completa el propietario desde su perfil.
          </p>

          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">RUT</label>
              <input
                class="form-control"
                formControlName="rut"
                placeholder="11.111.111-1"
              />
              <div class="text-danger small" *ngIf="campoInvalido('rut')">
                RUT obligatorio para Propietario / Cliente.
              </div>
            </div>

            <div class="col-md-4">
              <label class="form-label">Teléfono</label>
              <input
                class="form-control"
                formControlName="telefono"
                placeholder="9XXXXXXXX"
              />
              <div class="text-danger small" *ngIf="campoInvalido('telefono')">
                Teléfono obligatorio para Propietario / Cliente.
              </div>
            </div>

            <div class="col-md-4">
              <label class="form-label">Primer nombre</label>
              <input class="form-control" formControlName="primer_nombre" />
              <div class="text-danger small" *ngIf="campoInvalido('primer_nombre')">
                Obligatorio para Propietario / Cliente.
              </div>
            </div>

            <div class="col-md-4">
              <label class="form-label">Segundo nombre</label>
              <input class="form-control" formControlName="segundo_nombre" />
            </div>

            <div class="col-md-4">
              <label class="form-label">Primer apellido</label>
              <input class="form-control" formControlName="primer_apellido" />
              <div class="text-danger small" *ngIf="campoInvalido('primer_apellido')">
                Obligatorio para Propietario / Cliente.
              </div>
            </div>

            <div class="col-md-4">
              <label class="form-label">Segundo apellido</label>
              <input class="form-control" formControlName="segundo_apellido" />
            </div>
          </div>

          <div *ngIf="error" class="alert alert-danger mt-3">
            {{ error }}
          </div>
          <div *ngIf="exito" class="alert alert-success mt-3">
            Usuario creado correctamente.
          </div>

          <div class="d-flex justify-content-between mt-4">
            <button
              type="button"
              class="btn btn-outline-secondary"
              (click)="volver()"
              [disabled]="guardando"
            >
              Volver
            </button>

            <button type="submit" class="btn btn-primary" [disabled]="guardando">
              {{ guardando ? 'Creando...' : 'Crear usuario' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
})
export class AdminUsuarioCreateComponent {
  form: FormGroup;

  guardando = false;
  error: string | null = null;
  exito = false;

  constructor(
    private fb: FormBuilder,
    private svc: AdminUsuariosService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      rol: ['CLIENTE', Validators.required],
      password: [''],

      is_active: [true, Validators.required],
      aprobado: [true, Validators.required],

      primer_nombre: [''],
      segundo_nombre: [''],
      primer_apellido: [''],
      segundo_apellido: [''],
      rut: [''],
      telefono: [''],
    });
  }

  campoInvalido(campo: string): boolean {
    const c = this.form.get(campo);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  guardar(): void {
    this.error = null;
    this.exito = false;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
     const rol = ((v.rol || 'CLIENTE') as 'ADMIN' | 'PROPIETARIO' | 'CLIENTE');

    // Validación extra para no-admin
    if (rol !== 'ADMIN') {
      if (!v.rut || !v.telefono || !v.primer_nombre || !v.primer_apellido) {
        this.error =
          'Para propietarios y clientes el RUT, teléfono, primer nombre y primer apellido son obligatorios.';
        return;
      }
    }

    const payload: AdminUsuarioCreatePayload = {
      email: (v.email || '').trim().toLowerCase(),
      rol,
      password: v.password || undefined,
      is_active: v.is_active,
      aprobado: v.aprobado,

      primer_nombre: v.primer_nombre || '',
      segundo_nombre: v.segundo_nombre || '',
      primer_apellido: v.primer_apellido || '',
      segundo_apellido: v.segundo_apellido || '',
      rut: v.rut || '',
      telefono: v.telefono || '',
    };

    this.guardando = true;

    this.svc.crear(payload).subscribe({
      next: (u) => {
        this.guardando = false;
        this.exito = true;
        this.router.navigate(['/admin/usuarios', u.id]);
      },
      error: (err) => {
        console.error(err);
        this.guardando = false;
        this.error =
          'No se pudo crear el usuario. Revisa que el email y el RUT no estén ya registrados.';
      },
    });
  }

  volver(): void {
    this.router.navigate(['/admin/usuarios']);
  }
}
