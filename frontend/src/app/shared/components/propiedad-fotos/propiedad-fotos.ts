import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

// Interfaz que deben cumplir ambos servicios
export interface IPropiedadFotosService {
  listarFotos(id: number): Observable<any[]>;
  subirFoto(id: number, file: File): Observable<any>;
  eliminarFoto(id: number): Observable<any>;
  marcarFotoPrincipal(id: number): Observable<any>;
}

@Component({
  selector: 'app-propiedad-fotos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card mt-4">
      <div class="card-header bg-white">
        <h5 class="mb-0">Galería de Fotos</h5>
      </div>
      <div class="card-body">
        
        <!-- Alerta de errores -->
        <div *ngIf="error" class="alert alert-danger alert-dismissible fade show" role="alert">
          {{ error }}
          <button type="button" class="btn-close" (click)="error = null"></button>
        </div>

        <!-- Subida de fotos -->
        <div class="mb-4 p-3 bg-light rounded border">
          <h6 class="mb-2">Subir nueva foto</h6>
          <p class="text-muted small mb-3">Formatos: JPG, PNG, WEBP.</p>
          
          <div class="d-flex align-items-center gap-2">
            <input type="file" class="form-control form-control-sm" (change)="onFileSelected($event)" accept="image/*" [disabled]="subiendo">
          </div>
          <div *ngIf="subiendo" class="mt-2 small text-primary">
            <span class="spinner-border spinner-border-sm me-1"></span> Subiendo...
          </div>
        </div>

        <!-- Galería -->
        <div *ngIf="cargando" class="text-center py-4">
          <div class="spinner-border text-secondary" role="status"></div>
        </div>

        <div *ngIf="!cargando && fotos.length === 0" class="text-center text-muted py-4">
          <i class="bi bi-images fs-2 d-block mb-2"></i>
          No hay fotos subidas. <br>
          <span class="text-danger small" *ngIf="requerido">Se requiere al menos una foto para completar la propiedad.</span>
        </div>

        <div class="row g-3" *ngIf="!cargando && fotos.length > 0">
          <div class="col-6 col-md-4 col-lg-3" *ngFor="let f of fotos">
            <div class="card h-100 shadow-sm position-relative">
              <!-- Badge Principal -->
              <span *ngIf="f.principal" class="position-absolute top-0 start-0 badge bg-success m-2 shadow-sm">
                Principal
              </span>

              <img [src]="f.url" class="card-img-top" style="height: 150px; object-fit: cover;" alt="Foto">
              
              <div class="card-body p-2 d-flex justify-content-between align-items-center bg-white">
                <button 
                  class="btn btn-sm btn-outline-success" 
                  title="Marcar como principal" 
                  (click)="marcarPrincipal(f)" 
                  [disabled]="f.principal || actionLoading === f.id">
                  <i class="bi bi-star-fill"></i>
                </button>
                
                <button 
                  class="btn btn-sm btn-outline-danger" 
                  title="Eliminar" 
                  (click)="eliminar(f)" 
                  [disabled]="actionLoading === f.id">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class PropiedadFotosComponent implements OnInit, OnChanges {
  @Input() propiedadId!: number;
  @Input() servicio!: IPropiedadFotosService; 
  @Input() requerido = false; 
  @Output() fotosCountChange = new EventEmitter<number>();

  fotos: any[] = [];
  cargando = false;
  subiendo = false;
  actionLoading: number | null = null;
  error: string | null = null;

  ngOnInit(): void {
    if (this.propiedadId && this.servicio) {
      this.cargarFotos();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['propiedadId'] && !changes['propiedadId'].firstChange) {
      this.cargarFotos();
    }
  }

  cargarFotos() {
    this.cargando = true;
    this.servicio.listarFotos(this.propiedadId).subscribe({
      next: (data) => {
        this.fotos = data.sort((a, b) => (b.principal ? 1 : 0) - (a.principal ? 1 : 0) || a.orden - b.orden);
        this.fotosCountChange.emit(this.fotos.length);
        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error cargando fotos.';
        this.cargando = false;
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.subiendo = true;
    this.error = null;

    this.servicio.subirFoto(this.propiedadId, file).subscribe({
      next: (nuevaFoto) => {
        this.fotos.push(nuevaFoto);
        this.fotosCountChange.emit(this.fotos.length);
        this.subiendo = false;
        event.target.value = '';
        this.cargarFotos(); 
      },
      error: (err) => {
        console.error(err);
        if (err.error && err.error.foto) {
          this.error = Array.isArray(err.error.foto) ? err.error.foto[0] : err.error.foto;
        } else {
          this.error = 'Error al subir la foto.';
        }
        this.subiendo = false;
      }
    });
  }

  eliminar(foto: any) {
    if (!confirm('¿Eliminar esta foto?')) return;

    this.actionLoading = foto.id;
    this.servicio.eliminarFoto(foto.id).subscribe({
      next: () => {
        this.fotos = this.fotos.filter(f => f.id !== foto.id);
        this.fotosCountChange.emit(this.fotos.length);
        this.actionLoading = null;
      },
      error: (err) => {
        this.error = 'Error al eliminar foto.';
        this.actionLoading = null;
      }
    });
  }

  marcarPrincipal(foto: any) {
    this.actionLoading = foto.id;
    this.servicio.marcarFotoPrincipal(foto.id).subscribe({
      next: () => {
        this.cargarFotos(); 
        this.actionLoading = null;
      },
      error: (err) => {
        this.error = 'Error al cambiar foto principal.';
        this.actionLoading = null;
      }
    });
  }
}
