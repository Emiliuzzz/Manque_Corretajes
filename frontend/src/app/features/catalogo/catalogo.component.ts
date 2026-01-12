import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PropiedadService, Propiedad } from '../../core/services/propiedad.service';

@Component({
  standalone: true,
  selector: 'app-catalogo',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './catalogo.html',
})
export class Catalogo implements OnInit {
  propiedades: Propiedad[] = [];
  cargando = false;
  error?: string;

  // Filtros
  filtros = {
    search: '',
    ciudad: '',
    tipo: '',
    estado: '',
    precio_min: null as number | null,
    precio_max: null as number | null,
    dormitorios_min: null as number | null,
  };

  // Opciones para los selectores
  ciudades: string[] = [];
  tipos = ['casa', 'departamento', 'parcela', 'oficina', 'local', 'terreno'];
  estados = ['disponible', 'arrendada', 'vendida', 'reservada'];

  mostrarFiltros = true;

  constructor(private propSrv: PropiedadService) {}

  ngOnInit(): void {
    this.cargarPropiedades();
  }

  cargarPropiedades(): void {
    this.cargando = true;
    this.error = undefined;

    const filtrosActivos: any = {};
    if (this.filtros.search?.trim()) filtrosActivos.search = this.filtros.search.trim();
    if (this.filtros.ciudad) filtrosActivos.ciudad = this.filtros.ciudad;
    if (this.filtros.tipo) filtrosActivos.tipo = this.filtros.tipo;
    if (this.filtros.estado) filtrosActivos.estado = this.filtros.estado;
    if (this.filtros.precio_min) filtrosActivos.precio_min = this.filtros.precio_min;
    if (this.filtros.precio_max) filtrosActivos.precio_max = this.filtros.precio_max;
    if (this.filtros.dormitorios_min) filtrosActivos.dormitorios_min = this.filtros.dormitorios_min;

    this.propSrv.listarCatalogo(filtrosActivos).subscribe({
      next: (data) => {
        this.propiedades = data;
        this.cargando = false;
        // Extraer ciudades únicas para el filtro
        this.extraerCiudades(data);
      },
      error: (err) => {
        console.error('Error al cargar propiedades', err);
        this.error = 'No fue posible cargar las propiedades.';
        this.cargando = false;
      },
    });
  }

  private extraerCiudades(propiedades: Propiedad[]): void {
    const ciudadesSet = new Set<string>();
    propiedades.forEach(p => {
      if (p.ciudad) ciudadesSet.add(p.ciudad);
    });
    this.ciudades = Array.from(ciudadesSet).sort();
  }

  aplicarFiltros(): void {
    this.cargarPropiedades();
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      ciudad: '',
      tipo: '',
      estado: '',
      precio_min: null,
      precio_max: null,
      dormitorios_min: null,
    };
    this.cargarPropiedades();
  }

  toggleFiltros(): void {
    this.mostrarFiltros = !this.mostrarFiltros;
  }
}
