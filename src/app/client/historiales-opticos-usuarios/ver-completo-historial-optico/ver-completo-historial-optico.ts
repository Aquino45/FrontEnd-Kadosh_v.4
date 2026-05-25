import { Component, Input, Output, EventEmitter, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common'; // <--- ESTO ES VITAL
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';

// Tus servicios (mantén tus rutas originales)
import { HistorialOpticoService, HistorialOpticoRequest, VisionPayload, HistorialOpticoResponse } from '../../../../services/historial-optico.service';
import { RefraccionDescripcionDatosService, RefraccionDescripcionDatosDTO } from '../../../../services/refraccion-descripcion-datos.service';
import { FilesService } from '../../../../services/files.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { UsuariosService, ClienteListItemDTO } from '../../../../services/usuarios.service';

@Component({
  selector: 'app-ver-completo-historial-optico',
  standalone: true,
  imports: [
    CommonModule,         // <--- Para *ngIf y *ngFor
    ReactiveFormsModule,  // <--- Para [formGroup]
    FormsModule          // <--- Para [(ngModel)]
  ],
  templateUrl: './ver-completo-historial-optico.html',
  styleUrl: './ver-completo-historial-optico.css'
})
export class VerCompletoHistorialOpticoComponent implements OnInit {
  @Input() historial!: HistorialOpticoResponse;
  @Output() close = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private historialSvc = inject(HistorialOpticoService);
  private toast = inject(ToastService);
  private usuariosSvc = inject(UsuariosService);
  private filesSvc = inject(FilesService);
  private refrDescSvc = inject(RefraccionDescripcionDatosService);

  // --- ESTADOS ---
  modoEdicion = false;
  loading = false;
  form!: FormGroup;
  analisisResultados: any = null;

  // --- BUSCADOR ---
  search = { dni: '', nombre: '' };
  suggestions: ClienteListItemDTO[] = [];

  // --- TOOLTIP ---
  tooltip = { visible: false, title: '', description: '', x: 0, y: 0, code: '' };
  descrByCode: Record<string, RefraccionDescripcionDatosDTO> = {};

  // --- IMÁGENES Y VISOR ---
  preview: any = { refraccion: null, lenzometria: null, keratometria: null };
  imageFiles: any = { refraccion: null, lenzometria: null, keratometria: null };
  viewer = { open: false, src: '', scale: 1, posX: 0, posY: 0, dragging: false, lastX: 0, lastY: 0, moved: false };

  async ngOnInit() {
    this.initForm();
    this.cargarDatosEnForm();
    await this.cargarDescripciones();
    this.analisisResultados = {
      odLejos: this.historial.analisisLejosOD,
      oiLejos: this.historial.analisisLejosOI,
      odCerca: this.historial.analisisCercaOD,
      oiCerca: this.historial.analisisCercaOI
    };
  }

  // GETTERS para evitar errores de compilación en el HTML
  get lejosFA() { return this.form.get('lejos') as FormArray; }
  get cercaFA() { return this.form.get('cerca') as FormArray; }

  private initForm() {
    this.form = this.fb.group({
      usuarioId: [this.historial.usuarioId, Validators.required],
      fecha: [''],
      paciente: [{ value: '', disabled: true }],
      telefono: [{ value: '', disabled: true }],
      dni: [{ value: '', disabled: true }],
      edad: [''],
      lejos: this.fb.array([this.createEyeGroup('OD'), this.createEyeGroup('OI')]),
      cerca: this.fb.array([this.createEyeGroup('OD'), this.createEyeGroup('OI')]),
      recomendaciones: ['']
    });
    this.form.disable();
  }

  private createEyeGroup(ojo: string) {
    return this.fb.group({
      ojo: [{ value: ojo, disabled: true }],
      esf: [null], cil: [null], eje: [null], dip: [null], av: [null]
    });
  }

  cargarDatosEnForm() {
    const fechaPartes = this.historial.fecha.split(' ')[0].split('/');
    const fechaIso = `${fechaPartes[2]}-${fechaPartes[1]}-${fechaPartes[0]}`;

    this.form.patchValue({
      fecha: fechaIso,
      paciente: this.historial.paciente,
      telefono: this.historial.telefono,
      dni: this.historial.dni,
      edad: this.historial.edad,
      recomendaciones: this.historial.recomendaciones
    });

    this.patchVision('lejos', this.historial.visionLejos);
    this.patchVision('cerca', this.historial.visionCerca);

    this.preview.refraccion = this.historial.imagenRefraccionUrl;
    this.preview.lenzometria = this.historial.imagenLenzometriaUrl;
    this.preview.keratometria = this.historial.imagenKeratometriaUrl;
  }

  private patchVision(type: 'lejos' | 'cerca', data: any) {
    if (!data) return;
    const fa = this.form.get(type) as FormArray;
    fa.at(0).patchValue({
      esf: data.ojoDerechoEsf, cil: data.ojoDerechoCil, eje: data.ojoDerechoEje,
      dip: data.ojoDerechoDip, av: data.ojoDerechoAv
    });
    fa.at(1).patchValue({
      esf: data.ojoIzquierdoEsf, cil: data.ojoIzquierdoCil, eje: data.ojoIzquierdoEje,
      dip: data.ojoIzquierdoDip, av: data.ojoIzquierdoAv
    });
  }

  // --- ACCIONES DE MODO ---
  activarEdicion() {
    this.modoEdicion = true;
    this.form.enable();
    this.form.get('paciente')?.disable();
    this.form.get('telefono')?.disable();
    this.form.get('dni')?.disable();
  }

  cancelarEdicion() {
    this.modoEdicion = false;
    this.form.disable();
    this.cargarDatosEnForm();
    this.suggestions = [];
  }

  async guardarCambios() {
    if (this.form.invalid) return;
    this.loading = true;
    try {
      const raw = this.form.getRawValue();
      const idHistorial = this.historial.historialOpticoId!;

      let urlRef = this.historial.imagenRefraccionUrl;
      let urlLen = this.historial.imagenLenzometriaUrl;
      let urlKer = this.historial.imagenKeratometriaUrl;

      if (this.imageFiles.refraccion) urlRef = (await this.filesSvc.upload(this.imageFiles.refraccion, 'REFRACCION')).url;
      if (this.imageFiles.lenzometria) urlLen = (await this.filesSvc.upload(this.imageFiles.lenzometria, 'LENZOMETRIA')).url;
      if (this.imageFiles.keratometria) urlKer = (await this.filesSvc.upload(this.imageFiles.keratometria, 'KERATOMETRIA')).url;

      const payload: HistorialOpticoRequest = {
        usuarioId: raw.usuarioId,
        fecha: this.buildFechaIso(raw.fecha),
        edad: raw.edad ? Number(raw.edad) : null,
        visionLejos: this.buildVisionPayload(this.lejosFA),
        visionCerca: this.buildVisionPayload(this.cercaFA),
        analisisLejosOD: this.analisisResultados.odLejos,
        analisisLejosOI: this.analisisResultados.oiLejos,
        analisisCercaOD: this.analisisResultados.odCerca,
        analisisCercaOI: this.analisisResultados.oiCerca,
        imagenRefraccionUrl: urlRef,
        imagenLenzometriaUrl: urlLen,
        imagenKeratometriaUrl: urlKer,
        recomendaciones: raw.recomendaciones ? String(raw.recomendaciones).trim() : null,
        evaluador: null
      };

      await this.historialSvc.actualizarHistorial(idHistorial, payload); //
      this.toast.success('Historial médico actualizado.');
      this.close.emit();
    } catch (e) {
      this.toast.error('Error al actualizar.');
    } finally {
      this.loading = false;
    }
  }

  // --- BUSCADOR ---
  onSearchChange() {
    if (!this.search.dni.trim() && !this.search.nombre.trim()) this.suggestions = [];
  }

  async onSearchClick() {
    try {
      const res = await this.usuariosSvc.searchClientes(this.search);
      this.suggestions = res;
    } catch (e) {
      this.toast.error('Error al buscar clientes.');
    }
  }

  onSelectUser(cli: ClienteListItemDTO) {
    this.form.patchValue({
      usuarioId: cli.id,
      paciente: `${cli.nombre} ${cli.apellido}`,
      dni: cli.dni,
      telefono: cli.telefono,
      edad: cli.edad
    });
    this.suggestions = [];
  }

  // --- ANÁLISIS ---
  analizarDatosCompletos() {
    const lejos = this.lejosFA.getRawValue();
    const cerca = this.cercaFA.getRawValue();

    const interpretar = (d: any) => {
      let hallazgos: string[] = [];
      const esfVal = parseFloat(d.esf) || 0;
      const cilVal = parseFloat(d.cil) || 0;
      const potenciaMaxima = Math.max(Math.abs(esfVal), Math.abs(cilVal));

      let gradoTexto = "Sin grado";
      if (potenciaMaxima > 0) {
        let numGrado = potenciaMaxima <= 2.00 ? 1 : Math.ceil(potenciaMaxima - 2.00) + 1;
        if (numGrado > 10) numGrado = 10;
        gradoTexto = ["Primer Grado", "Segundo Grado", "Tercer Grado", "Cuarto Grado", "Quinto Grado", "Sexto Grado", "Séptimo Grado", "Octavo Grado", "Noveno Grado", "Décimo Grado"][numGrado - 1];
      }

      if (esfVal < 0) hallazgos.push(`Miopía (${esfVal.toFixed(2)})`);
      else if (esfVal > 0) hallazgos.push(`Hipermetropía (+${esfVal.toFixed(2)})`);
      if (cilVal < 0) hallazgos.push(`Astigmatismo (${cilVal.toFixed(2)}) en ${d.eje || 0}°`);
      if (d.dip) hallazgos.push(`DIP: ${d.dip}mm`);
      if (d.av) hallazgos.push(`AV: ${d.av}`);

      return `${gradoTexto} — ${hallazgos.length > 0 ? hallazgos.join(" | ") : "Sin medidas"}`;
    };

    this.analisisResultados = {
      odLejos: interpretar(lejos[0]),
      oiLejos: interpretar(lejos[1]),
      odCerca: interpretar(cerca[0]),
      oiCerca: interpretar(cerca[1])
    };
  }

  // --- HELPERS TÉCNICOS ---
  private async cargarDescripciones() {
    const items = await this.refrDescSvc.listAll();
    this.descrByCode = items.reduce((acc, item) => { acc[item.code] = item; return acc; }, {} as any);
  }

  private buildVisionPayload(arr: FormArray): VisionPayload | null {
    const od = arr.at(0).getRawValue();
    const oi = arr.at(1).getRawValue();
    return {
      ojoDerechoEsf: this.parseNumber(od.esf), ojoDerechoCil: this.parseNumber(od.cil), ojoDerechoEje: this.parseNumber(od.eje),
      ojoDerechoDip: this.parseNumber(od.dip), ojoDerechoAv: od.av || null,
      ojoIzquierdoEsf: this.parseNumber(oi.esf), ojoIzquierdoCil: this.parseNumber(oi.cil), ojoIzquierdoEje: this.parseNumber(oi.eje),
      ojoIzquierdoDip: this.parseNumber(oi.dip), ojoIzquierdoAv: oi.av || null
    };
  }

  private parseNumber(v: any): number | null {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  private buildFechaIso(fechaStr: string): string {
    if (!fechaStr) return '';
    const [y, m, d] = fechaStr.split('-');
    return `${d}/${m}/${y} 00:00:00`;
  }

  // --- IMÁGENES & VISOR ---
  onImageSelect(event: Event, type: string) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.imageFiles[type] = file;
    const reader = new FileReader();
    reader.onload = () => this.preview[type] = reader.result as string;
    reader.readAsDataURL(file);
  }

  openViewer(src: string) { this.viewer = { ...this.viewer, open: true, src, scale: 1, posX: 0, posY: 0 }; }
  closeViewer() { this.viewer.open = false; }
  zoom(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.viewer.scale = Math.min(Math.max(0.3, this.viewer.scale + delta), 5);
  }

  onViewerPointerDown(e: PointerEvent) {
    this.viewer.dragging = true;
    this.viewer.lastX = e.clientX;
    this.viewer.lastY = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  onViewerPointerMove(e: PointerEvent) {
    if (!this.viewer.dragging) return;
    const dx = e.clientX - this.viewer.lastX;
    const dy = e.clientY - this.viewer.lastY;
    this.viewer.posX += dx;
    this.viewer.posY += dy;
    this.viewer.lastX = e.clientX;
    this.viewer.lastY = e.clientY;
  }

  // Agrega esto en tu archivo .ts
  onViewerContextMenu(event: MouseEvent) {
    // Previene que salga el menú del click derecho si el usuario movió la imagen
    if (this.viewer.moved) {
      event.preventDefault();
      this.viewer.moved = false;
    }
  }

  onClearSearch() {
    this.search = { dni: '', nombre: '' };
    this.suggestions = [];
    // Si quieres que al limpiar también se resetee el paciente en el form:
    this.form.patchValue({
      usuarioId: null,
      paciente: '',
      telefono: '',
      dni: '',
      edad: null
    });
  }

  onViewerPointerUp(e: PointerEvent) { this.viewer.dragging = false; }

  // --- TOOLTIPS ---
  onHeaderEnter(code: string, event: MouseEvent) { this.showTooltipAt(code, event.clientX, event.clientY); }
  onHeaderLeave() { this.tooltip.visible = false; }
  onHeaderClick(code: string, event: MouseEvent) { event.stopPropagation(); this.showTooltipAt(code, event.clientX, event.clientY); }
  onHeaderTouchStart(code: string, event: TouchEvent) { const t = event.touches[0]; this.showTooltipAt(code, t.clientX, t.clientY); }
  onHeaderTouchEnd(e: TouchEvent) { }

  showTooltipAt(code: string, x: number, y: number) {
    const data = this.descrByCode[code];
    if (!data) return;
    this.tooltip = { visible: true, code, title: data.titulo || code, description: data.descripcion, x: x + 10, y: y - 10 };
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.rx-header') && !(e.target as HTMLElement).closest('.rx-tooltip')) {
      this.tooltip.visible = false;
    }
  }

  // En ver-completo-historial-optico.ts

  // En ver-completo-historial-optico.ts

  get hayCambiosReales(): boolean {
    if (!this.form || !this.historial) return false;

    const v = this.form.getRawValue();
    const h = this.historial;

    // 1. Función para limpiar y comparar valores (detecta espacios y cambios de texto)
    const normalizar = (val: any) => (val === null || val === undefined ? '' : String(val).trim());

    // 2. Comparar Datos Básicos
    const fechaOriginal = h.fecha.split(' ')[0].split('/').reverse().join('-');
    const cambioBasico =
      v.fecha !== fechaOriginal ||
      normalizar(v.edad) !== normalizar(h.edad) ||
      normalizar(v.recomendaciones) !== normalizar(h.recomendaciones) ||
      v.usuarioId !== h.usuarioId;

    if (cambioBasico) return true;

    // 3. Comparar Tablas de Visión (Lejos y Cerca)
    // Comparamos cada celda de los 4 cuadrantes
    const tablasIguales = (fArray: any, orig: any) => {
      if (!orig) return true;
      const campos = ['esf', 'cil', 'eje', 'dip', 'av'];
      const mapping: any = { esf: 'Esf', cil: 'Cil', eje: 'Eje', dip: 'Dip', av: 'Av' };

      return [0, 1].every(index => {
        const ojo = index === 0 ? 'ojoDerecho' : 'ojoIzquierdo';
        return campos.every(campo => {
          const valForm = normalizar(fArray[index][campo]);
          const valOrig = normalizar(orig[`${ojo}${mapping[campo]}`]);
          return valForm === valOrig;
        });
      });
    };

    if (!tablasIguales(v.lejos, h.visionLejos)) return true;
    if (!tablasIguales(v.cerca, h.visionCerca)) return true;

    // 4. Comparar Resultados de Análisis
    if (this.analisisResultados) {
      const cambioAnalisis =
        this.analisisResultados.odLejos !== h.analisisLejosOD ||
        this.analisisResultados.oiLejos !== h.analisisLejosOI ||
        this.analisisResultados.odCerca !== h.analisisCercaOD ||
        this.analisisResultados.oiCerca !== h.analisisCercaOI;
      if (cambioAnalisis) return true;
    }

    // 5. Detectar si hay archivos nuevos encolados
    if (this.imageFiles.refraccion || this.imageFiles.lenzometria || this.imageFiles.keratometria) return true;

    return false;
  }
}