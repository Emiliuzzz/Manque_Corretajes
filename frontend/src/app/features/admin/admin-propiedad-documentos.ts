import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminPropiedadesService, PropiedadDocumento } from '../../core/services/admin-propiedades.service';

@Component({
  selector: 'app-admin-propiedad-documentos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="card mt-4">
      <div class="card-header bg-white">
        <h5 class="mb-0">Documentos de la Propiedad</h5>
      </div>
      <div class="card-body">
        
        <!-- Alerta de errores generales -->
        <div *ngIf="error" class="alert alert-danger alert-dismissible fade show" role="alert">
          {{ error }}
          <button type="button" class="btn-close" (click)="error = null"></button>
        </div>

        <!-- Formulario de subida -->
        <div class="mb-4 p-3 bg-light rounded border">
          <h6 class="mb-3">Subir nuevo documento</h6>
          <form [formGroup]="uploadForm" (ngSubmit)="subir()" class="row g-3 align-items-end">
            <div class="col-md-3">
              <label class="form-label small">Tipo de Documento</label>
              <select class="form-select form-select-sm" formControlName="tipo">
                <option value="acreditacion">Acreditación / dominio</option>
                <option value="herencia">Herencia / posesión efectiva</option>
                <option value="certificado">Certificado</option>
                <option value="avaluo">Tasación / avalúo</option>
                <option value="plano">Plano / croquis</option>
                <option value="identidad">Identidad propietario</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            
            <div class="col-md-3">
              <label class="form-label small">Nombre (opcional)</label>
              <input type="text" class="form-control form-control-sm" formControlName="nombre" placeholder="Ej: Certificado 2024">
            </div>

            <div class="col-md-4">
              <label class="form-label small">Archivo</label>
              <input type="file" class="form-control form-control-sm" (change)="onFileSelected($event)" #fileInput>
            </div>

            <div class="col-md-2">
              <button type="submit" class="btn btn-primary btn-sm w-100" [disabled]="uploading || uploadForm.invalid || !selectedFile">
                <span *ngIf="uploading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                {{ uploading ? 'Subiendo...' : 'Subir' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Lista de documentos -->
        <div *ngIf="loading" class="text-center py-3">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>

        <div *ngIf="!loading && documentos.length === 0" class="text-center text-muted py-3">
          No hay documentos asociados a esta propiedad.
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
                  <div class="d-flex gap-2">
                    <a [href]="doc.archivo" target="_blank" class="btn btn-outline-primary btn-sm">
                      <i class="bi bi-eye"></i> Ver
                    </a>
                    <button class="btn btn-outline-danger btn-sm" (click)="eliminar(doc)" [disabled]="deletingId === doc.id">
                      <span *ngIf="deletingId === doc.id" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <i *ngIf="deletingId !== doc.id" class="bi bi-trash"></i>
                      Eliminar
                    </button>
                  </div>
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
export class AdminPropiedadDocumentosComponent implements OnInit, OnChanges {
  @Input() propiedadId!: number;

  documentos: PropiedadDocumento[] = [];
  loading = false;
  uploading = false;
  deletingId: number | null = null;
  error: string | null = null;
  
  uploadForm: FormGroup;
  selectedFile: File | null = null;

  constructor(
    private propService: AdminPropiedadesService,
    private fb: FormBuilder
  ) {
    this.uploadForm = this.fb.group({
      tipo: ['otro', Validators.required],
      nombre: ['']
    });
  }

  ngOnInit(): void {
    if (this.propiedadId) {
      this.cargarDocumentos();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['propiedadId'] && !changes['propiedadId'].firstChange && this.propiedadId) {
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
        this.error = 'Error al cargar la lista de documentos.';
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

  subir() {
    if (!this.selectedFile || this.uploadForm.invalid) return;

    this.uploading = true;
    this.error = null;
    const { tipo, nombre } = this.uploadForm.value;

    this.propService.subirDocumento(this.propiedadId, this.selectedFile, tipo, nombre).subscribe({
      next: (doc) => {
        this.documentos.unshift(doc); // Agregar al inicio
        this.uploading = false;
        this.selectedFile = null;
        this.uploadForm.reset({ tipo: 'otro', nombre: '' });
        
        // Limpiar input file
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (err) => {
        console.error('Error subiendo documento', err);
        this.error = 'Error al subir el documento. Inténtelo nuevamente.';
        this.uploading = false;
      }
    });
  }

  eliminar(doc: PropiedadDocumento) {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;

    this.deletingId = doc.id;
    this.propService.eliminarDocumento(doc.id).subscribe({
      next: () => {
        this.documentos = this.documentos.filter(d => d.id !== doc.id);
        this.deletingId = null;
      },
      error: (err) => {
        console.error('Error eliminando documento', err);
        this.error = 'Error al eliminar el documento.';
        this.deletingId = null;
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
