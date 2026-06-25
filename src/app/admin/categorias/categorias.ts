import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CategoriaService,
  CategoriaDTO,
  CategoriaCreateRequest,
  SubCategoriaDTO,
  SubCategoriaCreateRequest
} from '../../../services/categoria.service';
import { ToastService } from '../../shared/toast/toast.service';

type DeleteTarget = { type: 'categoria' | 'subcategoria'; id: string; nombre: string };

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categorias.html',
  styleUrls: ['./categorias.css']
})
export class CategoriasComponent implements OnInit {
  categorias: CategoriaDTO[] = [];
  loading = false;

  expandedIds = new Set<string>();
  subcategoriasByCategoria = new Map<string, SubCategoriaDTO[]>();
  subcategoriasLoading = new Set<string>();

  // ── Modal Categoría ───────────────────────────────────────
  showCategoriaModal = false;
  isEditCategoria = false;
  editingCategoriaId: string | null = null;
  categoriaForm = { nombre: '', activo: true };
  categoriaSaving = false;

  // ── Modal Subcategoría ────────────────────────────────────
  showSubModal = false;
  isEditSub = false;
  editingSubId: string | null = null;
  subForm = { nombre: '', categoriaId: '', activo: true };
  subSaving = false;

  // ── Modal Eliminar ────────────────────────────────────────
  showDeleteModal = false;
  deleteTarget: DeleteTarget | null = null;
  deleteLoading = false;

  constructor(
    private categoriaSvc: CategoriaService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.loadCategorias();
  }

  async loadCategorias() {
    this.loading = true;
    try {
      this.categorias = await this.categoriaSvc.listAll();
    } catch (_) {
      this.toast.error('Error al cargar las categorías');
    } finally {
      this.loading = false;
    }
  }

  isExpanded(c: CategoriaDTO): boolean {
    return this.expandedIds.has(c.categoriaId);
  }

  getSubcategorias(c: CategoriaDTO): SubCategoriaDTO[] {
    return this.subcategoriasByCategoria.get(c.categoriaId) ?? [];
  }

  isLoadingSub(c: CategoriaDTO): boolean {
    return this.subcategoriasLoading.has(c.categoriaId);
  }

  async toggleExpand(c: CategoriaDTO) {
    if (this.expandedIds.has(c.categoriaId)) {
      this.expandedIds.delete(c.categoriaId);
      return;
    }
    this.expandedIds.add(c.categoriaId);
    if (!this.subcategoriasByCategoria.has(c.categoriaId)) {
      this.subcategoriasLoading.add(c.categoriaId);
      try {
        const subs = await this.categoriaSvc.listSubcategoriasByCategoria(c.categoriaId);
        this.subcategoriasByCategoria.set(c.categoriaId, subs);
      } catch (_) {
        this.toast.error('Error al cargar subcategorías');
      } finally {
        this.subcategoriasLoading.delete(c.categoriaId);
      }
    }
  }

  private async refreshSubcategoriasOf(categoriaId: string) {
    try {
      const subs = await this.categoriaSvc.listSubcategoriasByCategoria(categoriaId);
      this.subcategoriasByCategoria.set(categoriaId, subs);
    } catch (_) {}
  }

  // ── Categoría CRUD ──────────────────────────────────────

  openCreateCategoria() {
    this.isEditCategoria = false;
    this.editingCategoriaId = null;
    this.categoriaForm = { nombre: '', activo: true };
    this.showCategoriaModal = true;
  }

  openEditCategoria(c: CategoriaDTO) {
    this.isEditCategoria = true;
    this.editingCategoriaId = c.categoriaId;
    this.categoriaForm = { nombre: c.nombre, activo: c.activo };
    this.showCategoriaModal = true;
  }

  closeCategoriaModal() {
    this.showCategoriaModal = false;
  }

