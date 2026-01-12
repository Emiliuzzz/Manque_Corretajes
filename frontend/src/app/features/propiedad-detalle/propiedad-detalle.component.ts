import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PropiedadService, Propiedad } from '../../core/services/propiedad.service';
import { AuthService } from '../../core/services/auth.service';

interface PropiedadFoto {
  id: number;
  url: string | null;
  orden: number;
  principal: boolean;
}

@Component({
  standalone: true,
  selector: 'app-propiedad-detalle',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './propiedad-detalle.html',
})
export class PropiedadDetalleComponent implements OnInit {
  prop: Propiedad | null = null;
  cargando = true;
  error: string | null = null;

  // --- Galería ---
  fotoSeleccionada: PropiedadFoto | null = null;
  lightboxVisible = false;
  lightboxFoto: PropiedadFoto | null = null;

  // Reserva
  mostrarReserva = false;
  reservaMonto: number | null = null;
  reservaNotas = '';
  creandoReserva = false;
  reservaError: string | null = null;
  reservaExito: string | null = null;

  estaLogueado = false;
  esCliente = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propSrv: PropiedadService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    const payload = this.auth.getPayload();
    this.estaLogueado = !!payload;
    this.esCliente = payload?.rol === 'CLIENTE';

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Propiedad no encontrada.';
      this.cargando = false;
      return;
    }

    this.propSrv.detalle(id).subscribe({
      next: (p) => {
        this.prop = p;

        const fotos = ((p as any).fotos || []) as PropiedadFoto[];
        this.fotoSeleccionada =
          fotos.find((f) => f.principal) || fotos[0] || null;

        this.cargando = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No fue posible cargar los detalles de la propiedad.';
        this.cargando = false;
      },
    });
  }

  // --- Galería ---

  seleccionarFoto(foto: PropiedadFoto): void {
    this.fotoSeleccionada = foto;
  }

  abrirLightbox(foto: PropiedadFoto | null): void {
    if (!foto) return;
    this.lightboxFoto = foto;
    this.lightboxVisible = true;
  }

  cerrarLightbox(): void {
    this.lightboxVisible = false;
    this.lightboxFoto = null;
  }

  // --- Reserva ---

  abrirReserva(): void {
    this.reservaError = null;
    this.reservaExito = null;

    if (!this.estaLogueado) {
      this.router.navigate(['/login'], {
        queryParams: { next: this.router.url },
      });
      return;
    }

    if (!this.esCliente) {
      this.reservaError =
        'Solo los usuarios con rol CLIENTE pueden solicitar una reserva.';
      return;
    }

    this.mostrarReserva = !this.mostrarReserva;
  }

  enviarReserva(): void {
    if (!this.prop) return;

    if (!this.reservaMonto || this.reservaMonto <= 0) {
      this.reservaError = 'Ingresa un monto de reserva válido.';
      return;
    }

    this.creandoReserva = true;
    this.reservaError = null;
    this.reservaExito = null;

    this.propSrv
      .crearReserva(this.prop.id, {
        monto_reserva: this.reservaMonto,
        notas: this.reservaNotas,
      })
      .subscribe({
        next: () => {
          this.creandoReserva = false;
          this.reservaExito =
            'Tu solicitud de reserva fue registrada. La corredora revisará la solicitud y se pondrá en contacto contigo.';
          this.mostrarReserva = false;
          this.reservaMonto = null;
          this.reservaNotas = '';
        },
        error: (err) => {
          console.error('Error al crear reserva', err);
          this.creandoReserva = false;
          this.reservaError =
            err?.error?.detail ||
            err?.error?.message ||
            'No fue posible registrar la reserva. Intenta nuevamente más tarde.';
        },
      });
  }
}
