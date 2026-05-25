import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
  duration: number; 
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts$ = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this._toasts$.asObservable();
  private _counter = 0;

  show(message: string, type: ToastType = 'info', title?: string, duration = 3500) {
    const id = ++this._counter;
    const toast: Toast = { id, type, title, message, duration };

    const list = this._toasts$.value.slice();
    list.push(toast);
    this._toasts$.next(list);

    
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string, title = 'Éxito', duration = 3000)  { this.show(message, 'success', title, duration); }
  error(message: string, title = 'Alerta', duration = 4500)   { this.show(message, 'error',   title, duration); }
  info(message: string, title = 'Info', duration = 3500)      { this.show(message, 'info',    title, duration); }
  warning(message: string, title = 'Aviso', duration = 4000)  { this.show(message, 'warning', title, duration); }

  dismiss(id: number) {
    this._toasts$.next(this._toasts$.value.filter(t => t.id !== id));
  }

  clear() { this._toasts$.next([]); }
}
