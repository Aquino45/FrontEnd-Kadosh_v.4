import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type InfoClient = {
  id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  dni?: string;
  created_at?: Date;
  foto?: string;
};

@Component({
  standalone: true,
  selector: 'app-modal-delete',
  imports: [CommonModule],
  templateUrl: './modal-delete.html',
  styleUrls: ['./modal-delete.css'],
})
export class ModalDeleteComponent {
  @Input() open = false;
  @Input() client: InfoClient | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onClose() { this.close.emit(); }
  onConfirm() { this.confirm.emit(); }
}
