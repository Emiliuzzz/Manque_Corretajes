import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MisPropiedadesService, PropiedadDocumento } from '../../core/services/mis-propiedades.service';

@Component({
  selector: 'app-mis-documentos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="card mt-4">
      <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Documentos de la Propiedad</h5>
        <button class="btn btn-sm btn-primary" (click)="mostrarFormulario = !mostrarFormulario">
          <i class="bi" [ngClass]="mostrarFormulario ? 'bi-dash' : 'bi-plus'"></i>
          {{ mostrarFormulario ? 'Cancelar' : 'Nuevo Documento' }}
        </button>
      </div>
      <div class="card-body">
        
        <!-- Formulario de subida -->
        <div *ngIf="mostrarFormulario" class="mb-4 p-3 bg-light border rounded">
          <h6 class="mb-3">Subir nuevo documento</h6>
          <form [formGroup]="uploadForm" (ngSubmit)="onSubmit()">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label small">Tipo de documento</label>
                <select class="form-select form-select-sm" formControlName="tipo">
                  <option value="acreditacion">Acreditación / Dominio</option>
                  <option value="herencia">Herencia / Posesión Efectiva</option>
                  <option value="certificado">Certificado</option>
                  <option value="avaluo">Tasación / Avalúo</option>
                  <option value="plano">Plano / Croquis</option>
                  <option value="identidad">Identidad Propietario</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              
              <div class="col-md-6">
                <label class="form-label small">Nombre (opcional)</label>
                <input type="text" class="form-control form-control-sm" formControlName="nombre" placeholder="Ej: Escritura 2024">
              </div>

              <div class="col-12">
                <label class="form-label small">Archivo (PDF)</label>
                <input type="file" class="form-control form-control-sm" accept=".pdf" (change)="onFileSelected($event)">
              </div>
              
              <div class="col-12 text-end">
                <button type="submit" class="btn btn-success btn-sm" [disabled]="subiendo || uploadForm.invalid || !selectedFile">
                  <span *ngIf="subiendo" class="spinner-border spinner-border-sm me-1"></span>
                  Subir Documento
                </button>
              </div>
            </div>
          </form>
        </div>

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
  
  // Upload logic
  mostrarFormulario = false;
  subiendo = false;
  uploadForm: FormGroup;
  selectedFile: File | null = null;

  constructor(
    private propService: MisPropiedadesService,
    private fb: FormBuilder
  ) {
    this.uploadForm = this.fb.group({
      tipo: ['acreditacion', Validators.required],
      nombre: ['']
    });
  }

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
  
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onSubmit() {
    if (this.uploadForm.invalid || !this.selectedFile) return;

    this.subiendo = true;
    this.error = null;

    const formData = new FormData();
    formData.append('tipo', this.uploadForm.get('tipo')?.value);
    formData.append('nombre', this.uploadForm.get('nombre')?.value || '');
    formData.append('archivo', this.selectedFile);

    this.propService.subirDocumento(this.propiedadId, formData).subscribe({
      next: (doc) => {
        this.subiendo = false;
        this.mostrarFormulario = false;
        this.selectedFile = null;
        this.uploadForm.reset({ tipo: 'acreditacion' });
        // Recargar lista
        this.cargarDocumentos();
      },
      error: (err) => {
        console.error(err);
        this.subiendo = false;
        this.error = 'Error al subir documento. Verifica el formato (PDF) y tamaño.';
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
