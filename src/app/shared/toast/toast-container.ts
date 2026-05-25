import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  
  template: `
    <div class="toast-container">
      <div *ngFor="let t of (toastSvc.toasts$ | async)" class="toast-card" [class]="t.type">
        <div class="toast-icon">
          <i class="fa-solid fa-circle-check" *ngIf="t.type === 'success'"></i>
          <i class="fa-solid fa-triangle-exclamation" *ngIf="t.type === 'warning'"></i>
          <i class="fa-solid fa-circle-info" *ngIf="t.type === 'info'"></i>
          <i class="fa-solid fa-circle-xmark" *ngIf="t.type === 'error'"></i>
        </div>
        <div class="toast-content">
          <strong>{{ t.title || (t.type === 'success' ? 'Éxito' : t.type === 'error' ? 'Alerta' : 'Aviso') }}</strong>
          <p>{{ t.message }}</p>
          <div class="toast-progress"></div>
        </div>
        <button class="close-btn" (click)="toastSvc.dismiss(t.id)">×</button>
      </div>
    </div>
  `,
  
  styleUrls: ['./toast-container.css']
})
export class ToastContainerComponent {
  constructor(public toastSvc: ToastService) {}
}
