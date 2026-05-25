import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notif-btn-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-button-admin.html',
  styleUrls: ['./notification-button-admin.css']
})
export class NotificationButtonAdminComponent {
 
  @Input() badge = 0;

 
  @Input() ariaLabel = 'Notificaciones';


  @Input() title = 'Notificaciones';


  @Output() clicked = new EventEmitter<void>();

  handleClick() {
    this.clicked.emit();
  }

  get badgeText(): string {
    return this.badge > 99 ? '99+' : String(this.badge);
  }

  get badgeAria(): string {
    return `Tienes ${this.badge} notificaciones`;
  }
}
