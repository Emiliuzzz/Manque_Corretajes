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
import { ActivatedRoute, RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-editar-propiedad',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './editar-propiedad.html',
})
export class EditarPropiedadComponent implements OnInit {
  form!: FormGroup;
  cargando = true;
  enviando = false;
  error: string | null = null;

  propiedadId!: number;
  aprobada = false;

  constructor(
    private fb: FormBuilder,
    private svc: MisPropiedadesService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Inicializamos formulario
    this.form = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(200)]],
      descripcion: [''],
      direccion: ['', [Validators.required]],
      ciudad: ['', [Validators.required]],
      tipo: ['casa', Validators.required],
      dormitorios: [0, [Validators.min(0)]],
      baos: [0, [Validators.min(0)]],
      metros2: [0, [Validators.min(0)]],
      precio: [0, [Validators.required, Validators.min(0)]],
      orientación: ['sur'],
      estado: ['disponible'],
    });

    this.propiedadId = Number(this.route.snapshot.paramMap.get('id'));

    // Cargar datos desde backend
    this.svc.getPropiedad(this.propiedadId).subscribe({
      next: (p) => {
        this.aprobada = !!p.aprobada;

        this.form.patchValue({
          titulo: p.titulo,
          descripcion: p.descripcion,
          direccion: p.direccion,
          ciudad: p.ciudad,
          tipo: p.tipo,
          dormitorios: p.dormitorios,
          baos: p.baos,
          metros2: p.metros2,
          precio: p.precio,
          orientación: p.orientación,
          estado: p.estado,
        });
        if (p.tipo === 'terreno' || p.tipo === 'parcela') {
          this.form.get('dormitorios')?.disable();
          this.form.get('baos')?.disable();
        }

        if (this.aprobada) {
          [
            'titulo',
            'direccion',
            'ciudad',
            'tipo',
            'dormitorios',
            'baos',
            'metros2',
            'orientación',
            'estado',
          ].forEach((campo) => this.form.get(campo)?.disable());
        }

        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudo cargar la propiedad.';
        this.cargando = false;
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando = true;
    this.error = null;

    const valoresRaw = this.form.getRawValue() as any;

    const payload: Partial<NuevaPropiedadPayload> = {
      titulo: valoresRaw.titulo,
      descripcion: valoresRaw.descripcion,
      direccion: valoresRaw.direccion,
      ciudad: valoresRaw.ciudad,
      tipo: valoresRaw.tipo,
      dormitorios: valoresRaw.dormitorios,
      baos: valoresRaw.baos,
      metros2: valoresRaw.metros2,
      precio: valoresRaw.precio,
      orientación: valoresRaw.orientación,
      estado: valoresRaw.estado,
    };

    this.svc.actualizarPropiedad(this.propiedadId, payload).subscribe({
      next: () => {
        this.enviando = false;
        this.router.navigate(['/mis-propiedades']);
      },
      error: (err) => {
        console.error(err);
        this.error =
          'Error al actualizar la propiedad. Revisa los datos ingresados.';
        this.enviando = false;
      },
    });
  }
}
