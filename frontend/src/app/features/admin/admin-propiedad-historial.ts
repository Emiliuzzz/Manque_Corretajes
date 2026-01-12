import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AdminPropiedadesService } from '../../core/services/admin-propiedades.service';

@Component({
  standalone: true,
  selector: 'app-admin-propiedad-historial',
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container py-4">
      <div class="d-flex gap-2 mb-3">
        <button class="btn btn-outline-secondary btn-sm" (click)="volver()">Volver</button>
        <button class="btn btn-outline-dark btn-sm" (click)="irDetalle()">Ir a propiedad</button>
      </div>

      <h2 class="mb-1">Historial de la propiedad #{{ id }}</h2>
      <p class="text-muted">Registro de cambios de estado y actualizaciones de precio.</p>

      <div *ngIf="cargando" class="alert alert-info">Cargando historial...</div>
      <div *ngIf="error" class="alert alert-danger">{{ error }}</div>

      <div class="card shadow-sm" *ngIf="!cargando && !error">
        <div class="card-body">
          <div *ngIf="items.length; else sin">
            <div class="border rounded p-2 mb-2" *ngFor="let h of items">
              <div class="small text-muted">
                {{ h.fecha | date:'short' }} • {{ h.accion }}
              </div>
              <div>{{ h.descripcion }}</div>
            </div>
          </div>

          <ng-template #sin>
            <div class="text-muted">No hay registros en el historial.</div>
          </ng-template>
        </div>
      </div>
    </div>
  `,
})
export class AdminPropiedadHistorialComponent implements OnInit {
  id!: number;
  items: any[] = [];
  cargando = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: AdminPropiedadesService
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id') || 0);
    if (!this.id) {
      this.router.navigate(['/admin/propiedades']);
      return;
    }
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.svc.getHistorial(this.id).subscribe({
      next: (data) => {
        this.items = Array.isArray(data) ? data : [];
        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudo cargar el historial.';
        this.cargando = false;
      },
    });
  }

  volver(): void {
    this.router.navigate(['/admin/propiedades']);
  }

  irDetalle(): void {
    this.router.navigate(['/admin/propiedades', this.id]);
  }
}
