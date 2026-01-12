import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { AuthService } from '../../core/services/auth.service';
import { PerfilService } from '../../core/services/perfil.service';
import { PerfilPropietarioComponent } from '../propietario/perfil-propietario';
import { PerfilClienteComponent } from '../cliente/perfil-cliente';

@Component({
  standalone: true,
  selector: 'app-perfil',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PerfilPropietarioComponent,
    PerfilClienteComponent,
  ],
  template: `


      <div class="card mb-3 shadow-sm">
        <div class="card-body">
          <h5 class="mb-3">Cambiar contraseña</h5>

          <form [formGroup]="passwordForm" (ngSubmit)="cambiarPassword()">
            <div class="mb-3">
              <label class="form-label">Contraseña actual</label>
              <input
                type="password"
                class="form-control"
                formControlName="password_actual"
              />
              <div class="text-danger small" *ngIf="campoInvalido('password_actual')">
                Obligatorio.
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Nueva contraseña</label>
              <input
                type="password"
                class="form-control"
                formControlName="password_nueva"
              />
              <div class="text-danger small" *ngIf="campoInvalido('password_nueva')">
                Debe tener al menos 8 caracteres.
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Confirmar nueva contraseña</label>
              <input
                type="password"
                class="form-control"
                formControlName="password_confirmar"
              />
              <div class="text-danger small" *ngIf="campoInvalido('password_confirmar')">
                Obligatorio.
              </div>
              <div class="text-danger small" *ngIf="passwordNoCoincide()">
                Las contraseñas no coinciden.
              </div>
            </div>

            <div *ngIf="errorPassword" class="alert alert-danger">
              {{ errorPassword }}
            </div>
            <div *ngIf="exitoPassword" class="alert alert-success">
              Contraseña actualizada correctamente.
            </div>

            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="guardandoPassword"
            >
              {{ guardandoPassword ? 'Guardando...' : 'Cambiar contraseña' }}
            </button>
          </form>
        </div>
      </div>

      <div *ngIf="user.rol === 'PROPIETARIO'" class="mt-3">
        <app-perfil-propietario></app-perfil-propietario>
      </div>

      <div *ngIf="user.rol === 'CLIENTE'" class="mt-3">
        <div class="alert alert-info">
          Actualmente tu rol es <strong>CLIENTE</strong>. Desde esta página puedes
          completar tus datos de cliente y enviar nuevas solicitudes a la corredora.
        </div>

        <app-perfil-cliente></app-perfil-cliente>
      </div>

      <div
        *ngIf="user.rol !== 'PROPIETARIO' && user.rol !== 'CLIENTE'"
        class="alert alert-info mt-3"
      >
        Actualmente tu rol es <strong>{{ user.rol }}</strong>.
        Si necesitas otro tipo de acceso, contacta al administrador.
      </div>

    <ng-template #sinUser>
      <div class="container mt-4">
        <div class="alert alert-warning">
          No hay información de usuario. Inicia sesión nuevamente.
        </div>
      </div>
    </ng-template>
  `,
})
export class PerfilComponent {
  user: any = null;

  passwordForm!: FormGroup;

  guardandoPassword = false;
  errorPassword: string | null = null;
  exitoPassword = false;

  constructor(
    private auth: AuthService,
    private perfilSvc: PerfilService,
    private fb: FormBuilder
  ) {
    this.user = this.auth.getPayload();

    this.passwordForm = this.fb.group({
      password_actual: ['', Validators.required],
      password_nueva: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmar: ['', Validators.required],
    });
  }

  campoInvalido(campo: string): boolean {
    const c = this.passwordForm.get(campo);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  passwordNoCoincide(): boolean {
    const a = this.passwordForm.get('password_nueva')?.value || '';
    const b = this.passwordForm.get('password_confirmar')?.value || '';
    if (!a || !b) return false;
    return a !== b;
  }

  cambiarPassword(): void {
    this.exitoPassword = false;
    this.errorPassword = null;

    if (this.passwordForm.invalid || this.passwordNoCoincide()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.guardandoPassword = true;

    const payload = {
      password_actual: this.passwordForm.value.password_actual,
      password_nueva: this.passwordForm.value.password_nueva,
    };

    this.perfilSvc.cambiarPassword(payload).subscribe({
      next: () => {
        this.guardandoPassword = false;
        this.exitoPassword = true;
        this.passwordForm.reset();
      },
      error: (err) => {
        this.guardandoPassword = false;
        this.errorPassword =
          err?.error?.detail ||
          err?.error?.message ||
          'No se pudo cambiar la contraseña.';
      },
    });
  }
}
