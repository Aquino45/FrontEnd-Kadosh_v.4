import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CHATBOT_API_URL } from '../environments/api';

export type ChatbotResultado = { pregunta: string; respuesta: string };
export type ChatbotPreguntarResponse = {
  encontrado: boolean;
  resultados?: ChatbotResultado[];
  mensajeFallback?: string;
};

export type FaqItem = {
  id: string | number;
  pregunta: string;
  respuesta: string;
  categoria?: string;
  palabrasClave?: string[];
  activo: boolean;
};

export type FaqCreateRequest = {
  pregunta: string;
  respuesta: string;
  categoria?: string;
  palabrasClave?: string[];
};

export type HistorialItem = {
  id: string | number;
  mensaje: string;
  encontrado: boolean;
  coincidencias: number;
  fecha: string;
};

export type ChatbotEstadisticas = {
  totalFaqs: number;
  faqsActivas: number;
  faqsInactivas: number;
  totalConsultas: number;
  conRespuesta: number;
  sinRespuesta: number;
  categorias?: string[];
};

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  async preguntar(pregunta: string): Promise<ChatbotPreguntarResponse> {
    return await firstValueFrom(
      this.http.post<ChatbotPreguntarResponse>(
        `${CHATBOT_API_URL}/preguntar`,
        { pregunta },
        { headers: this.authHeaders() }
      )
    );
  }

  async listFaqs(): Promise<FaqItem[]> {
    return await firstValueFrom(
      this.http.get<FaqItem[]>(`${CHATBOT_API_URL}/preguntas`, { headers: this.authHeaders() })
    );
  }

  async getFaq(id: string | number): Promise<FaqItem> {
    return await firstValueFrom(
      this.http.get<FaqItem>(`${CHATBOT_API_URL}/preguntas/${id}`, { headers: this.authHeaders() })
    );
  }

  async searchFaqs(params: { q?: string; categoria?: string; activo?: string }): Promise<FaqItem[]> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.categoria) httpParams = httpParams.set('categoria', params.categoria);
    if (params.activo !== undefined && params.activo !== '') httpParams = httpParams.set('activo', params.activo);
    return await firstValueFrom(
      this.http.get<FaqItem[]>(`${CHATBOT_API_URL}/preguntas/buscar`, {
        headers: this.authHeaders(),
        params: httpParams
      })
    );
  }

  async createFaq(data: FaqCreateRequest): Promise<FaqItem> {
    return await firstValueFrom(
      this.http.post<FaqItem>(`${CHATBOT_API_URL}/preguntas`, data, { headers: this.authHeaders() })
    );
  }

  async updateFaq(id: string | number, data: FaqCreateRequest): Promise<FaqItem> {
    return await firstValueFrom(
      this.http.put<FaqItem>(`${CHATBOT_API_URL}/preguntas/${id}`, data, { headers: this.authHeaders() })
    );
  }

  async deleteFaq(id: string | number): Promise<any> {
    return await firstValueFrom(
      this.http.delete(`${CHATBOT_API_URL}/preguntas/${id}`, { headers: this.authHeaders() })
    );
  }

  async getCategorias(): Promise<string[]> {
    return await firstValueFrom(
      this.http.get<string[]>(`${CHATBOT_API_URL}/categorias`, { headers: this.authHeaders() })
    );
  }

  async getHistorial(): Promise<HistorialItem[]> {
    return await firstValueFrom(
      this.http.get<HistorialItem[]>(`${CHATBOT_API_URL}/historial`, { headers: this.authHeaders() })
    );
  }

  async getHistorialSinRespuesta(): Promise<HistorialItem[]> {
    return await firstValueFrom(
      this.http.get<HistorialItem[]>(`${CHATBOT_API_URL}/historial/sin-respuesta`, { headers: this.authHeaders() })
    );
  }

  async getEstadisticas(): Promise<ChatbotEstadisticas> {
    return await firstValueFrom(
      this.http.get<ChatbotEstadisticas>(`${CHATBOT_API_URL}/estadisticas`, { headers: this.authHeaders() })
    );
  }
}
