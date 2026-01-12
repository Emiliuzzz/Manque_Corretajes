import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  MisPropiedadesService,
  FotoPropiedad,
} from '../../core/services/mis-propiedades.service';

@Component({
  selector: 'app-gestionar-fotos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './gestionar-fotos.html',
})
export class GestionarFotosComponent implements OnInit {
  propiedadId!: number;
  propiedadTitulo: string | null = null;

  fotos: FotoPropiedad[] = [];
  cargando = true;
  subiendo = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private svc: MisPropiedadesService
  ) {}

  ngOnInit(): void {
    this.propiedadId = Number(this.route.snapshot.paramMap.get('id'));

    // Cargar datos de la propiedad
    this.svc.getPropiedad(this.propiedadId).subscribe({
      next: (p) => {
        this.propiedadTitulo = p.titulo;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudo cargar la propiedad.';
      },
    });

    // Cargar fotos
    this.cargarFotos();
  }

  cargarFotos(): void {
    this.cargando = true;
    this.svc.listarFotos(this.propiedadId).subscribe({
      next: (data) => {
        this.fotos = data.sort((a, b) => a.orden - b.orden || a.id - b.id);
        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error al cargar las fotos.';
        this.cargando = false;
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.subiendo = true;
    this.error = null;

    this.svc.subirFoto(this.propiedadId, file).subscribe({
      next: () => {
        this.subiendo = false;
        input.value = '';
        this.cargarFotos();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error al subir la foto. Verifica el formato y tamaño.';
        this.subiendo = false;
      },
    });
  }

  eliminarFoto(foto: FotoPropiedad): void {
    if (!confirm('¿Eliminar esta foto?')) {
      return;
    }

    this.svc.eliminarFoto(foto.id).subscribe({
      next: () => {
        this.cargarFotos();
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudo eliminar la foto.';
      },
    });
  }

  marcarPrincipal(foto: FotoPropiedad): void {
    this.svc.marcarFotoPrincipal(foto.id).subscribe({
      next: () => {
        this.cargarFotos();
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudo marcar como principal.';
      },
    });
  }
}
