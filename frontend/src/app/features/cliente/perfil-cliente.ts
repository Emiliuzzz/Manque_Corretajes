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
  ClientePerfil,
} from '../../core/services/perfil.service';

import {
  MisSolicitudesService,
  NuevaSolicitud,
} from '../../core/services/mis-solicitudes.service';

@Component({
  selector: 'app-perfil-cliente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './perfil-cliente.html',
})
export class PerfilClienteComponent implements OnInit {
  userPayload: any = null;

  // datos de usuario
  username = '';
  email = '';
  rol = '';

  // perfil cliente
  esCliente = false;
  formProp!: FormGroup;
  cargandoProp = false;
  guardandoProp = false;
  errorProp: string | null = null;
  exitoProp = false;

  // nueva solicitud
  formSolicitud!: FormGroup;
  creandoSolicitud = false;
  errorSolicitud: string | null = null;
  exitoSolicitud = false;

  constructor(
    private auth: AuthService,
    private fb: FormBuilder,
    private perfilSvc: PerfilService,
    private solicitudesSvc: MisSolicitudesService
  ) {}

  ngOnInit(): void {
    this.userPayload = this.auth.getPayload();

    this.username = this.userPayload?.username || '';
    this.email = this.userPayload?.email || '';
    this.rol = this.userPayload?.rol || '';
    this.esCliente = this.rol === 'CLIENTE';

    if (this.esCliente) {
      this.initFormCliente();
      this.initFormSolicitud();
      this.cargarPerfilCliente();
    }
  }

  // ===== PERFIL CLIENTE =====

  private initFormCliente(): void {
    this.formProp = this.fb.group({
      primer_nombre: ['', [Validators.required]],
      segundo_nombre: [''],
      primer_apellido: ['', [Validators.required]],
      segundo_apellido: [''],
      rut: ['', [Validators.required]],
      telefono: ['', [Validators.required]],
      email: [{ value: this.email, disabled: true }],
    });
  }

  private cargarPerfilCliente(): void {
    this.cargandoProp = true;
    this.errorProp = null;

    this.perfilSvc.getPerfilCliente().subscribe({
      next: (data: ClientePerfil) => {
        this.formProp.patchValue({
          primer_nombre: data.primer_nombre,
          segundo_nombre: data.segundo_nombre,
          primer_apellido: data.primer_apellido,
          segundo_apellido: data.segundo_apellido,
          rut: data.rut,
          telefono: data.telefono,
          email: data.email || this.email,
        });
        this.cargandoProp = false;
      },
      error: (err) => {
        console.error(err);
        this.errorProp =
          'No se pudo cargar tu información de cliente. Contacta al administrador si el problema persiste.';
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

    const payload: Partial<ClientePerfil> = {
      primer_nombre: valores.primer_nombre,
      segundo_nombre: valores.segundo_nombre,
      primer_apellido: valores.primer_apellido,
      segundo_apellido: valores.segundo_apellido,
      rut: valores.rut,
      telefono: valores.telefono,
    };

    this.perfilSvc.actualizarPerfilCliente(payload).subscribe({
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

  // ===== NUEVA SOLICITUD =====

  private initFormSolicitud(): void {
    this.formSolicitud = this.fb.group({
      tipo_operacion: ['ARRIENDO', Validators.required],
      tipo_propiedad: ['departamento', Validators.required],
      ciudad: ['', Validators.required],
      comuna: ['', Validators.required],
      presupuesto_min: [null, [Validators.min(0)]],
      presupuesto_max: [null, [Validators.min(0)]],
      mensaje: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  crearSolicitud(): void {
    if (this.formSolicitud.invalid) {
      this.formSolicitud.markAllAsTouched();
      return;
    }

    this.creandoSolicitud = true;
    this.errorSolicitud = null;
    this.exitoSolicitud = false;

    const valores = this.formSolicitud.value;

    const payload: Partial<NuevaSolicitud> = {
      tipo_operacion: valores.tipo_operacion,
      tipo_propiedad: valores.tipo_propiedad,
      ciudad: valores.ciudad,
      comuna: valores.comuna,
      presupuesto_min:
        valores.presupuesto_min !== null && valores.presupuesto_min !== ''
          ? Number(valores.presupuesto_min)
          : null,
      presupuesto_max:
        valores.presupuesto_max !== null && valores.presupuesto_max !== ''
          ? Number(valores.presupuesto_max)
          : null,
      mensaje: valores.mensaje,
    };

    this.solicitudesSvc.crearSolicitud(payload).subscribe({
      next: () => {
        this.creandoSolicitud = false;
        this.exitoSolicitud = true;
        this.formSolicitud.reset({
          tipo_operacion: 'ARRIENDO',
          tipo_propiedad: 'departamento',
          ciudad: '',
          comuna: '',
          presupuesto_min: null,
          presupuesto_max: null,
          mensaje: '',
        });
      },
      error: (err) => {
        console.error(err);
        this.errorSolicitud =
          'Ocurrió un error al enviar tu solicitud. Inténtalo nuevamente más tarde.';
        this.creandoSolicitud = false;
      },
    });
  }

  // helpers para mostrar errores en template
  campoInvalidoProp(campo: string): boolean {
    const control = this.formProp?.get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  campoInvalidoSolicitud(campo: string): boolean {
    const control = this.formSolicitud?.get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
