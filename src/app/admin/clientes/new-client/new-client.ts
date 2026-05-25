import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { FilesService } from '../../../../services/files.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  standalone: true,
  selector: 'app-new-client',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './new-client.html',
  styleUrls: ['./new-client.css']
})
export class NewClientComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

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
  imagenUrlManual: string = '';
  loading = false;

  showPhotoModal = false;
  showApoderado = false;

  // Variables para los campos de fecha separados
  dia = '';
  mes = '';
  anio = '';

  form: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.pattern(this.phoneRegex)]],
    dni: ['', [Validators.required, Validators.pattern(this.dniRegex)]],
    fechaNacimiento: ['', [Validators.required]],
    edad: [{ value: null, disabled: true }, [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    foto: [null],

    nombreApoderado: [''],
    apellidoApoderado: [''],
    dniApoderado: ['', [Validators.pattern(this.dniRegex)]],
    telefonoApoderado: ['', [Validators.pattern(this.phoneRegex)]],
    parentesco: ['']
  });

  get f() { return this.form.controls; }

  ngOnInit() {
    this.form.get('fechaNacimiento')?.setValidators([
      Validators.required,
      this.validadorFecha.bind(this)
    ]);

    this.form.get('fechaNacimiento')?.valueChanges.subscribe(fecha => {
      if (fecha && this.esFechaValida(fecha)) {
        const edad = this.calcularEdad(fecha);
        this.form.patchValue({ edad: edad > 0 ? edad : 0 }, { emitEvent: false });
      }
    });
  }

  onlyNumbers(event: KeyboardEvent): boolean {
    const char = event.key;
    if (!/\d/.test(char)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onDiaInput(event: Event, nextInput: HTMLInputElement) {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '');
    
    if (valor.length > 2) {
      valor = valor.substring(0, 2);
    }
    
    if (valor.length === 2) {
      const diaNum = parseInt(valor);
      if (diaNum > 31) valor = '31';
      if (diaNum < 1) valor = '01';
      nextInput.focus();
    }
    
    this.dia = valor;
    input.value = valor;
    this.actualizarFechaCompleta();
  }

  onMesInput(event: Event, nextInput: HTMLInputElement) {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '');
    
    if (valor.length > 2) {
      valor = valor.substring(0, 2);
    }
    
    if (valor.length === 2) {
      const mesNum = parseInt(valor);
      if (mesNum > 12) valor = '12';
      if (mesNum < 1) valor = '01';
      nextInput.focus();
    }
    
    this.mes = valor;
    input.value = valor;
    this.actualizarFechaCompleta();
  }

  onAnioInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '');
    
    if (valor.length > 4) {
      valor = valor.substring(0, 4);
    }
    
    this.anio = valor;
    input.value = valor;
    this.actualizarFechaCompleta();
  }

  private actualizarFechaCompleta() {
    if (this.dia.length === 2 && this.mes.length === 2 && this.anio.length === 4) {
      const fechaCompleta = `${this.dia}/${this.mes}/${this.anio}`;
      this.form.patchValue({ fechaNacimiento: fechaCompleta }, { emitEvent: true });
      this.form.get('fechaNacimiento')?.markAsTouched();
    } else {
      this.form.patchValue({ fechaNacimiento: '' }, { emitEvent: false });
    }
  }

  validadorFecha(control: any) {
    const valor = control.value;
    if (!valor) return null;
    
    if (!this.esFechaValida(valor)) {
      return { invalidDate: true };
    }
    return null;
  }

  private esFechaValida(fecha: string): boolean {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = fecha.match(regex);
    
    if (!match) return false;
    
    const dia = parseInt(match[1], 10);
    const mes = parseInt(match[2], 10);
    const anio = parseInt(match[3], 10);
    
    if (mes < 1 || mes > 12) return false;
    if (dia < 1 || dia > 31) return false;
    if (anio < 1800 || anio > new Date().getFullYear()) return false;
    
    const diasPorMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    if (anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0)) {
      diasPorMes[1] = 29;
    }
    
    return dia <= diasPorMes[mes - 1];
  }

  private calcularEdad(fechaStr: string): number {
    const [dia, mes, anio] = fechaStr.split('/').map(Number);
    const nacimiento = new Date(anio, mes - 1, dia);
    const hoy = new Date();
    
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mesDiff = hoy.getMonth() - nacimiento.getMonth();
    
    if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad;
  }

  toggleApoderado(forceState?: boolean) {
    this.showApoderado = forceState !== undefined ? forceState : !this.showApoderado;

    const fields = ['nombreApoderado', 'apellidoApoderado', 'dniApoderado', 'telefonoApoderado', 'parentesco'];

    fields.forEach(fName => {
      const ctrl = this.form.get(fName);
      if (this.showApoderado) {
        ctrl?.setValidators([Validators.required]);
        if (fName === 'dniApoderado') ctrl?.setValidators([Validators.required, Validators.pattern(this.dniRegex)]);
        if (fName === 'telefonoApoderado') ctrl?.setValidators([Validators.required, Validators.pattern(this.phoneRegex)]);
      } else {
        ctrl?.clearValidators();
        ctrl?.setValue(null);
      }
      ctrl?.updateValueAndValidity();
    });
  }

  private buildFechaCustom(fechaStr: string): string {
    return fechaStr || '';
  }

  cancel() {
    this.close.emit();
  }

  onPickPhoto(input: HTMLInputElement) {
    input.click();
  }

  onPhotoSelected(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toast.warning('El archivo seleccionado no es una imagen válida.');
      return;
    }
    this.form.patchValue({ foto: file });
    const reader = new FileReader();
    reader.onload = () => (this.previewUrl = String(reader.result));
    reader.readAsDataURL(file);
  }

  removePhoto() {
    this.form.patchValue({ foto: null });
    this.imagenUrlManual = '';
    this.previewUrl = this.defaultAvatar;
  }

  onImageUrlInput(event: Event) {
    const url = (event.target as HTMLInputElement).value.trim();
    this.imagenUrlManual = url;
    this.previewUrl = url || this.defaultAvatar;
    if (url) this.form.patchValue({ foto: null });
  }

  private scrollToFirstError() {
    setTimeout(() => {
      const el = document.querySelector('input.ng-invalid') as HTMLElement | null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus();
    });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.scrollToFirstError();
      return;
    }

    if (!this.form.get('foto')?.value && !this.imagenUrlManual) {
      this.showPhotoModal = true;
      return;
    }

    this.procederConGuardado(false);
  }

  async procederConGuardado(usarDefault: boolean) {
    this.showPhotoModal = false;
    this.loading = true;

    const val = this.form.getRawValue();
    const fechaFinal = this.buildFechaCustom(val.fechaNacimiento);
    let finalImageUrl = usarDefault ? this.remoteDefaultAvatar : null;

    try {
      if (val.foto && !usarDefault) {
        const uploaded = await this.filesService.upload(val.foto, 'PROFILE');
        if (uploaded?.url) finalImageUrl = uploaded.url;
      } else if (this.imagenUrlManual && !usarDefault) {
        finalImageUrl = this.imagenUrlManual;
      }

      const payload: any = {
        nombre: val.nombre,
        apellido: val.apellido,
        email: val.email,
        telefono: val.telefono,
        dni: val.dni,
        password: val.password,
        edad: val.edad,
        fechaNacimiento: fechaFinal,
        imagenUrl: finalImageUrl || this.remoteDefaultAvatar,
        apoderado: null
      };

      if (this.showApoderado) {
        payload.apoderado = {
          nombre: val.nombreApoderado,
          apellido: val.apellidoApoderado,
          dni: val.dniApoderado,
          telefono: val.telefonoApoderado,
          parentesco: val.parentesco
        };
      }

      const resp = await this.authService.register(payload);

      if (resp?.success) {
        this.toast.success('Cliente registrado correctamente.');
        this.close.emit();
        this.router.navigate(['/admin/clientes']);
      } else {
        this.toast.error(resp?.message || 'Error al guardar cliente.');
      }

    } catch (err: any) {
      this.toast.error(err?.error?.message || 'Error inesperado.');
    } finally {
      this.loading = false;
    }
  }

  cancelarModal() {
    this.showPhotoModal = false;
  }
}