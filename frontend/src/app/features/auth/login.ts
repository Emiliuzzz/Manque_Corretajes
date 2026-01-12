import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  usernameOrEmail = '';
  password = '';
  loading = false;
  errorMsg: string | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  iniciarSesion() {
    this.errorMsg = null;

    if (!this.usernameOrEmail || !this.password) {
      this.errorMsg = 'Debe ingresar usuario/correo y contraseña.';
      return;
    }

    this.loading = true;

    // En tu backend, el login usa "username"; si quieres login por email,
    // por ahora mandamos el valor tal cual en "username"
    this.auth.login(this.usernameOrEmail, this.password).subscribe({
      next: (resp) => {
        this.loading = false;
        // Guardar token
        this.auth.setToken(resp.access);
        // Redirigir al catálogo o perfil
        this.router.navigate(['/catalogo']);
      },
      error: (err) => {
        this.loading = false;
        console.error('Error login:', err);
        this.errorMsg =
          err.error?.detail || 'Credenciales incorrectas. Intente nuevamente.';
      },
    });
  }
}
