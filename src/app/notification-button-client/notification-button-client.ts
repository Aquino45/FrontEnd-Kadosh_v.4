import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notif-btn-client',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-button-client.html',
  styleUrls: ['./notification-button-client.css']
})
export class NotificationButtonClientComponent {
 
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
