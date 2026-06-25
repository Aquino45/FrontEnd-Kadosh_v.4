import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChatbotService,
  FaqItem,
  FaqCreateRequest,
  HistorialItem,
  ChatbotEstadisticas
} from '../../../services/chatbot.service';
import { ToastService } from '../../shared/toast/toast.service';

type Tab = 'faqs' | 'historial' | 'estadisticas';
type HistorialTab = 'all' | 'sinRespuesta';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrls: ['./chatbot.css']
})
export class ChatbotComponent implements OnInit {
  activeTab: Tab = 'faqs';

  // ── FAQs ─────────────────────────────────────
  faqs: FaqItem[] = [];
  faqsLoading = false;
  searchQ = '';
  filterCategoria = '';
  filterActivo = '';
  categorias: string[] = [];
  private searchTimer: any;

  showFaqModal = false;
  isEditMode = false;
  editingFaqId: string | number | null = null;
  faqForm = { pregunta: '', respuesta: '', categoria: '', palabrasClave: '' };
  faqSaving = false;

  showDeleteModal = false;
  deletingFaq: FaqItem | null = null;
  deleteLoading = false;

  // ── Historial ─────────────────────────────────
  historial: HistorialItem[] = [];
  historialLoading = false;
  historialSubTab: HistorialTab = 'all';

  // ── Estadísticas ──────────────────────────────
  estadisticas: ChatbotEstadisticas | null = null;
  statsLoading = false;

  constructor(
    private chatbotSvc: ChatbotService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await Promise.all([this.loadCategorias(), this.loadFaqs()]);
  }

  setTab(tab: Tab) {
    this.activeTab = tab;
    if (tab === 'historial') this.loadHistorial();
    if (tab === 'estadisticas') this.loadEstadisticas();
  }

  // ── FAQs ────────────────────────────────────────────────────────────

  async loadCategorias() {
    try {
      this.categorias = await this.chatbotSvc.getCategorias();
    } catch (_) {}
  }

  async loadFaqs() {
    this.faqsLoading = true;
    try {
      const hasFilter = this.searchQ.trim() || this.filterCategoria || this.filterActivo !== '';
      if (hasFilter) {
        this.faqs = await this.chatbotSvc.searchFaqs({
          q: this.searchQ.trim() || undefined,
          categoria: this.filterCategoria || undefined,
          activo: this.filterActivo !== '' ? this.filterActivo : undefined
        });
      } else {
        this.faqs = await this.chatbotSvc.listFaqs();
      }
    } catch (_) {
      this.toast.error('Error al cargar las FAQs');
    } finally {
      this.faqsLoading = false;
    }
  }

  onSearchInput() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadFaqs(), 400);
  }

  onFilterChange() {
    this.loadFaqs();
  }

  openCreateFaq() {
    this.isEditMode = false;
    this.editingFaqId = null;
    this.faqForm = { pregunta: '', respuesta: '', categoria: '', palabrasClave: '' };
    this.showFaqModal = true;
  }

  openEditFaq(faq: FaqItem) {
    this.isEditMode = true;
    this.editingFaqId = faq.id;
    this.faqForm = {
      pregunta: faq.pregunta,
      respuesta: faq.respuesta,
      categoria: faq.categoria ?? '',
      palabrasClave: (faq.palabrasClave ?? []).join(', ')
    };
    this.showFaqModal = true;
  }

  closeFaqModal() {
    this.showFaqModal = false;
  }

  async saveFaq() {
    if (!this.faqForm.pregunta.trim() || !this.faqForm.respuesta.trim()) {
      this.toast.warning('La pregunta y la respuesta son obligatorias');
      return;
    }
    this.faqSaving = true;
    const payload: FaqCreateRequest = {
      pregunta: this.faqForm.pregunta.trim(),
      respuesta: this.faqForm.respuesta.trim(),
      categoria: this.faqForm.categoria.trim() || undefined,
      palabrasClave: this.faqForm.palabrasClave
        ? this.faqForm.palabrasClave.split(',').map(k => k.trim()).filter(Boolean)
        : undefined
    };
    try {
      if (this.isEditMode && this.editingFaqId != null) {
        await this.chatbotSvc.updateFaq(this.editingFaqId, payload);
        this.toast.success('FAQ actualizada correctamente');
      } else {
        await this.chatbotSvc.createFaq(payload);
        this.toast.success('FAQ creada correctamente');
      }
      this.closeFaqModal();
      await Promise.all([this.loadFaqs(), this.loadCategorias()]);
    } catch (_) {
      this.toast.error('Error al guardar la FAQ');
    } finally {
      this.faqSaving = false;
    }
  }

  openDeleteConfirm(faq: FaqItem) {
    this.deletingFaq = faq;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deletingFaq = null;
  }

  async confirmDeleteFaq() {
    if (!this.deletingFaq) return;
    this.deleteLoading = true;
    try {
      await this.chatbotSvc.deleteFaq(this.deletingFaq.id);
      this.toast.success('FAQ eliminada');
      this.closeDeleteModal();
      await this.loadFaqs();
    } catch (_) {
      this.toast.error('Error al eliminar la FAQ');
    } finally {
      this.deleteLoading = false;
    }
  }

  // ── Historial ───────────────────────────────────────────────────────

  async loadHistorial() {
    this.historialLoading = true;
    try {
      this.historial = this.historialSubTab === 'all'
        ? await this.chatbotSvc.getHistorial()
        : await this.chatbotSvc.getHistorialSinRespuesta();
    } catch (_) {
      this.toast.error('Error al cargar el historial');
    } finally {
      this.historialLoading = false;
    }
  }

  setHistorialSubTab(tab: HistorialTab) {
    this.historialSubTab = tab;
    this.loadHistorial();
  }

  // ── Estadísticas ────────────────────────────────────────────────────

  async loadEstadisticas() {
    this.statsLoading = true;
    try {
      this.estadisticas = await this.chatbotSvc.getEstadisticas();
    } catch (_) {
      this.toast.error('Error al cargar estadísticas');
    } finally {
      this.statsLoading = false;
    }
  }
}
