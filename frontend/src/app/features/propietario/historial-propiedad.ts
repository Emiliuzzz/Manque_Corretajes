import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import {
  MisPropiedadesService,
  HistorialEntry,
} from '../../core/services/mis-propiedades.service';

@Component({
  selector: 'app-historial-propiedad',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './historial-propiedad.html',
})
export class HistorialPropiedadComponent implements OnInit {
  historial: HistorialEntry[] = [];
  cargando = true;
  error: string | null = null;
  propiedadId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: MisPropiedadesService
  ) {}

  ngOnInit(): void {
    this.propiedadId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.propiedadId) {
      this.error = 'Propiedad no válida.';
      this.cargando = false;
      return;
    }

    this.svc.getHistorialPropiedad(this.propiedadId).subscribe({
      next: (data) => {
        this.historial = data || [];
        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudo cargar el historial de la propiedad.';
        this.cargando = false;
      },
    });
  }

  volver(): void {
    this.router.navigate(['/mis-propiedades']);
  }
}
