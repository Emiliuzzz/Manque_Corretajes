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
  AdminUsuariosService,
  AdminUsuario,
  AdminUsuarioUpdatePayload,
  AdminUsuarioCrearPerfilPayload,
} from '../../../core/services/admin-usuarios.service';

@Component({
  standalone: true,
  selector: 'app-admin-usuario-form',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="container my-4">
      <h2 class="mb-2">Editar usuario</h2>
      <p class="text-muted mb-4">
        Administra la cuenta (email, rol, estado) y el perfil asociado
        (Propietario/Cliente). Si no existe perfil, puedes crearlo desde aquí.
        El RUT no se puede modificar una vez creado.
      </p>

      <div *ngIf="cargando" class="alert alert-info">Cargando usuario...</div>
      <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

      <ng-container *ngIf="!cargando && user">
        <!-- ===================== FORM CUENTA + EDICION PERFIL ===================== -->
        <form [formGroup]="form" (ngSubmit)="guardar()" class="card shadow-sm mb-4">
          <div class="card-body">
            <h5 class="card-title mb-3">Datos de la cuenta</h5>

            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Email (login)</label>
                <input class="form-control" formControlName="email" type="email" />
                <div class="text-danger small" *ngIf="campoInvalido('email')">
                  Email inválido.
                </div>
              </div>

              <div class="col-md-3">
                <label class="form-label">Rol</label>
                <select class="form-select" formControlName="rol">
                  <option value="ADMIN">ADMIN</option>
                  <option value="PROPIETARIO">PROPIETARIO</option>
                  <option value="CLIENTE">CLIENTE</option>
                </select>
                <small class="text-muted d-block mt-1">
                  Si cambias el rol, el sistema migrará el perfil automáticamente (sin dirección).
                </small>
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

            <h5 class="card-title mb-3">Perfil asociado</h5>

            <!-- Aviso si no hay perfil -->
            <div class="alert alert-warning" *ngIf="user.rol !== 'ADMIN' && !user.perfil">
              Este usuario no tiene perfil asociado (Propietario/Cliente). Puedes
              crearlo más abajo. Si cambias el email, asegúrate de que coincida
              con el email del perfil.
            </div>

            <!-- Resumen de perfil (si existe) -->
            <div class="row g-3 mb-2" *ngIf="user.rol !== 'ADMIN' && user.perfil">
              <div class="col-md-3">
                <label class="form-label">Tipo perfil</label>
                <input class="form-control" [value]="user.perfil.tipo || '—'" disabled />
              </div>

              <div class="col-md-3">
                <label class="form-label">RUT</label>
                <input class="form-control" [value]="user.perfil.rut || '—'" disabled />
              </div>

              <div class="col-md-6">
                <label class="form-label">Email perfil</label>
                <input class="form-control" [value]="user.perfil.email || '—'" disabled />
              </div>
            </div>

            <!-- Campos editables del perfil -->
            <div class="row g-3" *ngIf="(form.get('rol')?.value || user.rol) !== 'ADMIN'">
              <div class="col-md-6">
                <label class="form-label">Teléfono</label>
                <input class="form-control" formControlName="telefono" type="text" />
              </div>

              <div class="col-md-3">
                <label class="form-label">Primer nombre</label>
                <input class="form-control" formControlName="primer_nombre" type="text" />
              </div>

              <div class="col-md-3">
                <label class="form-label">Segundo nombre</label>
                <input class="form-control" formControlName="segundo_nombre" type="text" />
              </div>

              <div class="col-md-3">
                <label class="form-label">Primer apellido</label>
                <input class="form-control" formControlName="primer_apellido" type="text" />
              </div>

              <div class="col-md-3">
                <label class="form-label">Segundo apellido</label>
                <input class="form-control" formControlName="segundo_apellido" type="text" />
              </div>
            </div>

            <!-- Dirección (SOLO LECTURA) si existe y es propietario -->
            <div class="mt-4 border-top pt-3" *ngIf="user.perfil?.tipo === 'PROPIETARIO'">
              <h5 class="card-title mb-2">Dirección principal (solo lectura)</h5>
              <p class="text-muted mb-3">
                La dirección la gestiona el propietario desde su perfil. Aquí solo se muestra si existe.
              </p>

              <ng-container *ngIf="user?.perfil?.direccion_principal as dir; else sinDireccion">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Calle / pasaje</label>
                    <input class="form-control" [value]="dir.calle_o_pasaje || ''" disabled />
                  </div>

                  <div class="col-md-2">
                    <label class="form-label">Número</label>
                    <input class="form-control" [value]="dir.numero || ''" disabled />
                  </div>

                  <div class="col-md-4">
                    <label class="form-label">Población / villa</label>
                    <input class="form-control" [value]="dir.poblacion_o_villa || ''" disabled />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label">Comuna</label>
                    <input class="form-control" [value]="dir.comuna_nombre || ''" disabled />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label">Región</label>
                    <input class="form-control" [value]="dir.region_nombre || ''" disabled />
                  </div>

                  <div class="col-md-6">
                    <label class="form-label">Referencia</label>
                    <input class="form-control" [value]="dir.referencia || ''" disabled />
                  </div>

                  <div class="col-md-3">
                    <label class="form-label">Código postal</label>
                    <input class="form-control" [value]="dir.codigo_postal || ''" disabled />
                  </div>
                </div>
              </ng-container>

              <ng-template #sinDireccion>
                <div class="text-muted">Sin dirección registrada.</div>
              </ng-template>

            </div>

            <div *ngIf="exito" class="alert alert-success mt-3">
              Cambios guardados correctamente.
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

              <div class="d-flex gap-2">
                <button
                  type="button"
                  class="btn btn-outline-danger"
                  (click)="toggleActivo(false)"
                  [disabled]="guardando"
                >
                  Desactivar
                </button>

                <button
                  type="button"
                  class="btn btn-outline-success"
                  (click)="toggleActivo(true)"
                  [disabled]="guardando"
                >
                  Activar
                </button>

                <button type="submit" class="btn btn-primary" [disabled]="guardando">
                  {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
                </button>
              </div>
            </div>

            <div *ngIf="errorForm" class="alert alert-danger mt-3">
              {{ errorForm }}
            </div>
          </div>
        </form>

        <!-- ===================== CREAR PERFIL SI NO EXISTE ===================== -->
        <div class="card shadow-sm" *ngIf="user.rol !== 'ADMIN' && !user.perfil">
          <div class="card-body">
            <h5 class="card-title mb-2">Crear perfil asociado</h5>
            <p class="text-muted mb-3">
              Se creará un perfil
              <strong>
                {{ (form.get('rol')?.value === 'PROPIETARIO')
                   ? 'Propietario'
                   : 'Cliente (Interesado)' }}
              </strong>
              usando el email de la cuenta.
            </p>

            <form [formGroup]="crearPerfilForm" (ngSubmit)="crearPerfil()">
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">RUT</label>
                  <input class="form-control" formControlName="rut" placeholder="11.111.111-1" />
                  <div class="text-danger small" *ngIf="campoInvalidoCrear('rut')">
                    RUT obligatorio.
                  </div>
                </div>

                <div class="col-md-4">
                  <label class="form-label">Teléfono</label>
                  <input class="form-control" formControlName="telefono" placeholder="9XXXXXXXX" />
                  <div class="text-danger small" *ngIf="campoInvalidoCrear('telefono')">
                    Teléfono obligatorio.
                  </div>
                </div>

                <div class="col-md-4">
                  <label class="form-label">Primer nombre</label>
                  <input class="form-control" formControlName="primer_nombre" />
                  <div class="text-danger small" *ngIf="campoInvalidoCrear('primer_nombre')">
                    Obligatorio.
                  </div>
                </div>

                <div class="col-md-4">
                  <label class="form-label">Segundo nombre</label>
                  <input class="form-control" formControlName="segundo_nombre" />
                </div>

                <div class="col-md-4">
                  <label class="form-label">Primer apellido</label>
                  <input class="form-control" formControlName="primer_apellido" />
                  <div class="text-danger small" *ngIf="campoInvalidoCrear('primer_apellido')">
                    Obligatorio.
                  </div>
                </div>

                <div class="col-md-4">
                  <label class="form-label">Segundo apellido</label>
                  <input class="form-control" formControlName="segundo_apellido" />
                </div>
              </div>

              <div class="d-flex justify-content-end mt-4">
                <button class="btn btn-success" type="submit" [disabled]="creandoPerfil">
                  {{ creandoPerfil ? 'Creando...' : 'Crear perfil' }}
                </button>
              </div>

              <div *ngIf="errorCrearPerfil" class="alert alert-danger mt-3">
                {{ errorCrearPerfil }}
              </div>

              <div *ngIf="exitoCrearPerfil" class="alert alert-success mt-3">
                Perfil creado y asociado correctamente.
              </div>
            </form>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class AdminUsuarioFormComponent implements OnInit {
  userId: number | null = null;
  user: AdminUsuario | null = null;

  form!: FormGroup;
  crearPerfilForm!: FormGroup;

  cargando = false;
  guardando = false;

  creandoPerfil = false;
  exitoCrearPerfil = false;
  errorCrearPerfil: string | null = null;

  error: string | null = null;
  errorForm: string | null = null;
  exito = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private svc: AdminUsuariosService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.userId = id ? Number(id) : null;

    this.buildForm();
    this.buildCrearPerfilForm();
    this.cargar();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      rol: ['CLIENTE', Validators.required],
      is_active: [true, Validators.required],
      aprobado: [true, Validators.required],

      primer_nombre: [''],
      segundo_nombre: [''],
      primer_apellido: [''],
      segundo_apellido: [''],
      telefono: [''],
    });
  }

  private buildCrearPerfilForm(): void {
    this.crearPerfilForm = this.fb.group({
      rut: ['', Validators.required],
      telefono: ['', Validators.required],
      primer_nombre: ['', Validators.required],
      segundo_nombre: [''],
      primer_apellido: ['', Validators.required],
      segundo_apellido: [''],
    });
  }

  private cargar(): void {
    if (!this.userId) {
      this.error = 'ID de usuario inválido.';
      return;
    }

    this.cargando = true;
    this.error = null;

    this.svc.obtener(this.userId).subscribe({
      next: (u) => {
        this.user = u;

        const perfil = u.perfil;

        this.form.patchValue({
          email: u.email || '',
          rol: (u.rol || 'CLIENTE').toUpperCase(),
          is_active: !!u.is_active,
          aprobado: !!u.aprobado,

          primer_nombre: perfil?.primer_nombre || '',
          segundo_nombre: perfil?.segundo_nombre || '',
          primer_apellido: perfil?.primer_apellido || '',
          segundo_apellido: perfil?.segundo_apellido || '',
          telefono: perfil?.telefono || '',
        });

        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudo cargar el usuario.';
        this.cargando = false;
      },
    });
  }

  campoInvalido(campo: string): boolean {
    const c = this.form.get(campo);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  campoInvalidoCrear(campo: string): boolean {
    const c = this.crearPerfilForm.get(campo);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  guardar(): void {
    if (!this.userId) return;

    this.errorForm = null;
    this.exito = false;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    const v = this.form.value;

    const payload: AdminUsuarioUpdatePayload = {
      email: (v.email || '').trim().toLowerCase(),
      rol: (v.rol || 'CLIENTE').toUpperCase(),
      is_active: !!v.is_active,
      aprobado: !!v.aprobado,

      primer_nombre: (v.primer_nombre || '').trim(),
      segundo_nombre: (v.segundo_nombre || '').trim(),
      primer_apellido: (v.primer_apellido || '').trim(),
      segundo_apellido: (v.segundo_apellido || '').trim(),
      telefono: (v.telefono || '').trim(),
    };

    this.svc.actualizar(this.userId, payload).subscribe({
      next: (u) => {
        this.user = u;
        this.exito = true;
        this.guardando = false;
        this.cargar();
      },
      error: (err) => {
        console.error(err);
        this.errorForm = 'No se pudieron guardar los cambios.';
        this.guardando = false;
      },
    });
  }

  crearPerfil(): void {
    if (!this.userId || !this.user) return;

    this.errorCrearPerfil = null;
    this.exitoCrearPerfil = false;

    if (this.crearPerfilForm.invalid) {
      this.crearPerfilForm.markAllAsTouched();
      return;
    }

    const rolActual = ((this.form.get('rol')?.value || this.user.rol || '') as string).toUpperCase();
    if (rolActual === 'ADMIN') {
      this.errorCrearPerfil = 'No aplica crear perfil para ADMIN.';
      return;
    }

    this.creandoPerfil = true;

    const v = this.crearPerfilForm.value;

    const payload: AdminUsuarioCrearPerfilPayload = {
      rut: (v.rut || '').trim(),
      telefono: (v.telefono || '').trim(),
      primer_nombre: (v.primer_nombre || '').trim(),
      segundo_nombre: (v.segundo_nombre || '').trim(),
      primer_apellido: (v.primer_apellido || '').trim(),
      segundo_apellido: (v.segundo_apellido || '').trim(),
    };

    this.svc.crearPerfil(this.userId, payload).subscribe({
      next: (u) => {
        this.user = u;
        this.exitoCrearPerfil = true;
        this.creandoPerfil = false;
        this.cargar();
      },
      error: (err) => {
        console.error(err);
        this.errorCrearPerfil =
          'No se pudo crear el perfil. Revisa RUT/email duplicado o validaciones.';
        this.creandoPerfil = false;
      },
    });
  }

  toggleActivo(activar: boolean): void {
    if (!this.userId) return;

    this.errorForm = null;
    this.exito = false;
    this.guardando = true;

    const req = activar ? this.svc.activar(this.userId) : this.svc.desactivar(this.userId);

    req.subscribe({
      next: () => {
        if (this.user) this.user.is_active = activar;
        this.form.patchValue({ is_active: activar });
        this.guardando = false;
      },
      error: (err) => {
        console.error(err);
        this.errorForm = activar
          ? 'No se pudo activar el usuario.'
          : 'No se pudo desactivar el usuario.';
        this.guardando = false;
      },
    });
  }

  volver(): void {
    this.router.navigate(['/admin/usuarios']);
  }
}
