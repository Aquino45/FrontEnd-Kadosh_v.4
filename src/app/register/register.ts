import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, RegisterRequest } from '../../services/auth.service';
import { FilesService } from '../../services/files.service';
import { ToastService } from '../shared/toast/toast.service';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private filesService = inject(FilesService);
  private toast = inject(ToastService);

  private readonly phoneRegex = /^\d{9}$/;
  private readonly dniRegex = /^\d{8}$/;

  readonly defaultAvatar = 'assets/Images/default_user_profile.png';
  readonly remoteDefaultAvatar = 'https://png.pngtree.com/png-clipart/20250820/original/pngtree-whatsapp-default-profile-photo-vector-png-image_22204331.png';

  previewUrl: string = this.defaultAvatar;
  loading = false;
  showPhotoModal = false;

  // 🚀 VARIABLES PARA LOS CAMPOS DE FECHA SEPARADOS
  dia = '';
  mes = '';
  anio = '';

  // 1. Añade estas variables para el control de los ojos
  showPassword = false;
  showConfirmPassword = false;

  // 2. Definición del formulario
  form: FormGroup = this.fb.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.pattern(this.phoneRegex)]],
    dni: ['', [Validators.required, Validators.pattern(this.dniRegex)]],
    fechaNacimiento: ['', [Validators.required]],
    edad: [{ value: null, disabled: true }, [Validators.required]],

    // Campo original
    password: ['', [Validators.required, Validators.minLength(6)]],
    // CAMBIO: Añadimos el campo de confirmación
    confirmPassword: ['', [Validators.required]],

    foto: [null],
    tieneApoderado: [false],
    nombreApoderado: [''],
    apellidoApoderado: [''],
    dniApoderado: ['', [Validators.pattern(this.dniRegex)]],
    telefonoApoderado: ['', [Validators.pattern(this.phoneRegex)]],
    parentesco: ['']
  }, {
    // 3. Validador personalizado para comparar contraseñas
    validators: this.passwordMatchValidator
  });

  // Lógica de validación
  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirm = g.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  // Métodos para los ojos
  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }


  get f() { return this.form.controls; }

  ngOnInit() {
    // 1. Validador personalizado para la fecha armada
    this.form.get('fechaNacimiento')?.setValidators([
      Validators.required,
      this.validadorFecha.bind(this)
    ]);

    // 2. Cálculo de edad automático al cambiar la fecha completa
    this.form.get('fechaNacimiento')?.valueChanges.subscribe(fecha => {
      if (fecha && this.esFechaValida(fecha)) {
        const edad = this.calcularEdad(fecha);
        this.form.patchValue({ edad: edad >= 0 ? edad : 0 }, { emitEvent: false });
      } else {
        this.form.patchValue({ edad: null }, { emitEvent: false });
      }
    });

    // 3. Lógica de Validators para Apoderado
    this.form.get('tieneApoderado')?.valueChanges.subscribe(activado => {
      this.toggleApoderadoValidators(activado);
    });
  }

  // --- MÉTODOS DE INPUT PARA LA FECHA ---

  onlyNumbers(event: KeyboardEvent): boolean {
    return /\d/.test(event.key);
  }

  onDiaInput(event: Event, nextInput: HTMLInputElement) {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '');

    if (valor.length === 2) {
      const n = parseInt(valor);
      if (n > 31) valor = '31';
      if (n < 1) valor = '01';
      nextInput.focus();
    }
    this.dia = valor;
    input.value = valor;
    this.actualizarFechaCompleta();
  }

  onMesInput(event: Event, nextInput: HTMLInputElement) {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '');

    if (valor.length === 2) {
      const n = parseInt(valor);
      if (n > 12) valor = '12';
      if (n < 1) valor = '01';
      nextInput.focus();
    }
    this.mes = valor;
    input.value = valor;
    this.actualizarFechaCompleta();
  }

  onAnioInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '');

    if (valor.length > 4) valor = valor.substring(0, 4);

    this.anio = valor;
    input.value = valor;
    this.actualizarFechaCompleta();
  }

  private actualizarFechaCompleta() {
    if (this.dia.length === 2 && this.mes.length === 2 && this.anio.length === 4) {
      const fechaFull = `${this.dia}/${this.mes}/${this.anio}`;
      this.form.get('fechaNacimiento')?.setValue(fechaFull);
      this.form.get('fechaNacimiento')?.markAsTouched();
    } else {
      this.form.get('fechaNacimiento')?.setValue('');
    }
  }

  // --- VALIDACIONES Y CÁLCULOS ---

  private validadorFecha(control: any) {
    const valor = control.value;
    if (!valor) return null;
    return this.esFechaValida(valor) ? null : { invalidDate: true };
  }

  private esFechaValida(fecha: string): boolean {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = fecha.match(regex);
    if (!match) return false;

    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const a = parseInt(match[3], 10);

    const hoy = new Date();
    if (a < 1800 || a > hoy.getFullYear()) return false;

    const diasMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (a % 4 === 0 && (a % 100 !== 0 || a % 400 === 0)) diasMes[1] = 29;

    return m >= 1 && m <= 12 && d > 0 && d <= diasMes[m - 1];
  }

  private calcularEdad(fechaStr: string): number {
    const [d, m, a] = fechaStr.split('/').map(Number);
    const nacimiento = new Date(a, m - 1, d);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mesDiff = hoy.getMonth() - nacimiento.getMonth();
    if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < d)) edad--;
    return edad;
  }

  private toggleApoderadoValidators(activado: boolean) {
    const campos = ['nombreApoderado', 'apellidoApoderado', 'dniApoderado', 'telefonoApoderado', 'parentesco'];
    campos.forEach(c => {
      const ctrl = this.form.get(c);
      if (activado) {
        ctrl?.setValidators([Validators.required, ...(c.includes('dni') ? [Validators.pattern(this.dniRegex)] : c.includes('telef') ? [Validators.pattern(this.phoneRegex)] : [])]);
      } else {
        ctrl?.clearValidators();
        ctrl?.setValue('');
      }
      ctrl?.updateValueAndValidity();
    });
  }

  // --- FLUJO DE REGISTRO ---

  onPickPhoto(input: HTMLInputElement) { input.click(); }

  onPhotoSelected(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    this.form.patchValue({ foto: file });
    const reader = new FileReader();
    reader.onload = () => (this.previewUrl = String(reader.result));
    reader.readAsDataURL(file);
  }

  removePhoto() {
    this.form.patchValue({ foto: null });
    this.previewUrl = this.defaultAvatar;
  }

  irALogin(): void { this.router.navigateByUrl('/login'); }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Completa los campos obligatorios correctamente.');
      return;
    }
    if (!this.form.get('foto')?.value) {
      this.showPhotoModal = true;
      return;
    }
    this.procederConRegistro(false);
  }

  async procederConRegistro(usarDefault: boolean) {
    this.showPhotoModal = false;
    this.loading = true;
    const val = this.form.getRawValue();

    try {
      let finalImageUrl = usarDefault ? this.remoteDefaultAvatar : null;
      if (val.foto && !usarDefault) {
        const uploaded = await this.filesService.upload(val.foto, 'PROFILE');
        finalImageUrl = uploaded?.url;
      }

      const payload: RegisterRequest = {
        nombre: val.nombre,
        apellido: val.apellido,
        email: val.email,
        telefono: val.telefono,
        dni: val.dni,
        password: val.password,
        fechaNacimiento: val.fechaNacimiento, // Ya viene en DD/MM/AAAA
        imagenUrl: finalImageUrl || this.remoteDefaultAvatar,
        apoderado: val.tieneApoderado ? {
          nombre: val.nombreApoderado,
          apellido: val.apellidoApoderado,
          dni: val.dniApoderado,
          telefono: val.telefonoApoderado,
          parentesco: val.parentesco
        } : null
      };

      const resp = await this.authService.register(payload);
      if (resp?.success) {
        this.toast.success('¡Registro exitoso en Ópticas Kadosh!');
        this.router.navigateByUrl('/login');
      } else {
        this.toast.error(resp?.message || 'Error al registrar.');
      }
    } catch (err: any) {
      // 1. PRIMERO: Verificamos si el servidor está caído o no hay internet
      if (err.status === 0) {
        this.toast.error('Error de conexión con el servidor.');
      }
      // 2. SI HAY CONEXIÓN: Verificamos qué error nos devolvió el Backend
      else {
        const mensajeError = err.error?.message || err.message || 'Error desconocido';

        if (typeof mensajeError === 'string' && mensajeError.includes('DNI')) {
          this.toast.warning('Ese DNI ya está registrado.');
        } else if (typeof mensajeError === 'string' && (mensajeError.includes('Email') || mensajeError.includes('correo'))) {
          this.toast.warning('Ese correo ya está en uso.');
        } else {
          this.toast.error('No se pudo registrar: ' + mensajeError);
        }
      }

    } finally {
      this.loading = false;
    }


  }

  cancelarModal() { this.showPhotoModal = false; }
}