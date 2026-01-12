import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

import {
  PropietariosAdminService,
  PropietarioListado,
} from '../../core/services/propietarios-admin.service';

import {
  AdminPropiedadesService,
  NuevaPropiedadAdmin,
} from '../../core/services/admin-propiedades.service';

@Component({
  standalone: true,
  selector: 'app-admin-propiedad-form',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="container my-4">
      <h2 class="mb-3">
        {{ modoEdicion ? 'Editar propiedad (Admin)' : 'Crear nueva propiedad (Admin)' }}
      </h2>

      <p class="text-muted mb-4" *ngIf="!modoEdicion">
        Desde esta pantalla el administrador puede crear una nueva propiedad
        y asociarla a un propietario existente o a uno nuevo.
      </p>

      <p class="text-muted mb-4" *ngIf="modoEdicion">
        Desde esta pantalla el administrador puede actualizar los datos de la
        propiedad seleccionada.
      </p>

      <div *ngIf="cargando" class="alert alert-info">
        Cargando información...
      </div>
      <div *ngIf="error" class="alert alert-danger">
        {{ error }}
      </div>

      <form
        *ngIf="!cargando"
        [formGroup]="form"
        (ngSubmit)="guardar()"
        class="row g-3"
      >
        <!-- Selección / creación de propietario -->
        <ng-container *ngIf="!modoEdicion">
          <div class="col-12">
            <h5>Propietario</h5>
            <div class="form-check form-check-inline">
              <input
                class="form-check-input"
                type="radio"
                id="prop-existente"
                [value]="'existente'"
                formControlName="modoPropietario"
              />
              <label class="form-check-label" for="prop-existente">
                Usar propietario existente
              </label>
            </div>
            <div class="form-check form-check-inline">
              <input
                class="form-check-input"
                type="radio"
                id="prop-nuevo"
                [value]="'nuevo'"
                formControlName="modoPropietario"
              />
              <label class="form-check-label" for="prop-nuevo">
                Crear nuevo propietario
              </label>
            </div>
          </div>

          <!-- Propietario existente -->
          <div
            class="col-12"
            *ngIf="form.value.modoPropietario === 'existente'"
          >
            <label class="form-label">Seleccionar propietario</label>
            <select class="form-select" formControlName="propietarioId">
              <option value="">-- Selecciona propietario --</option>
              <option *ngFor="let p of propietarios" [value]="p.id">
                {{ p.primer_nombre }} {{ p.primer_apellido }} ·
                {{ p.rut }} · {{ p.email }}
              </option>
            </select>
            <div
              class="text-danger small mt-1"
              *ngIf="
                campoInvalido('propietarioId') &&
                form.value.modoPropietario === 'existente'
              "
            >
              Debes seleccionar un propietario.
            </div>
          </div>

          <!-- Nuevo propietario -->
          <div class="col-12" *ngIf="form.value.modoPropietario === 'nuevo'">
            <div class="row g-3">
              <div class="col-md-3">
                <label class="form-label">Primer nombre</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="prop_primer_nombre"
                />
              </div>
              <div class="col-md-3">
                <label class="form-label">Segundo nombre</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="prop_segundo_nombre"
                />
              </div>
              <div class="col-md-3">
                <label class="form-label">Primer apellido</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="prop_primer_apellido"
                />
              </div>
              <div class="col-md-3">
                <label class="form-label">Segundo apellido</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="prop_segundo_apellido"
                />
              </div>

              <div class="col-md-4">
                <label class="form-label">RUT</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="prop_rut"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label">Teléfono</label>
                <input
                  type="text"
                  class="form-control"
                  formControlName="prop_telefono"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label">Email</label>
                <input
                  type="email"
                  class="form-control"
                  formControlName="prop_email"
                />
              </div>
            </div>
          </div>

          <hr class="my-4" />
        </ng-container>

        <!-- Datos de la propiedad -->
        <div class="col-md-6">
          <label class="form-label">Título</label>
          <input type="text" class="form-control" formControlName="titulo" />
          <div class="text-danger small mt-1" *ngIf="campoInvalido('titulo')">
            El título es obligatorio.
          </div>
        </div>

        <div class="col-md-6">
          <label class="form-label">Ciudad</label>
          <input type="text" class="form-control" formControlName="ciudad" />
          <div class="text-danger small mt-1" *ngIf="campoInvalido('ciudad')">
            La ciudad es obligatoria.
          </div>
        </div>

        <div class="col-12">
          <label class="form-label">Dirección</label>
          <input
            type="text"
            class="form-control"
            formControlName="direccion"
          />
          <div
            class="text-danger small mt-1"
            *ngIf="campoInvalido('direccion')"
          >
            La dirección es obligatoria.
          </div>
        </div>

        <div class="col-12">
          <label class="form-label">Descripción</label>
          <textarea
            class="form-control"
            rows="3"
            formControlName="descripcion"
          ></textarea>
        </div>

        <div class="col-md-4">
          <label class="form-label">Tipo de propiedad</label>
          <select class="form-select" formControlName="tipo">
            <option value="casa">Casa</option>
            <option value="departamento">Departamento</option>
            <option value="parcela">Parcela</option>
            <option value="oficina">Oficina</option>
            <option value="bodega">Bodega</option>
            <option value="terreno">Terreno</option>
          </select>
        </div>

        <div class="col-md-4">
          <label class="form-label">Dormitorios</label>
          <input
            type="number"
            min="0"
            class="form-control"
            formControlName="dormitorios"
          />
        </div>

        <div class="col-md-4">
          <label class="form-label">Baños</label>
          <input
            type="number"
            min="0"
            class="form-control"
            formControlName="baos"
          />
        </div>

        <div class="col-md-4">
          <label class="form-label">Metros cuadrados</label>
          <input
            type="number"
            min="0"
            step="0.01"
            class="form-control"
            formControlName="metros2"
          />
        </div>

        <div class="col-md-4">
          <label class="form-label">Precio (CLP)</label>
          <input
            type="number"
            min="0"
            step="1000"
            class="form-control"
            formControlName="precio"
          />
        </div>

        <div class="col-md-4">
          <label class="form-label">Orientación</label>
          <select class="form-select" formControlName="orientacion">
            <option value="sur">Sur</option>
            <option value="norte">Norte</option>
            <option value="este">Este</option>
            <option value="oeste">Oeste</option>
          </select>
        </div>

        <div class="col-12 d-flex justify-content-end mt-4">
          <button
            type="button"
            class="btn btn-outline-secondary me-2"
            (click)="volver()"
            [disabled]="guardando"
          >
            Volver
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="guardando">
            {{
              guardando
                ? (modoEdicion ? 'Guardando...' : 'Guardando...')
                : (modoEdicion ? 'Guardar cambios' : 'Crear propiedad')
            }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class AdminPropiedadFormComponent implements OnInit {
  form!: FormGroup;
  propietarios: PropietarioListado[] = [];

  cargando = false;
  guardando = false;
  error: string | null = null;

  // nuevo:
  modoEdicion = false;
  propiedadId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private propSvc: PropietariosAdminService,
    private propAdminSvc: AdminPropiedadesService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.modoEdicion = true;
      this.propiedadId = Number(idParam);
    }

    this.buildForm();

    if (this.modoEdicion) {
      this.cargarPropiedadExistente();
    } else {
      this.cargarPropietarios();
    }
  }

  /** Construye el formulario */
  private buildForm(): void {
    this.form = this.fb.group({
      modoPropietario: ['existente', Validators.required],

      // propietario existente
      propietarioId: [''],

      // nuevo propietario
      prop_primer_nombre: [''],
      prop_segundo_nombre: [''],
      prop_primer_apellido: [''],
      prop_segundo_apellido: [''],
      prop_rut: [''],
      prop_telefono: [''],
      prop_email: [''],

      // propiedad
      titulo: ['', Validators.required],
      ciudad: ['', Validators.required],
      direccion: ['', Validators.required],
      descripcion: [''],
      tipo: ['casa', Validators.required],
      dormitorios: [0, [Validators.required, Validators.min(0)]],
      baos: [0, [Validators.required, Validators.min(0)]],
      metros2: [0, [Validators.required, Validators.min(0)]],
      precio: [0, [Validators.required, Validators.min(0)]],
      orientacion: ['sur', Validators.required],
    });
  }

  private cargarPropietarios(): void {
    this.cargando = true;
    this.error = null;

    this.propSvc.listar().subscribe({
      next: (lista) => {
        this.propietarios = lista;
        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudieron cargar los propietarios.';
        this.cargando = false;
      },
    });
  }

  private cargarPropiedadExistente(): void {
    if (!this.propiedadId) return;

    this.cargando = true;
    this.error = null;

    this.propAdminSvc.getPropiedad(this.propiedadId).subscribe({
      next: (p: any) => {
        this.form.patchValue({
          titulo: p.titulo,
          ciudad: p.ciudad,
          direccion: p.direccion,
          descripcion: p.descripcion || '',
          tipo: p.tipo,
          dormitorios: p.dormitorios ?? 0,
          baos: p.baos ?? 0,
          metros2: p.metros2 ?? 0,
          precio: p.precio ?? 0,
          orientacion: p.orientacion || 'sur',
        });
        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudo cargar la propiedad.';
        this.cargando = false;
      },
    });
  }

  campoInvalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    this.error = null;

    const valores = this.form.value;

    // ========= MODO EDICIÓN =========
    if (this.modoEdicion && this.propiedadId) {
      const payload: Partial<NuevaPropiedadAdmin> = {
        titulo: valores.titulo,
        descripcion: valores.descripcion || '',
        direccion: valores.direccion,
        ciudad: valores.ciudad,
        tipo: valores.tipo,
        dormitorios: Number(valores.dormitorios) || 0,
        baos: Number(valores.baos) || 0,
        metros2: Number(valores.metros2) || 0,
        precio: Number(valores.precio) || 0,
        orientacion: valores.orientacion || 'sur',
      };

      this.propAdminSvc
        .actualizarPropiedad(this.propiedadId, payload)
        .subscribe({
          next: () => {
            this.guardando = false;
            this.volver();
          },
          error: (err) => {
            console.error(err);
            this.error =
              'No se pudieron guardar los cambios de la propiedad.';
            this.guardando = false;
          },
        });

      return;
    }

    // ========= MODO CREAR =========

    const continuarConPropiedad = (propietarioId: number) => {
      const payload: NuevaPropiedadAdmin = {
        propietario_id: propietarioId,
        titulo: valores.titulo,
        descripcion: valores.descripcion || '',
        direccion: valores.direccion,
        ciudad: valores.ciudad,
        tipo: valores.tipo,
        dormitorios: Number(valores.dormitorios) || 0,
        baos: Number(valores.baos) || 0,
        metros2: Number(valores.metros2) || 0,
        precio: Number(valores.precio) || 0,
        estado: 'disponible',
        estado_aprobacion: 'aprobada',
        orientacion: valores.orientacion || 'sur',
      } as any;

      this.propAdminSvc.crearPropiedad(payload).subscribe({
        next: () => {
          this.guardando = false;
          this.volver();
        },
        error: (err) => {
          console.error(err);
          this.error = 'No se pudo crear la propiedad.';
          this.guardando = false;
        },
      });
    };

    // CASO 1: propietario existente
    if (valores.modoPropietario === 'existente') {
      const id = Number(valores.propietarioId);
      if (!id) {
        this.error = 'Debes seleccionar un propietario.';
        this.guardando = false;
        return;
      }
      continuarConPropiedad(id);
      return;
    }

    // CASO 2: nuevo propietario
    const datosNuevoProp = {
      primer_nombre: valores.prop_primer_nombre,
      segundo_nombre: valores.prop_segundo_nombre || '',
      primer_apellido: valores.prop_primer_apellido,
      segundo_apellido: valores.prop_segundo_apellido || '',
      rut: valores.prop_rut,
      telefono: valores.prop_telefono,
      email: valores.prop_email,
    };

    if (
      !datosNuevoProp.primer_nombre ||
      !datosNuevoProp.primer_apellido ||
      !datosNuevoProp.rut ||
      !datosNuevoProp.telefono ||
      !datosNuevoProp.email
    ) {
      this.error =
        'Completa los datos obligatorios del nuevo propietario (nombre, apellido, RUT, teléfono, email).';
      this.guardando = false;
      return;
    }

    this.propSvc.crear(datosNuevoProp).subscribe({
      next: (nuevo) => {
        continuarConPropiedad(nuevo.id);
      },
      error: (err) => {
        console.error(err);
        this.error =
          'No se pudo crear el propietario. Revisa los datos (RUT, teléfono, etc).';
        this.guardando = false;
      },
    });
  }

  volver(): void {
    this.location.back();
  }

}