  async saveCategoria() {
    if (!this.categoriaForm.nombre.trim()) {
      this.toast.warning('El nombre de la categoría es obligatorio');
      return;
    }
    this.categoriaSaving = true;
    const payload: CategoriaCreateRequest = {
      nombre: this.categoriaForm.nombre.trim(),
      activo: this.categoriaForm.activo
    };
    try {
      if (this.isEditCategoria && this.editingCategoriaId != null) {
        await this.categoriaSvc.update(this.editingCategoriaId, payload);
        this.toast.success('Categoría actualizada');
      } else {
        await this.categoriaSvc.create(payload);
        this.toast.success('Categoría creada');
      }
      this.closeCategoriaModal();
      await this.loadCategorias();
    } catch (_) {
      this.toast.error('Error al guardar la categoría');
    } finally {
      this.categoriaSaving = false;
    }
  }

  // ── Subcategoría CRUD ───────────────────────────────────

  openCreateSub(c: CategoriaDTO) {
    this.isEditSub = false;
    this.editingSubId = null;
    this.subForm = { nombre: '', categoriaId: c.categoriaId, activo: true };
    this.showSubModal = true;
  }

  openEditSub(s: SubCategoriaDTO) {
    this.isEditSub = true;
    this.editingSubId = s.subCategoriaId;
    this.subForm = {
      nombre: s.nombre,
      categoriaId: s.categoriaId,
      activo: s.activo
    };
    this.showSubModal = true;
  }

  closeSubModal() {
    this.showSubModal = false;
  }

  async saveSub() {
    if (!this.subForm.nombre.trim()) {
      this.toast.warning('El nombre de la subcategoría es obligatorio');
      return;
    }
    this.subSaving = true;
    const payload: SubCategoriaCreateRequest = {
      nombre: this.subForm.nombre.trim(),
      categoriaId: this.subForm.categoriaId,
      activo: this.subForm.activo
    };
    try {
      if (this.isEditSub && this.editingSubId != null) {
        await this.categoriaSvc.updateSubcategoria(this.editingSubId, payload);
        this.toast.success('Subcategoría actualizada');
      } else {
        await this.categoriaSvc.createSubcategoria(payload);
        this.toast.success('Subcategoría creada');
      }
      this.closeSubModal();
      await this.refreshSubcategoriasOf(this.subForm.categoriaId);
    } catch (_) {
      this.toast.error('Error al guardar la subcategoría');
    } finally {
      this.subSaving = false;
    }
  }

  // ── Eliminar ─────────────────────────────────────────────

  openDeleteCategoria(c: CategoriaDTO) {
    this.deleteTarget = { type: 'categoria', id: c.categoriaId, nombre: c.nombre };
    this.showDeleteModal = true;
  }

  openDeleteSub(s: SubCategoriaDTO) {
    this.deleteTarget = { type: 'subcategoria', id: s.subCategoriaId, nombre: s.nombre };
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deleteTarget = null;
  }

  async confirmDelete() {
    if (!this.deleteTarget) return;
    this.deleteLoading = true;
    try {
      if (this.deleteTarget.type === 'categoria') {
        await this.categoriaSvc.delete(this.deleteTarget.id);
        this.toast.success('Categoría eliminada');
        this.expandedIds.delete(this.deleteTarget.id);
        this.subcategoriasByCategoria.delete(this.deleteTarget.id);
        await this.loadCategorias();
      } else {
        const sub = await this.findSubInMap(this.deleteTarget.id);
        await this.categoriaSvc.deleteSubcategoria(this.deleteTarget.id);
        this.toast.success('Subcategoría eliminada');
        if (sub) await this.refreshSubcategoriasOf(sub.categoriaId);
      }
      this.closeDeleteModal();
    } catch (_) {
      this.toast.error('Error al eliminar');
    } finally {
      this.deleteLoading = false;
    }
  }

  private async findSubInMap(id: string): Promise<SubCategoriaDTO | undefined> {
    for (const subs of this.subcategoriasByCategoria.values()) {
      const found = subs.find(s => s.subCategoriaId === id);
      if (found) return found;
    }
    return undefined;
  }
}
