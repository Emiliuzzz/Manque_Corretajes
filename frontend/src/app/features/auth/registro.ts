import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

// Tipo local solo para este componente
interface RegistroPayload {
  nombre: string;
  email: string;
  password: string;
  rut: string;
  telefono: string;
}

@Component({
  standalone: true,
  selector: 'app-registro',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrls: ['./registro.scss'],
})
export class Registro {
  form: RegistroPayload = {
    nombre: '',
    email: '',
    password: '',
    rut: '',
    telefono: '',
  };

  loading = false;
  errorMsg: string | null = null;
  rutError: string | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  // Validar RUT chileno
  validarRut(rut: string): boolean {
    if (!rut) return true; // opcional

    // Limpiar y normalizar
    let valor = rut.replace(/[.\s]/g, '').toUpperCase();
    if (!valor.includes('-') && valor.length >= 2) {
      valor = valor.slice(0, -1) + '-' + valor.slice(-1);
    }

    // Validar formato
    const regex = /^(\d{1,2}\d{3}\d{3})-([0-9K])$/;
    const match = valor.match(regex);
    if (!match) return false;

    // Calcular dígito verificador
    const rutNum = match[1];
    const dv = match[2];

    let suma = 0;
    let multiplo = 2;
    for (let i = rutNum.length - 1; i >= 0; i--) {
      suma += parseInt(rutNum[i]) * multiplo;
      multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    const resto = 11 - (suma % 11);
    let dvCalculado: string;
    if (resto === 11) dvCalculado = '0';
    else if (resto === 10) dvCalculado = 'K';
    else dvCalculado = resto.toString();

    return dv === dvCalculado;
  }

  onRutChange(): void {
    if (this.form.rut && !this.validarRut(this.form.rut)) {
      this.rutError = 'RUT inválido. Verifica el dígito verificador.';
    } else {
      this.rutError = null;
    }
  }

  registrar(): void {
    this.errorMsg = null;

    // Validaciones básicas en el front
    if (!this.form.nombre) {
      this.errorMsg = 'El nombre es obligatorio.';
      return;
    }

    // RUT es obligatorio
    if (!this.form.rut) {
      this.errorMsg = 'El RUT es obligatorio.';
      return;
    }

    // Validar formato RUT
    if (!this.validarRut(this.form.rut)) {
      this.errorMsg = 'El RUT ingresado no es válido.';
      return;
    }

    if (!this.form.email || !this.form.password) {
      this.errorMsg = 'El correo y la contraseña son obligatorios.';
      return;
    }

    if (this.form.password.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.loading = true;

    this.auth.registrar(this.form).subscribe({
      next: (resp: any) => {
        this.loading = false;
        alert(
          resp?.detail ??
            'Cuenta creada correctamente. Ahora puedes iniciar sesión.'
        );
        this.router.navigate(['/login']);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg =
          err.error?.detail ??
          'Ocurrió un error al registrar el usuario. Intenta nuevamente.';
      },
    });
  }
}
