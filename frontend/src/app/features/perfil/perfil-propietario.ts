import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  PerfilService,
  PropietarioPerfil,
} from '../../core/services/perfil.service';

@Component({
  selector: 'app-perfil-propietario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './perfil-propietario.html',
})
export class PerfilPropietarioComponent {
  userPayload: any = null;

  // datos de usuario
  username = '';
  email = '';
  rol = '';

  // perfil propietario
  esPropietario = false;
  formProp!: FormGroup;
  cargandoProp = false;
  guardandoProp = false;
  errorProp: string | null = null;
  exitoProp = false;

  constructor(
    private auth: AuthService,
    private fb: FormBuilder,
    private perfilSvc: PerfilService
  ) {}

  ngOnInit(): void {
    this.userPayload = this.auth.getPayload();

    this.username = this.userPayload?.username || '';
    this.email = this.userPayload?.email || '';
    this.rol = this.userPayload?.rol || '';
    this.esPropietario = this.rol === 'PROPIETARIO';

    if (this.esPropietario) {
      this.initFormPropietario();
      this.cargarPerfilPropietario();
    }
  }

  private initFormPropietario(): void {
    this.formProp = this.fb.group({
      primer_nombre: ['', [Validators.required]],
      segundo_nombre: [''],
      primer_apellido: ['', [Validators.required]],
      segundo_apellido: [''],
      rut: [{ value: '', disabled: true }],
      telefono: ['', [Validators.required]],
      email: [{ value: this.email, disabled: true }], 

      // Dirección
      calle: [''],
      numero: [''],
      poblacion_o_villa: [''],
      comuna: [''],
      region: [''],
      codigo_postal: [''],
      referencia: [''],

    });
  }

  private cargarPerfilPropietario(): void {
    this.cargandoProp = true;
    this.errorProp = null;

    this.perfilSvc.getPerfilPropietario().subscribe({
      next: (data: PropietarioPerfil) => {
        this.formProp.patchValue({
          primer_nombre: data.primer_nombre,
          segundo_nombre: data.segundo_nombre,
          primer_apellido: data.primer_apellido,
          segundo_apellido: data.segundo_apellido,
          rut: data.rut,
          telefono: data.telefono,
          email: data.email || this.email,
          calle: data.calle,
          numero: data.numero,
          poblacion_o_villa: data.poblacion_o_villa,
          comuna: data.comuna,
          region: data.region,
          codigo_postal: data.codigo_postal,
          referencia: data.referencia
        });
        this.cargandoProp = false;
      },
      error: (err) => {
        console.error(err);
        this.errorProp =
          'No se pudo cargar tu información de propietario. Contacta al administrador si el problema persiste.';
        this.cargandoProp = false;
      },
    });
  }

  guardarPerfilPropietario(): void {
    if (this.formProp.invalid) {
      this.formProp.markAllAsTouched();
      return;
    }

    this.guardandoProp = true;
    this.errorProp = null;
    this.exitoProp = false;

    const valores = this.formProp.getRawValue();

    const payload: Partial<PropietarioPerfil> = {
      primer_nombre: valores.primer_nombre,
      segundo_nombre: valores.segundo_nombre,
      primer_apellido: valores.primer_apellido,
      segundo_apellido: valores.segundo_apellido,
      rut: valores.rut,
      telefono: valores.telefono,

      calle: valores.calle,
      numero: valores.numero,
      poblacion_o_villa: valores.poblacion_o_villa,
      comuna: valores.comuna,
      region: valores.region,
      codigo_postal: valores.codigo_postal,
      referencia: valores.codigo_postal,
    };

    this.perfilSvc.actualizarPerfilPropietario(payload).subscribe({
      next: () => {
        this.guardandoProp = false;
        this.exitoProp = true;
      },
      error: (err) => {
        console.error(err);
        this.errorProp =
          'Ocurrió un error al guardar los cambios. Revisa los datos o intenta más tarde.';
        this.guardandoProp = false;
      },
    });
  }
}
