import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from '@angular/forms';
import {
  MisPropiedadesService,
  NuevaPropiedadPayload,
} from '../../core/services/mis-propiedades.service';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

interface PropietarioOption {
  id: number;
  nombre: string;
  email?: string;
}

@Component({
  selector: 'app-nueva-propiedad',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './nueva-propiedad.html',
})
export class NuevaPropiedadComponent implements OnInit {
  form!: FormGroup;

  propietarioActualNombre: string | null = null;
  cargandoPropietario = true;
  error: string | null = null;
  enviando = false;
  exito = false;

  private apiRoot = 'http://127.0.0.1:8000/api';

  constructor(
    private fb: FormBuilder,
    private svc: MisPropiedadesService,
    private router: Router,
    private http: HttpClient,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    // Inicializamos el formulario
    this.form = this.fb.group({
      propietario: [null, Validators.required],
      titulo: ['', [Validators.required, Validators.maxLength(200)]],
      descripcion: [''],
      direccion: ['', [Validators.required]],
      ciudad: ['', [Validators.required]],
      tipo: ['casa', Validators.required],
      dormitorios: [0, [Validators.min(0)]],
      baos: [1, [Validators.min(0)]],
      metros2: [0, [Validators.min(0)]],
      precio: [0, [Validators.required, Validators.min(0)]],
      orientación: ['sur'],
    });

    // Detecta cambio de tipo y aplica reglas
    this.form.get('tipo')?.valueChanges.subscribe((tipo) => {
      if (tipo === 'terreno' || tipo === 'parcela') {
        this.form.patchValue({ dormitorios: 0, baos: 0 });
        this.form.get('dormitorios')?.disable();
        this.form.get('baos')?.disable();
      } else {
        this.form.get('dormitorios')?.enable();
        this.form.get('baos')?.enable();
      }
    });

    this.cargarPropietarioActual();
  }

  cargarPropietarioActual(): void {
    const payload = this.auth.getPayload();
    const emailUsuario = (payload?.email || '').toLowerCase();

    this.http.get<any>(`${this.apiRoot}/propietarios/`).subscribe({
      next: (resp) => {
        const data = Array.isArray(resp) ? resp : resp.results;
        const propietarios: PropietarioOption[] = (data || []).map(
          (p: any) => ({
            id: p.id,
            nombre: `${p.primer_nombre} ${p.primer_apellido}`,
            email: (p.email || '').toLowerCase(),
          })
        );

        const seleccionado = propietarios.find(
          (p) => p.email === emailUsuario
        );

        if (seleccionado) {
          this.form.patchValue({ propietario: seleccionado.id });
          this.propietarioActualNombre = seleccionado.nombre;
        } else {
          this.error =
            'No se encontró un propietario asociado a tu cuenta. Contacta al administrador.';
        }

        this.cargandoPropietario = false;
      },
      error: () => {
        this.error = 'No se pudo determinar el propietario actual.';
        this.cargandoPropietario = false;
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Asegurar que terrenos y parcelas lleven 0 en dormitorios y baños
    const tipo = this.form.value.tipo;
    if (tipo === 'terreno' || tipo === 'parcela') {
      this.form.patchValue({ dormitorios: 0, baos: 0 });
    }

    this.enviando = true;
    this.error = null;

    const payload: NuevaPropiedadPayload = this.form.value as any;

    this.svc.crearPropiedad(payload).subscribe({
      next: () => {
        this.enviando = false;
        this.exito = true;
        this.router.navigate(['/mis-propiedades']);
      },
      error: (err) => {
        console.error(err);
        this.error =
          'Error al crear la propiedad. Revisa los datos ingresados.';
        this.enviando = false;
      },
    });
  }
}
