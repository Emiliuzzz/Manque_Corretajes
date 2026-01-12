import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminContratosService, Contrato } from '../../../core/services/admin-contratos.service';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-admin-contratos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-contratos.html',
})
export class AdminContratosComponent implements OnInit {
  cargando = true;
  error: string | null = null;

  contratos: Contrato[] = [];
  returnTo: string | null = null;

  // filtros
  q = '';
  tipo = '';        
  vigente = 'true'; 
  order = '-fecha_firma';

  // paginación simple
  page = 1;
  pageSize = 10;
  total = 0;

  constructor(private api: AdminContratosService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo');
    this.cargar();
  }

  volverPanel(): void {
    if (this.returnTo) {
      this.router.navigateByUrl(this.returnTo);
      return;
    }
    this.router.navigate(['/admin']);
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;

    const params: any = {
      search: this.q,         
      tipo: this.tipo,
      ordering: this.order,
      page: this.page,
      page_size: this.pageSize,
    };

    if (this.vigente !== 'all') params.vigente = this.vigente;

    this.api.listarContratos(params).subscribe({
      next: (r) => {
        this.contratos = r.items;
        this.total = r.count;
        this.cargando = false;
      },
      error: (e) => {
        console.error(e);
        this.error = 'No se pudieron cargar los contratos.';
        this.cargando = false;
      }
    });
  }

  aplicar(): void {
    this.page = 1;
    this.cargar();
  }

  limpiar(): void {
    this.q = '';
    this.tipo = '';
    this.vigente = 'true';
    this.order = '-fecha_firma';
    this.page = 1;
    this.cargar();
  }

  prev(): void {
    if (this.page <= 1) return;
    this.page--;
    this.cargar();
  }

  next(): void {
    const maxPage = Math.ceil((this.total || 0) / this.pageSize) || 1;
    if (this.page >= maxPage) return;
    this.page++;
    this.cargar();
  }

  finalizar(id: number): void {
    if (!confirm('¿Finalizar contrato? (vigente = No)')) return;
    this.api.finalizarContrato(id).subscribe({
      next: () => this.cargar(),
      error: (e) => { console.error(e); alert('No se pudo finalizar.'); }
    });
  }
  irNuevo() {
    const qp = this.returnTo ? { returnTo: this.returnTo } : undefined;
    this.router.navigate(['/admin/contratos/nuevo'], { queryParams: qp });
  }
}
