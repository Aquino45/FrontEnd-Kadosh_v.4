// new-historial.ts
import {
  Component,
  EventEmitter,
  Output,
  OnInit,
  HostListener,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { FormsModule } from '@angular/forms';

import {
  RefraccionDescripcionDatosService,
  RefraccionDescripcionDatosDTO
} from '../../../../services/refraccion-descripcion-datos.service';

import {
  HistorialOpticoService,
  HistorialOpticoRequest,
  VisionPayload
} from '../../../../services/historial-optico.service';

import { FilesService } from '../../../../services/files.service';
import { ToastService } from '../../../shared/toast/toast.service';

import {
  UsuariosService,
  ClienteListItemDTO
} from '../../../../services/usuarios.service';

type EyeRow = {
  ojo: 'OD' | 'OI';
  esf: string | null;
  cil: string | null;
  eje: string | null;
  dip: string | null;
  av: string | null;
};

type TooltipState = {
  visible: boolean;
  title: string;
  description: string;
  x: number;
  y: number;
  code: string | null;   // de qué columna viene
};

@Component({
  standalone: true,
  selector: 'app-new-historial',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './new-historial.html',
  styleUrls: ['./new-historial.css']
})
export class NewHistorialComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private refrDescSvc = inject(RefraccionDescripcionDatosService);
  private historialSvc = inject(HistorialOpticoService);
  private filesSvc = inject(FilesService);
  private toast = inject(ToastService);
  private usuariosSvc = inject(UsuariosService);

  // =============== FORM PRINCIPAL ===============
  // ✅ CAMBIO: El formulario ya no necesita preocuparse por validar estos campos
  form: FormGroup = this.fb.group({
    usuarioId: [null, Validators.required],
    fecha: [this.getLocalDate()],

    // Estos quedan solo como "display" o lectura
    paciente: [{ value: '', disabled: true }],
    telefono: [{ value: '', disabled: true }],
    dni: [{ value: '', disabled: true }],

    edad: [''], // La edad sí la dejamos editable porque es un dato del momento
    lejos: this.fb.array(this.makeEyeRows()),
    cerca: this.fb.array(this.makeEyeRows()),
    imagenRefraccionUrl: [''],
    imagenLenzometriaUrl: [''],
    imagenKeratometriaUrl: [''],
    recomendaciones: ['']
  });

  // estado de carga (para deshabilitar botón + cambiar texto)
  loading = false;

  // GETTERS
  get lejosFA() { return this.form.get('lejos') as FormArray; }
  get cercaFA() { return this.form.get('cerca') as FormArray; }

  // =============== BUSCADOR DE CLIENTES ===============
  // modelo de los inputs DNI / Nombre
  search = {
    dni: '',
    nombre: ''
  };

  // resultados sugeridos
  suggestions: ClienteListItemDTO[] = [];
  selectedCliente: ClienteListItemDTO | null = null;

  // ===================== TOOLTIP =====================
  descrByCode: Record<string, RefraccionDescripcionDatosDTO> = {};

  tooltip: TooltipState = {
    visible: false,
    title: '',
    description: '',
    x: 0,
    y: 0,
    code: null
  };

  // Info para distinguir TAP vs long-press en móvil
  private touchInfo = {
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    code: null as string | null
  };

  async ngOnInit(): Promise<void> {
    await this.cargarDescripcionesRefraccion();

    // ✅ Forzar la fecha de hoy si está vacía
    if (!this.form.get('fecha')?.value) {
      this.form.patchValue({ fecha: this.getLocalDate() });
    }
  }

  private async cargarDescripcionesRefraccion() {
    try {
      const items = await this.refrDescSvc.listAll();
      this.descrByCode = items.reduce((acc, item) => {
        acc[item.code] = item;
        return acc;
      }, {} as Record<string, RefraccionDescripcionDatosDTO>);
    } catch (e) {
      console.error('Error cargando descripciones de refracción', e);
    }
  }

  // ===================== BUSCADOR — LÓGICA =====================

  // se llama cada vez que cambia DNI o Nombre (solo limpia selección/sugerencias)
  onSearchChange() {
    // si el admin cambia texto, limpiamos selección actual
    this.selectedCliente = null;
    this.form.patchValue({
      usuarioId: null
    });

    if (!this.search.dni.trim() && !this.search.nombre.trim()) {
      this.suggestions = [];
    }
  }

  // botón 🔍 Buscar
  async onSearchClick() {
    const dni = this.search.dni.trim();
    const nombre = this.search.nombre.trim();

    if (!dni && !nombre) {
      this.toast.info('Ingresa DNI o nombre para buscar.');
      return;
    }

    try {
      const res = await this.usuariosSvc.searchClientes({ dni, nombre });
      this.suggestions = res;

      if (!res.length) {
        this.toast.info('No se encontraron clientes con esos datos.');
      }
    } catch (e) {
      console.error('Error buscando clientes', e);
      this.toast.error('No se pudo buscar clientes.');
    }
  }

  onSearchEnter() {
    this.onSearchClick();
  }



  // botón "Limpiar"
  onClearSearch() {
    this.search = { dni: '', nombre: '' };
    this.suggestions = [];
    this.selectedCliente = null;

    this.form.patchValue({
      usuarioId: null,
      paciente: '',
      telefono: '',
      dni: '',
      edad: ''                // ✅ limpiamos la edad del form
    });
  }


  // cuando el admin elige un cliente de la lista
  onSelectUser(cli: ClienteListItemDTO) {
    this.selectedCliente = cli;
    const nombreCompleto = `${cli.nombre ?? ''} ${cli.apellido ?? ''}`.trim();

    this.form.patchValue({
      usuarioId: cli.id,
      paciente: nombreCompleto,
      telefono: cli.telefono ?? '',
      dni: cli.dni ?? '',
      edad: cli.edad ?? null
    });

    this.suggestions = [];
  }


  // ===================== TOOLTIP HELPERS =====================

  private showTooltipAt(code: string, x: number, y: number) {
    const data = this.descrByCode[code];
    if (!data) return;

    const offset = 10;

    this.tooltip.visible = true;
    this.tooltip.code = code;
    this.tooltip.title = data.titulo || code;
    this.tooltip.description = data.descripcion;
    this.tooltip.x = x + offset;
    this.tooltip.y = y - offset;
  }

  onHeaderEnter(code: string, event: MouseEvent) {
    this.showTooltipAt(code, event.clientX, event.clientY);
  }

  onHeaderLeave() {
    this.tooltip.visible = false;
  }

  onHeaderClick(code: string, event: MouseEvent) {
    event.stopPropagation();

    if (this.tooltip.visible && this.tooltip.code === code) {
      this.tooltip.visible = false;
      return;
    }

    this.showTooltipAt(code, event.clientX, event.clientY);
  }

  onHeaderTouchStart(code: string, event: TouchEvent) {
    const touch = event.touches[0] || event.changedTouches[0];
    if (!touch) return;

    this.touchInfo = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      code
    };
    event.stopPropagation();
  }

  onHeaderTouchEnd(event: TouchEvent) {
    const touch = event.changedTouches[0];
    if (!this.touchInfo.active || !touch) return;

    const dt = Date.now() - this.touchInfo.startTime;
    const dx = Math.abs(touch.clientX - this.touchInfo.startX);
    const dy = Math.abs(touch.clientY - this.touchInfo.startY);

    const TAP_MAX_DURATION = 250; // ms
    const TAP_MAX_MOVE = 10;      // px

    const isTap = dt < TAP_MAX_DURATION && dx < TAP_MAX_MOVE && dy < TAP_MAX_MOVE;
    const code = this.touchInfo.code;

    this.touchInfo.active = false;
    this.touchInfo.code = null;

    if (!isTap || !code) {
      // fue long-press / scroll → no abrimos nada
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (this.tooltip.visible && this.tooltip.code === code) {
      this.tooltip.visible = false;
      return;
    }

    this.showTooltipAt(code, touch.clientX, touch.clientY);
  }

  // ===================== CERRAR TOOLTIP FUERA =====================

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('.rx-header') || target.closest('.rx-tooltip')) return;

    this.tooltip.visible = false;
  }

  @HostListener('document:touchstart', ['$event'])
  onDocumentTouchStart(event: TouchEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('.rx-header') || target.closest('.rx-tooltip')) return;

    this.tooltip.visible = false;
  }

  // ===================== FECHA LOCAL =====================

  private getLocalDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ===================== FILAS OJOS =====================

  private makeEyeRows(): FormGroup[] {
    const rows: EyeRow[] = [
      { ojo: 'OD', esf: null, cil: null, eje: null, dip: null, av: null },
      { ojo: 'OI', esf: null, cil: null, eje: null, dip: null, av: null }
    ];
    return rows.map(r =>
      this.fb.group({
        ojo: [{ value: r.ojo, disabled: true }],
        esf: [r.esf],
        cil: [r.cil],
        eje: [r.eje],
        dip: [r.dip],
        av: [r.av],
      })
    );
  }

  // ===================== INPUTS NUMÉRICOS =====================

  numberInputAttrs = {
    inputmode: 'decimal',
    pattern: '-?\\d+(\\.\\d{0,2})?'
  };

  // ===================== PREVIEW + FILES PARA SUBIDA =====================

  preview: {
    refraccion: string | null;
    lenzometria: string | null;
    keratometria: string | null;
  } = {
      refraccion: null,
      lenzometria: null,
      keratometria: null
    };

  // guardamos los File reales para subirlos luego
  private imageFiles: {
    refraccion: File | null;
    lenzometria: File | null;
    keratometria: File | null;
  } = {
      refraccion: null,
      lenzometria: null,
      keratometria: null
    };

  onImageSelect(event: Event, type: 'refraccion' | 'lenzometria' | 'keratometria') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // guardamos el File
    this.imageFiles[type] = file;

    // generamos preview
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.preview[type] = result;
    };
    reader.readAsDataURL(file);
  }

  // ===================== VISOR DE IMÁGENES =====================

  viewer = {
    open: false,
    src: '',
    scale: 1,
    posX: 0,
    posY: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    moved: false
  };

  openViewer(src: string) {
    this.viewer = {
      open: true,
      src,
      scale: 1,
      posX: 0,
      posY: 0,
      dragging: false,
      lastX: 0,
      lastY: 0,
      moved: false
    };
  }

  closeViewer() {
    this.viewer.open = false;
  }

  zoom(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.viewer.scale = Math.min(Math.max(0.3, this.viewer.scale + delta), 5);
  }

  onViewerPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse') {
      if (event.button !== 2) return;
    } else {
      if (event.button !== 0) return;
    }

    this.viewer.dragging = true;
    this.viewer.lastX = event.clientX;
    this.viewer.lastY = event.clientY;
    this.viewer.moved = false;

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onViewerPointerMove(event: PointerEvent) {
    if (!this.viewer.dragging) return;

    const dx = event.clientX - this.viewer.lastX;
    const dy = event.clientY - this.viewer.lastY;

    if (!this.viewer.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      this.viewer.moved = true;
    }

    this.viewer.posX += dx;
    this.viewer.posY += dy;

    this.viewer.lastX = event.clientX;
    this.viewer.lastY = event.clientY;

    event.preventDefault();
  }

  onViewerPointerUp(event: PointerEvent) {
    if (!this.viewer.dragging) return;

    this.viewer.dragging = false;
    try {
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    } catch { }
  }

  onViewerContextMenu(event: MouseEvent) {
    if (this.viewer.moved) {
      event.preventDefault();
      this.viewer.moved = false;
    }
  }

  // ===================== HELPERS PARA PAYLOAD =====================

  private parseNumber(v: any): number | null {
    if (v === null || v === undefined) return null;
    const txt = String(v).trim();
    if (!txt) return null;
    const n = Number(txt);
    return isNaN(n) ? null : n;
  }

  private buildVisionPayload(arr: FormArray): VisionPayload | null {
    if (!arr || arr.length < 2) return null;

    const rowOD = arr.at(0) as FormGroup;
    const rowOI = arr.at(1) as FormGroup;

    const od = rowOD.getRawValue();
    const oi = rowOI.getRawValue();

    const payload: VisionPayload = {
      // OD = ojo derecho
      ojoDerechoEsf: this.parseNumber(od.esf),
      ojoDerechoCil: this.parseNumber(od.cil),
      ojoDerechoEje: this.parseNumber(od.eje),
      ojoDerechoDip: this.parseNumber(od.dip),
      ojoDerechoAv: od.av ? String(od.av).trim() || null : null,

      // OI = ojo izquierdo
      ojoIzquierdoEsf: this.parseNumber(oi.esf),
      ojoIzquierdoCil: this.parseNumber(oi.cil),
      ojoIzquierdoEje: this.parseNumber(oi.eje),
      ojoIzquierdoDip: this.parseNumber(oi.dip),
      ojoIzquierdoAv: oi.av ? String(oi.av).trim() || null : null
    };

    // Si todo está null/empty, devolvemos null para no mandar visión vacía
    const hasData = Object.values(payload).some(v => v !== null && v !== undefined);
    return hasData ? payload : null;
  }

  private buildFechaIso(fechaStr: string): string {
    // fechaStr viene como "2026-02-02" del <input type="date">
    if (!fechaStr) return '';

    const [year, month, day] = fechaStr.split('-');

    // Retornamos en formato "DD/MM/YYYY 00:00:00"
    // El Backend se encargará de ponerle la hora real si detecta el 00:00:00
    return `${day}/${month}/${year} 00:00:00`;
  }

  // ===================== GUARDAR FORMULARIO =====================

  async submit() {
    console.log("Intentando guardar...", this.form.value); // Para debug en consola

    // 1. Validamos manualmente el usuarioId primero que nada
    const raw = this.form.getRawValue();

    if (!raw.usuarioId) {
      console.warn("Falta usuarioId");
      this.toast.error('Debes seleccionar un cliente del buscador para continuar.');
      return;
    }

    // 2. Si el formulario es inválido por otra razón (como validadores internos)
    if (this.form.invalid) {
      console.warn("Formulario inválido:", this.form.errors);
      this.form.markAllAsTouched();
      this.toast.info('Por favor, revisa los campos marcados en rojo.');
      return;
    }

    // Si llegamos aquí, empezamos el proceso
    this.loading = true;

    // Construimos visiones y fecha
    const visionLejos = this.buildVisionPayload(this.lejosFA);
    const visionCerca = this.buildVisionPayload(this.cercaFA);
    const fechaIso = this.buildFechaIso(raw.fecha);

    let imagenRefraccionUrl: string | null = null;
    let imagenLenzometriaUrl: string | null = null;
    let imagenKeratometriaUrl: string | null = null;

    try {
      // 3. Subida de imágenes (Solo si existen)
      if (this.imageFiles.refraccion) {
        const resp = await this.filesSvc.upload(this.imageFiles.refraccion, 'REFRACCION');
        imagenRefraccionUrl = resp.url;
      }
      if (this.imageFiles.lenzometria) {
        const resp = await this.filesSvc.upload(this.imageFiles.lenzometria, 'LENZOMETRIA');
        imagenLenzometriaUrl = resp.url;
      }
      if (this.imageFiles.keratometria) {
        const resp = await this.filesSvc.upload(this.imageFiles.keratometria, 'KERATOMETRIA');
        imagenKeratometriaUrl = resp.url;
      }

      // 4. Armamos payload (Limpio y optimizado)
      const payload: HistorialOpticoRequest = {
        usuarioId: raw.usuarioId, // Lo único que el Backend necesita para saber de quién es
        fecha: fechaIso,
        edad: raw.edad ? Number(raw.edad) : null, // Dato histórico

        visionLejos,
        visionCerca,

        // Resultados del análisis
        analisisLejosOD: this.analisisResultados?.odLejos || null,
        analisisLejosOI: this.analisisResultados?.oiLejos || null,
        analisisCercaOD: this.analisisResultados?.odCerca || null,
        analisisCercaOI: this.analisisResultados?.oiCerca || null,

        imagenRefraccionUrl,
        imagenLenzometriaUrl,
        imagenKeratometriaUrl,

        recomendaciones: raw.recomendaciones ? String(raw.recomendaciones).trim() || null : null,
        evaluador: null // Se llena en el backend o con el user logueado
      };

      console.log("Enviando payload final:", payload);

      // 5. Llamada a la API
      const resp = await this.historialSvc.create(payload);

      this.toast.success('Historial óptico registrado correctamente.');
      this.close.emit();

    } catch (err: any) {
      console.error('Error al crear historial óptico', err);
      const backendMsg: string | undefined = err?.error?.message;
      this.toast.error(backendMsg || 'Ocurrió un error al guardar el historial óptico.');
    } finally {
      this.loading = false;
    }
  }

  cancel() {
    if (this.loading) return;
    this.close.emit();
  }

  // 1. Variable para almacenar los resultados de los 4 cuadrantes
  analisisResultados: any = null;

  // 2. Función principal que procesa los 10 campos totales
  analizarDatosCompletos() {
    const lejos = this.lejosFA.getRawValue(); // [OD, OI] de lejos
    const cerca = this.cercaFA.getRawValue(); // [OD, OI] de cerca

    /**
     * Procesa los 5 campos y calcula la Serie/Riesgo según la medida optométrica
     * Escala proporcionada por el especialista.
     */
    const interpretar = (d: any) => {
      let hallazgos: string[] = [];

      // Obtenemos valores absolutos para determinar la serie según la potencia máxima
      const esfVal = parseFloat(d.esf) || 0;
      const cilVal = parseFloat(d.cil) || 0;
      const potenciaMaxima = Math.max(Math.abs(esfVal), Math.abs(cilVal));

      // --- 🚀 LÓGICA DE SERIES ACTUALIZADA SEGÚN EL ESPECIALISTA ---
      let serieTexto = "Sin medida";

      if (potenciaMaxima > 0) {
        if (potenciaMaxima <= 2.00) {
          serieTexto = "1ra Serie / Leve"; // +/- 0.00 -- +/- 2.00
        } 
        else if (potenciaMaxima <= 4.00) {
          serieTexto = "2da Serie / Moderado"; // +/- 2.25 -- +/- 4.00
        } 
        else if (potenciaMaxima <= 6.00) {
          serieTexto = "3ra Serie / Alto"; // +/- 4.25 -- +/- 6.00
        } 
        else {
          serieTexto = "Serie Fabricación / Riesgoso"; // +/- 6.25 a más
        }
      }

      // --- ANALISIS TÉCNICO DE LOS 5 CAMPOS ---

      // 1. Esfera (Miopía / Hipermetropía)
      if (esfVal < 0) hallazgos.push(`Miopía (${esfVal.toFixed(2)})`);
      else if (esfVal > 0) hallazgos.push(`Hipermetropía (+${esfVal.toFixed(2)})`);

      // 2 y 3. Cilindro + Eje (Astigmatismo)
      if (cilVal < 0) {
        const eje = d.eje ? `${d.eje}°` : '0°';
        hallazgos.push(`Astigmatismo (${cilVal.toFixed(2)}) en ${eje}`);
      }

      // 4. DIP (Distancia Pupilar)
      if (d.dip) hallazgos.push(`DIP: ${d.dip}mm`);

      // 5. AV (Agudeza Visual)
      if (d.av && d.av.trim() !== "") hallazgos.push(`AV: ${d.av}`);

      // Resultado final combinando la Serie y el Diagnóstico técnico
      const diagnostico = hallazgos.length > 0 ? hallazgos.join(" | ") : "Sin medidas registradas";
      return `${serieTexto} — ${diagnostico}`;
    };

    // Asignación a los 4 contenedores independientes de la vista (Lejos/Cerca OD/OI)
    this.analisisResultados = {
      odLejos: interpretar(lejos[0]),
      oiLejos: interpretar(lejos[1]),
      odCerca: interpretar(cerca[0]),
      oiCerca: interpretar(cerca[1])
    };

    console.log("Análisis por Series completado para Wimiline UwU", this.analisisResultados);
  }
}
