import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  inject,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UsuariosService } from '../../../../services/usuarios.service';
import { FilesService } from '../../../../services/files.service';
import { ToastService } from '../../../shared/toast/toast.service';

export type EditClient = {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
  imagenUrl?: string | null;
  estado?: string | null; // 🚨 AGREGA ESTO
};

@Component({
  standalone: true,
  selector: 'app-modal-edit',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-edit.html',
  styleUrls: ['./modal-edit.css'],
})
export class ModalEditComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() client: EditClient | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private usuariosSvc = inject(UsuariosService);
  private filesSvc = inject(FilesService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  loading = false;
  saving = false;

  // Variables visuales
  previewUrl: string = 'assets/Images/default_user_profile.png';
  edadCalculada: string | number = '---';

  dia = '';
  mes = '';
  anio = '';

  // Estados lógicos
  hasApoderado = false;
  eliminarApoderadoFlag = false;

  // Control de cambios
  private initialValue: any = null;
  private subs: Subscription = new Subscription();

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    telefono: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],

    estado: ['ACTIVO'], // 🚨 AGREGA ESTA LÍNEA
    newPassword: ['', [Validators.minLength(6)]], // 🚀 AÑADE ESTO

    imagenUrl: ['', [Validators.maxLength(1000)]],
    fechaNacimiento: ['', [Validators.required, this.validadorFecha.bind(this)]],
    foto: [null as File | null],

    // Inicialmente no son requeridos (se activan en toggleApoderado)
    nombreApoderado: [''],
    apellidoApoderado: [''],
    dniApoderado: [''],
    telefonoApoderado: [''],
    parentesco: [''] // 👈 ANTES DECÍA 'Madre', AHORA LO DEJAMOS VACÍO
  });

  constructor() {
    this.subs.add(
      this.form.get('fechaNacimiento')?.valueChanges.subscribe(val => {
        // 🔒 CORRECCIÓN: Solo calcula edad si la fecha es válida (incluyendo año >= 1800)
        if (val && this.esFechaValida(val)) {
          this.calcularEdadVisual(val);
        } else {
          // Si es menor a 1800 o inválida, mostramos guiones
          this.edadCalculada = '---';
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ==========================================================
  // 1. CARGA DE DATOS (USANDO HELPER DE FECHA)
  // ==========================================================
  async loadClient(): Promise<void> {
    if (!this.client?.id) return;
    this.loading = true;

    try {
      const res = await this.usuariosSvc.getById(this.client.id);
      const found = res.data;

      if (found) {
        // --- 1. Lógica Apoderado ---
        this.hasApoderado = !!found.nombreApoderado && found.nombreApoderado !== 'Ninguno';

        // Activamos/Desactivamos validaciones (modoCarga = true para no borrar datos)
        this.toggleApoderado(this.hasApoderado, true);
        this.eliminarApoderadoFlag = false;

        // --- 2. Lógica FECHA (Usando tu nuevo helper) ---
        // Esto detecta automáticamente el formato y llena this.dia, this.mes, this.anio
        this.extraerFechaSegura(found.fechaNacimiento);

        // Armamos el string final "dd/MM/yyyy" para que el FormValidator lo acepte
        const fechaConBarras = (this.dia && this.mes && this.anio)
          ? `${this.dia}/${this.mes}/${this.anio}`
          : '';

        this.edadCalculada = found.edad || '---';

        // --- 3. Limpiar "Ninguno" del Apoderado ---
        const nombreApoLimpio = (found.nombreApoderado === 'Ninguno') ? '' : (found.nombreApoderado || '');

        // --- 4. Llenar Formulario ---
        this.form.patchValue({
          nombre: found.nombre || '',
          apellido: found.apellido || '',
          email: found.correo || '',
          telefono: found.telefono || '',
          dni: found.dni || '',

          estado: found.estado || 'ACTIVO', // 🚨 Agrega esto

          imagenUrl: found.imagenUrl || '',
          fechaNacimiento: fechaConBarras,
          foto: null,
          nombreApoderado: nombreApoLimpio,
          apellidoApoderado: found.apellidoApoderado || '',
          dniApoderado: found.dniApoderado || '',
          telefonoApoderado: found.telefonoApoderado || '',
          parentesco: found.parentesco || ''
        });

        // Guardamos estado inicial para comparar cambios luego
        this.initialValue = this.form.getRawValue();
        const src = (found.imagenUrl ?? '').trim();
        this.previewUrl = src !== '' ? src : 'assets/Images/default_user_profile.png';
      }
    } catch (e: any) {
      console.error(e);
      this.toast.error(e?.error?.message || 'Error al cargar los datos del cliente');
      this.resetState();
    } finally {
      this.loading = false;
    }
  }

  // --- HELPER PARA EXTRAER FECHA SIN IMPORTAR EL FORMATO ---
  private extraerFechaSegura(raw: any) {
    this.dia = ''; this.mes = ''; this.anio = '';

    if (!raw) return;

    let d, m, y;

    // Caso 1: Array de Java [2008, 12, 5]
    if (Array.isArray(raw) && raw.length >= 3) {
      y = raw[0];
      m = raw[1];
      d = raw[2];
    }
    // Caso 2: String
    else if (typeof raw === 'string') {
      // Formato ISO "2008-12-05" o con hora "2008-12-05T..."
      if (raw.includes('-')) {
        const parts = raw.split('T')[0].split('-');
        if (parts.length === 3) {
          y = parts[0]; m = parts[1]; d = parts[2];
        }
      }
      // Formato "05/12/2008" (por si acaso)
      else if (raw.includes('/')) {
        const parts = raw.split('/');
        if (parts.length === 3) {
          // Detectar si es yyyy/mm/dd o dd/mm/yyyy
          if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; }
          else { d = parts[0]; m = parts[1]; y = parts[2]; }
        }
      }
    }
    // Caso 3: Objeto Date o Timestamp
    else if (raw instanceof Date || typeof raw === 'number') {
      const dateObj = new Date(raw);
      if (!isNaN(dateObj.getTime())) {
        d = dateObj.getUTCDate(); // Usamos UTC para evitar líos de zona horaria
        m = dateObj.getUTCMonth() + 1;
        y = dateObj.getUTCFullYear();
      }
    }

    // Asignar a las variables visuales con ceros a la izquierda
    if (d && m && y) {
      this.dia = d.toString().padStart(2, '0');
      this.mes = m.toString().padStart(2, '0');
      this.anio = y.toString();
    }
  }

  // ==========================================================
  // 2. CICLO DE VIDA
  // ==========================================================
  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['open'] && this.open) {
      await this.loadClient();
    } else if (!this.open) {
      this.resetState();
    }
  }

  private resetState() {
  // 1. Resetea todos los valores del formulario a su estado inicial
  this.form.reset();

  // 2. Limpieza específica del campo de contraseña (Bypass Admin)
  this.form.patchValue({ newPassword: '' });

  // 3. Reset de variables de control y estado inicial
  this.initialValue = null;
  this.previewUrl = 'assets/Images/default_user_profile.png';
  
  // 4. Reset de lógica de apoderado
  this.hasApoderado = false;
  this.eliminarApoderadoFlag = false;
  
  // 5. Reset de datos calculados
  this.edadCalculada = '---';
  this.dia = '';
  this.mes = '';
  this.anio = '';

  // 6. Limpiar validaciones y estados de los campos de apoderado
  this.toggleApoderado(false);
}

  // ==========================================================
  // 3. LÓGICA APODERADO (CORREGIDA CON VALIDACIONES)
  // ==========================================================
  toggleApoderado(activar: boolean, modoCarga = false) {
    this.hasApoderado = activar;

    // Lista de campos
    const controls = ['nombreApoderado', 'apellidoApoderado', 'dniApoderado', 'telefonoApoderado', 'parentesco'];

    if (activar) {
      this.eliminarApoderadoFlag = false;

      // 1. Establecer validadores OBLIGATORIOS
      controls.forEach(c => {
        const ctrl = this.form.get(c);
        // Base: Requerido
        const validators = [Validators.required];

        // Extras: Patrones
        if (c === 'dniApoderado') validators.push(Validators.pattern(/^\d{8}$/));
        if (c === 'telefonoApoderado') validators.push(Validators.pattern(/^\d{9}$/));

        ctrl?.setValidators(validators);
        ctrl?.updateValueAndValidity();
      });

      // 🚨 ELIMINADO: Ya no ponemos 'Madre' por defecto. 
      // Ahora el campo inicia vacío para que escribas lo que quieras.

    } else {
      this.eliminarApoderadoFlag = true;

      // 1. Limpiar valores visualmente (solo si no estamos cargando datos iniciales "sin apoderado")
      if (!modoCarga) {
        this.form.patchValue({
          nombreApoderado: '',
          apellidoApoderado: '',
          dniApoderado: '',
          telefonoApoderado: '',
          parentesco: ''
        });
      }

      // 2. QUITAR VALIDACIONES (Para que deje guardar sin apoderado)
      controls.forEach(c => {
        this.form.get(c)?.clearValidators();
        this.form.get(c)?.updateValueAndValidity();
      });
    }
  }

  // ==========================================================
  // 4. CÁLCULOS Y HELPERS
  // ==========================================================
  private calcularEdadVisual(fechaStr: string | null) {
    if (!fechaStr || fechaStr.length !== 10) {
      this.edadCalculada = '---';
      return;
    }
    // Formato entrante: "05/12/2008" -> split('/')
    const parts = fechaStr.split('/');
    // Convertir a Date(yyyy, mm-1, dd)
    const nacimiento = new Date(+parts[2], +parts[1] - 1, +parts[0]);

    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    this.edadCalculada = (edad >= 0) ? edad : 0;
  }

  hasChanges(): boolean {
  // 1. Si no hay valor inicial cargado, no hay cambios comparables
  if (!this.initialValue) return false;

  const current = this.form.getRawValue();

  // 2. Si el administrador escribió algo en el campo de nueva contraseña, hay cambios
  if (current.newPassword && current.newPassword.trim().length >= 6) {
    return true;
  }

  // 3. Si se marcó la bandera para eliminar al apoderado, hay cambios
  if (this.eliminarApoderadoFlag) return true;

  // 4. Si se seleccionó una nueva foto para subir, hay cambios
  if (current.foto) return true;

  // 5. Comparación profunda del resto de campos (DNI, Nombre, Estado, etc.)
  // Extraemos 'foto' y 'newPassword' de la comparación de objetos para no tener falsos positivos
  const { foto: f1, newPassword: p1, ...val1 } = current;
  const { foto: f2, newPassword: p2, ...val2 } = this.initialValue;

  return JSON.stringify(val1) !== JSON.stringify(val2);
}

  private formatDateForInput(raw: any): string {
    if (!raw) return '';
    let date: Date | null = null;
    if (Array.isArray(raw)) date = new Date(raw[0], raw[1] - 1, raw[2]);
    else if (typeof raw === 'string') date = new Date(raw);

    return (date && !isNaN(date.getTime()))
      ? date.toISOString().split('T')[0]
      : '';
  }

  // ==========================================================
  // 5. ACCIONES
  // ==========================================================
  onPhotoSelected(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.form.patchValue({ foto: file });
      const reader = new FileReader();
      reader.onload = () => (this.previewUrl = String(reader.result));
      reader.readAsDataURL(file);
    } else if (file) {
      this.toast.warning('El archivo seleccionado no es una imagen válida.');
    }
  }

  async onSave() {
    if (!this.client?.id) return;

    // 1. Validar el formulario (incluyendo la longitud de la nueva clave si se escribió)
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Por favor completa los campos requeridos correctamente.');
      return;
    }

    // 2. Verificar si hay cambios reales para no petardear el servidor
    if (!this.hasChanges()) {
      this.onClose();
      return;
    }

    this.saving = true;
    try {
      const p: any = this.form.value;

      // --- 🚀 A. LÓGICA DE SEGURIDAD: RESET DE CONTRASEÑA BYPASS ---
      // Si el administrador escribió algo en el campo, disparamos el reset directo
      if (p.newPassword && p.newPassword.trim().length >= 6) {
        await this.usuariosSvc.resetPasswordAdmin(this.client.id, p.newPassword.trim());
        // No cerramos aquí, dejamos que continúe con el resto de los datos personales
      }

      // --- B. GESTIÓN DE PERFIL (FOTO Y FECHA) ---
      // 1. Subir foto si seleccionó una nueva
      let finalUrl = p.imagenUrl;
      const file = p.foto;
      if (file) {
        const uploaded = await this.filesSvc.upload(file, 'PROFILE');
        finalUrl = uploaded.url;
      }

      // 2. Preparar el payload para la actualización de datos personales
      const payload: any = {
        nombre: p.nombre || '',
        apellido: p.apellido || '',
        email: p.email || '',
        telefono: p.telefono || '',
        dni: p.dni || '',
        estado: p.estado || 'ACTIVO',
        imagenUrl: finalUrl || '',
        fechaNacimiento: p.fechaNacimiento || '', // Ya viene validada como dd/MM/yyyy
        eliminarApoderado: this.eliminarApoderadoFlag,
        nombreApoderado: !this.eliminarApoderadoFlag ? (p.nombreApoderado || null) : null,
        apellidoApoderado: !this.eliminarApoderadoFlag ? (p.apellidoApoderado || null) : null,
        dniApoderado: !this.eliminarApoderadoFlag ? (p.dniApoderado || null) : null,
        telefonoApoderado: !this.eliminarApoderadoFlag ? (p.telefonoApoderado || null) : null,
        parentesco: !this.eliminarApoderadoFlag ? (p.parentesco || null) : null,
      };

      // 3. Ejecutar actualización masiva en el backend
      await this.usuariosSvc.updatePersona(this.client.id, payload);

      // 4. Finalizar con éxito
      this.toast.success('Cliente y seguridad actualizados correctamente');
      this.saved.emit();
      this.onClose();

    } catch (e: any) {
      console.error("Error al guardar en Wimiline:", e);
      this.toast.error(e?.error?.message || 'Error al guardar los cambios del cliente');
    } finally {
      this.saving = false;
    }
  }

  onClose() {
    this.close.emit();
  }

  // --- LÓGICA DE INPUTS PERSONALIZADOS ---
  onlyNumbers(event: KeyboardEvent): boolean {
    return /\d/.test(event.key);
  }

  onDiaInput(event: Event, nextInput: HTMLInputElement) {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '');
    if (valor.length === 2) {
      if (parseInt(valor) > 31) valor = '31';
      if (parseInt(valor) < 1) valor = '01';
      nextInput.focus();
    }
    this.dia = valor;
    this.actualizarFechaCompleta();
  }

  onMesInput(event: Event, nextInput: HTMLInputElement) {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '');
    if (valor.length === 2) {
      if (parseInt(valor) > 12) valor = '12';
      if (parseInt(valor) < 1) valor = '01';
      nextInput.focus();
    }
    this.mes = valor;
    this.actualizarFechaCompleta();
  }

  onAnioInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 4) valor = valor.substring(0, 4);
    this.anio = valor;
    this.actualizarFechaCompleta();
  }

  private actualizarFechaCompleta() {
    if (this.dia.length === 2 && this.mes.length === 2 && this.anio.length === 4) {
      const fechaFull = `${this.dia}/${this.mes}/${this.anio}`;

      this.form.patchValue({ fechaNacimiento: fechaFull });

      // 🚨 ¡ESTA LÍNEA ES LA CLAVE! 🚨
      // Le dice a Angular: "Oye, el usuario ya tocó este campo, si hay error, MUÉSTRALO AHORA".
      this.form.get('fechaNacimiento')?.markAsTouched();

    } else {
      this.form.patchValue({ fechaNacimiento: '' });
      // Aquí también por si borran algo
      this.form.get('fechaNacimiento')?.markAsTouched();
    }
  }

  // --- VALIDACIONES DE FECHA (Copiado de tu Register) ---

  // --- VALIDACIONES DE FECHA ---

  validadorFecha(control: any) {
    const valor = control.value;
    if (!valor) return null;
    return this.esFechaValida(valor) ? null : { invalidDate: true };
  }

  private esFechaValida(fecha: string): boolean {
    // Valida formato dd/mm/yyyy
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = fecha.match(regex);

    if (!match) return false;

    const d = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const a = parseInt(match[3], 10);

    const hoy = new Date();
    // 🔒 AQUÍ ESTÁ EL BLOQUEO: Si es menor a 1800, devuelve FALSE
    if (a < 1800 || a > hoy.getFullYear()) return false;

    const diasMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (a % 4 === 0 && (a % 100 !== 0 || a % 400 === 0)) {
      diasMes[1] = 29;
    }

    return m >= 1 && m <= 12 && d > 0 && d <= diasMes[m - 1];
  }
}