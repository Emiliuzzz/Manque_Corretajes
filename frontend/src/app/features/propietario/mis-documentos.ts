import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MisPropiedadesService, PropiedadDocumento } from '../../core/services/mis-propiedades.service';

@Component({
  selector: 'app-mis-documentos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card mt-4">
      <div class="card-header bg-white">
        <h5 class="mb-0">Documentos de la Propiedad</h5>
      </div>
      <div class="card-body">
        
        <div *ngIf="loading" class="text-center py-3">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>

        <div *ngIf="error" class="alert alert-danger">
          {{ error }}
        </div>

        <div *ngIf="!loading && documentos.length === 0" class="text-center text-muted py-3">
          No hay documentos disponibles para esta propiedad.
        </div>

        <div class="table-responsive" *ngIf="!loading && documentos.length > 0">
          <table class="table table-hover align-middle">
            <thead class="table-light">
              <tr>
                <th>Tipo</th>
                <th>Nombre</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let doc of documentos">
                <td>
                  <span class="badge bg-secondary text-capitalize">{{ formatTipo(doc.tipo) }}</span>
                </td>
                <td>
                  <i class="bi bi-file-earmark-text me-1"></i>
                  {{ doc.nombre || 'Sin nombre' }}
                </td>
                <td class="small text-muted">
                  {{ doc.created_at | date:'dd/MM/yyyy HH:mm' }}
                </td>
                <td>
                  <a [href]="doc.archivo" target="_blank" class="btn btn-outline-primary btn-sm">
                    <i class="bi bi-eye"></i> Ver
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .text-capitalize { text-transform: capitalize; }
  `]
})
export class MisDocumentosComponent implements OnInit {
  @Input() propiedadId!: number;

  documentos: PropiedadDocumento[] = [];
  loading = false;
  error: string | null = null;

  constructor(private propService: MisPropiedadesService) {}

  ngOnInit(): void {
    if (this.propiedadId) {
      this.cargarDocumentos();
    }
  }

  cargarDocumentos() {
    this.loading = true;
    this.propService.getDocumentos(this.propiedadId).subscribe({
      next: (docs) => {
        this.documentos = docs;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando documentos', err);
        this.error = 'No se pudieron cargar los documentos.';
        this.loading = false;
      }
    });
  }

  formatTipo(tipo: string): string {
    const map: {[key: string]: string} = {
      'acreditacion': 'Acreditación / Dominio',
      'herencia': 'Herencia / Posesión Efectiva',
      'certificado': 'Certificado',
      'avaluo': 'Tasación / Avalúo',
      'plano': 'Plano / Croquis',
      'identidad': 'Identidad Propietario',
      'otro': 'Otro'
    };
    return map[tipo] || tipo;
  }
}
