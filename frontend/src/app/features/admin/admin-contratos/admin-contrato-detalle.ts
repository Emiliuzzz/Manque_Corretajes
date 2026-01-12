import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

type Rol = 'ADMIN' | 'PROPIETARIO' | 'CLIENTE' | string;

@Component({
  selector: 'app-admin-contrato-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-contrato-detalle.html',
})
export class AdminContratoDetalleComponent implements OnInit {
  baseUrl = environment.apiUrl.replace(/\/+$/, '');

  id: string = '';
  creando = false;

  cargando = true;
  error: string | null = null;

  contrato: any = null;

  tab: 'detalle' | 'pagos' | 'docs' | 'cuotas' = 'detalle';

  // selects (para no usar ids a mano)
  propiedades: any[] = [];
  interesados: any[] = [];

  returnTo: string | null = null;

  // form contrato
  form: any = {
    tipo: 'arriendo',
    propiedad_id: null,
    comprador_arrendatario_id: null,
    fecha_firma: '',
    precio_pactado: null,
    vigente: true,
  };

  contratoPdfFile: File | null = null;

  // pagos
  cargandoPagos = false;
  pagos: any[] = [];
  pago: any = { fecha: '', monto: null, medio: 'transferencia', notas: '' };
  pagoFile: File | null = null;

  // docs
  cargandoDocs = false;
  docs: any[] = [];
  doc: any = { tipo: 'otro', nombre: '' };
  docFile: File | null = null;

  // cuotas
  cargandoCuotas = false;
  cuotas: any[] = [];
  cuota: any = { vencimiento: '', monto: null };

  cuotaFiles: Record<number, File | null> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';

    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    if (!this.returnTo) this.returnTo = '/admin/contratos';

    if (this.id === '0') {
      this.router.navigate(['/admin/contratos', 'nuevo'], { replaceUrl: true });
      return;
    }

    this.creando = (this.id === 'nuevo');

    this.cargarCombos();

    if (this.creando) {
      this.cargando = false;
      return;
    }

    if (!/^\d+$/.test(this.id)) {
      this.router.navigate(['/admin/contratos']);
      return;
    }

