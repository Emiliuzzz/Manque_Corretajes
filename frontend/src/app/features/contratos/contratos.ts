import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Contrato, ContratoService } from '../../core/services/contrato.service';

@Component({
  selector: 'app-contratos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contratos.html',
})
export class ContratosComponent implements OnInit {
  cargando = true;
  error: string | null = null;
  contratos: Contrato[] = [];

  constructor(private contratosService: ContratoService) {}

  ngOnInit(): void {
    this.contratosService.listar().subscribe({
      next: (data: Contrato[]) => {
        this.contratos = Array.isArray(data) ? data : [];
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error contratos:', err);
        this.error = err?.error?.detail || err?.message || 'No se pudieron cargar los contratos.';
        this.cargando = false;
      },
    });
  }

  trackById(_: number, c: Contrato) {
    return c.id;
  }
}
