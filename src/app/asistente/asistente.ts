import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../services/chatbot.service';

type ChatMsg = {
  from: 'user' | 'bot';
  text: string;
  questionLabel?: string;
  isLoading?: boolean;
};

@Component({
  selector: 'app-asistente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asistente.html',
  styleUrls: ['./asistente.css']
})
export class AsistenteComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatEnd') private chatEnd!: ElementRef;

  messages: ChatMsg[] = [];
  inputText = '';
  isSending = false;

  constructor(private chatbotSvc: ChatbotService) {}

  ngOnInit() {
    this.messages.push({
      from: 'bot',
      text: '¡Hola! Soy el asistente de Ópticas Kadosh. ¿En qué puedo ayudarte hoy?'
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom() {
    try {
      this.chatEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    } catch (_) {}
  }

  async send() {
    const text = this.inputText.trim();
    if (!text || this.isSending) return;

    this.messages.push({ from: 'user', text });
    this.inputText = '';
    this.isSending = true;

    const loadingIdx = this.messages.length;
    this.messages.push({ from: 'bot', text: '', isLoading: true });

    try {
      const resp = await this.chatbotSvc.preguntar(text);
      this.messages.splice(loadingIdx, 1);

      if (resp.encontrado && resp.resultados?.length) {
        for (const r of resp.resultados) {
          this.messages.push({ from: 'bot', text: r.respuesta, questionLabel: r.pregunta });
        }
      } else {
        this.messages.push({
          from: 'bot',
          text: resp.mensajeFallback ?? 'Lo siento, no encontré información sobre eso. Puedes contactar directamente a la óptica para más información.'
        });
      }
    } catch (_) {
      this.messages.splice(loadingIdx, 1);
      this.messages.push({
        from: 'bot',
        text: 'Ocurrió un error al procesar tu consulta. Por favor, intenta nuevamente.'
      });
    } finally {
      this.isSending = false;
    }
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }
}