    this.cargarContrato();
  }

  private toArray(r: any): any[] {
    if (Array.isArray(r)) return r;
    if (r && Array.isArray(r.results)) return r.results;
    return [];
  }

  private cargarCombos() {
    // Propiedades sin contrato vigente (solo disponibles para nuevos contratos)
    this.http.get<any>(`${this.baseUrl}/admin/propiedades-disponibles/`).subscribe({
      next: (r) => (this.propiedades = this.toArray(r)),
      error: () => (this.propiedades = []),
    });

    // Solo interesados con rol CLIENTE
    this.http.get<any>(`${this.baseUrl}/admin/interesados-clientes/`).subscribe({
      next: (r) => (this.interesados = this.toArray(r)),
      error: () => (this.interesados = []),
    });
  }

  private cargarContrato() {
    this.cargando = true;
    this.error = null;

    this.http.get<any>(`${this.baseUrl}/contratos/${this.id}/`).subscribe({
      next: (c) => {
        this.contrato = c;

        this.form.tipo = c.tipo;
        this.form.propiedad_id = c.propiedad?.id ?? null;
        this.form.comprador_arrendatario_id = c.comprador_arrendatario?.id ?? null;
        this.form.fecha_firma = (c.fecha_firma || '').slice(0, 10);
        this.form.precio_pactado = c.precio_pactado;
        this.form.vigente = !!c.vigente;

        this.cargando = false;

        // carga tabs
        this.cargarPagos();
        this.cargarDocs();
        this.cargarCuotas();
      },
      error: (e) => {
        this.cargando = false;
        this.error = e?.error?.detail || 'No se pudo cargar el contrato.';
      }
    });
  }

  onFileContratoPdf(ev: any) {
    const f = ev?.target?.files?.[0];
    this.contratoPdfFile = f || null;
  }

  guardarContrato() {
    this.error = null;

    const fd = new FormData();
    fd.append('tipo', this.form.tipo);
    fd.append('propiedad_id', String(this.form.propiedad_id || ''));
    fd.append('comprador_arrendatario_id', String(this.form.comprador_arrendatario_id || ''));
    fd.append('fecha_firma', this.form.fecha_firma || '');
    fd.append('precio_pactado', String(this.form.precio_pactado || '0'));
    fd.append('vigente', String(this.form.vigente));

    if (this.contratoPdfFile) {
      fd.append('archivo_pdf', this.contratoPdfFile);
    }

    if (this.creando) {
      this.http.post<any>(`${this.baseUrl}/contratos/`, fd).subscribe({
        next: (c) => {
          this.router.navigate(['/admin/contratos', c.id]);
        },
        error: (e) => {
          this.error = this.parseError(e) || 'No se pudo crear el contrato.';
        }
      });
      return;
    }

    this.http.patch<any>(`${this.baseUrl}/contratos/${this.id}/`, fd).subscribe({
      next: (c) => {
        this.contrato = c;
        // refresca tabs
        this.cargarPagos();
        this.cargarDocs();
        this.cargarCuotas();
      },
      error: (e) => {
        this.error = this.parseError(e) || 'No se pudo guardar el contrato.';
      }
    });
  }

  // ---------------- PAGOS ----------------
  onFilePago(ev: any) {
    const f = ev?.target?.files?.[0];
    this.pagoFile = f || null;
  }

  cargarPagos() {
    if (this.creando) return;
    this.cargandoPagos = true;

    const params = new HttpParams().set('contrato', String(this.id)).set('ordering', '-fecha');

    this.http.get<any[]>(`${this.baseUrl}/pagos/`, { params }).subscribe({
      next: (r: any) => {
        this.pagos = Array.isArray(r) ? r : (r.results || []);
        this.cargandoPagos = false;
      },
      error: () => {
        this.cargandoPagos = false;
      }
    });
  }

  crearPago() {
    if (this.creando) return;

    if (this.contrato?.tipo === 'arriendo') {
      const nota = (this.pago?.notas || '').trim();
      if (!nota) {
        this.error = 'En arriendo, el pago manual debe llevar una nota/motivo (ej: EXTRA: multa, servicio, reparación).';
        return;
      }
      if (!nota.toUpperCase().startsWith('EXTRA:')) {
        this.pago.notas = `EXTRA: ${nota}`;
      }
    }

    const fd = new FormData();
    fd.append('contrato', String(this.id));
    fd.append('fecha', this.pago.fecha || '');
    fd.append('monto', String(this.pago.monto || '0'));
    fd.append('medio', this.pago.medio || 'transferencia');
    if (this.pago.notas) fd.append('notas', this.pago.notas);
    if (this.pagoFile) fd.append('comprobante', this.pagoFile);

    this.http.post<any>(`${this.baseUrl}/pagos/`, fd).subscribe({
      next: () => {
        this.pago = { fecha: '', monto: null, medio: 'transferencia', notas: '' };
        this.pagoFile = null;
        this.cargarPagos();
        this.cargarContrato();
      },
      error: (e) => {
        this.error = this.parseError(e) || 'No se pudo registrar el pago.';
      }
    });
  }

  // ---------------- DOCS ----------------
  onFileDoc(ev: any) {
    const f = ev?.target?.files?.[0];
    this.docFile = f || null;
  }

  cargarDocs() {
    if (this.creando) return;

    this.cargandoDocs = true;
    const params = new HttpParams().set('contrato', String(this.id));

    this.http.get<any[]>(`${this.baseUrl}/contratos-documentos/`, { params }).subscribe({
      next: (r: any) => {
        this.docs = Array.isArray(r) ? r : (r.results || []);
        this.cargandoDocs = false;
      },
      error: () => {
        this.cargandoDocs = false;
      }
    });
  }

  subirDoc() {
    if (this.creando) return;
    if (!this.docFile) {
      this.error = 'Selecciona un archivo.';
      return;
    }

    const fd = new FormData();
    fd.append('contrato', String(this.id));
    fd.append('tipo', this.doc.tipo || 'otro');
    if (this.doc.nombre) fd.append('nombre', this.doc.nombre);
    fd.append('archivo', this.docFile);

    this.http.post<any>(`${this.baseUrl}/contratos-documentos/`, fd).subscribe({
      next: () => {
        this.doc = { tipo: 'otro', nombre: '' };
        this.docFile = null;
        this.cargarDocs();
      },
      error: (e) => {
        this.error = this.parseError(e) || 'No se pudo subir el documento.';
      }
    });
  }

  eliminarDoc(docId: number) {
    this.http.delete(`${this.baseUrl}/contratos-documentos/${docId}/`).subscribe({
      next: () => this.cargarDocs(),
      error: () => this.error = 'No se pudo eliminar el documento.'
    });
  }

  // ---------------- CUOTAS ----------------
  cargarCuotas() {
    if (this.creando) return;

    this.cargandoCuotas = true;
    const params = new HttpParams().set('contrato', String(this.id)).set('ordering', '-vencimiento');

    this.http.get<any[]>(`${this.baseUrl}/cuotas/`, { params }).subscribe({
      next: (r: any) => {
        this.cuotas = Array.isArray(r) ? r : (r.results || []);
        this.cargandoCuotas = false;
      },
      error: () => {
        this.cargandoCuotas = false;
      }
    });
  }

  crearCuota() {
    if (this.creando) return;

    if (!this.cuota.vencimiento) {
      this.error = 'Debes ingresar la fecha de vencimiento de la cuota.';
      return;
    }

    if (!this.cuota.monto || this.cuota.monto <= 0) {
      this.error = 'El monto de la cuota debe ser mayor a 0.';
      return;
    }

    const payload = {
      contrato: Number(this.id),
      vencimiento: this.cuota.vencimiento,
      monto: this.cuota.monto,
    };

    this.http.post<any>(`${this.baseUrl}/cuotas/`, payload).subscribe({
      next: () => {
        this.cuota = { vencimiento: '', monto: null };
        this.cargarCuotas();
      },
      error: (e) => {
        this.error = this.parseError(e) || 'No se pudo crear la cuota.';
      }
    });
  }

  onFileCuota(ev: any, cuotaId: number) {
    const f = ev?.target?.files?.[0];
    this.cuotaFiles[cuotaId] = f || null;
  }

  pagarCuota(c: any) {
    if (this.creando) return;

    const file = this.cuotaFiles[c.id] || null;

    const fd = new FormData();
    fd.append('monto', String(c.monto));
    fd.append('medio', 'transferencia'); // opcional
    // fd.append('fecha', new Date().toISOString().slice(0, 10)); // opcional
    if (file) fd.append('comprobante', file);

    this.http.post<any>(`${this.baseUrl}/cuotas/${c.id}/pagar/`, fd).subscribe({
      next: () => {
        this.cuotaFiles[c.id] = null;
        this.cargarCuotas();
        this.cargarPagos();
        this.cargarContrato();
      },
      error: (e) => {
        this.error = this.parseError(e) || 'No se pudo marcar pagada.';
      }
    });
  }

  // ---------------- helpers ----------------
  private parseError(e: any): string | null {
    const data = e?.error;
    if (!data) return null;
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;

    // DRF field errors
    const keys = Object.keys(data);
    if (keys.length) {
      const k = keys[0];
      const v = Array.isArray(data[k]) ? data[k].join(', ') : String(data[k]);
      return `${k}: ${v}`;
    }
    return null;
  }

  volverAtras(): void {
    if (this.returnTo) {
      this.router.navigateByUrl(this.returnTo);
      return;
    }
    this.router.navigate(['/admin/contratos']);
  }

  irPanelAdmin(): void {
    this.router.navigate(['/admin']);
  }
}
