import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { PerfilPropietarioComponent } from '../propietario/perfil-propietario';
import { PerfilClienteComponent } from '../cliente/perfil-cliente';

@Component({
  standalone: true,
  selector: 'app-perfil',
  imports: [CommonModule, PerfilPropietarioComponent, PerfilClienteComponent],
  template: `
    <div class="container mt-4" *ngIf="user; else sinUser">
      <h2>Mi perfil</h2>

      <div class="card mb-3 shadow-sm">
        <div class="card-body">
          <p><strong>Usuario:</strong> {{ user.username }}</p>
          <p><strong>Email:</strong> {{ user.email }}</p>
          <p><strong>Rol:</strong> {{ user.rol }}</p>
          <small class="text-muted">
            Estos son los datos de tu cuenta de acceso.
          </small>
        </div>
      </div>

      <!-- ===== BLOQUE PROPIETARIO ===== -->
      <div *ngIf="user.rol === 'PROPIETARIO'" class="mt-3">
        <app-perfil-propietario></app-perfil-propietario>
      </div>

      <!-- ===== BLOQUE CLIENTE ===== -->
      <div *ngIf="user.rol === 'CLIENTE'" class="mt-3">
        <div class="alert alert-info">
          Actualmente tu rol es <strong>CLIENTE</strong>. Desde esta página puedes
          completar tus datos de cliente y enviar nuevas solicitudes a la corredora.
        </div>

        <app-perfil-cliente></app-perfil-cliente>
      </div>

      <!-- Mensaje para otros roles -->
      <div
        *ngIf="user.rol !== 'PROPIETARIO' && user.rol !== 'CLIENTE'"
        class="alert alert-info mt-3"
      >
        Actualmente tu rol es <strong>{{ user.rol }}</strong>.
        Si necesitas otro tipo de acceso, contacta al administrador.
      </div>
    </div>

    <ng-template #sinUser>
      <div class="container mt-4">
        <div class="alert alert-warning">
          No hay información de usuario. Inicia sesión nuevamente.
        </div>
      </div>
    </ng-template>
  `,
})
export class PerfilComponent {
  user: any = null;

  constructor(private auth: AuthService) {
    this.user = this.auth.getPayload();
  }
}
