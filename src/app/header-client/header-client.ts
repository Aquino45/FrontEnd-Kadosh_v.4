import { Component } from '@angular/core';
import { SearchBarComponent } from '../search-bar-admin/search-bar-admin';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE'
import { NotificationButtonClientComponent } from '../notification-button-client/notification-button-client';
registerLocaleData(localeEsPe);
@Component({
  selector: 'app-header-client',
  templateUrl: './header-client.html',
  styleUrls: ['./header-client.css'],
  standalone: true,
  imports: [SearchBarComponent, DatePipe,NotificationButtonClientComponent] // Importa el componente SearchBarComponent
})
export class HeaderComponent {
  logoSrc = 'assets/Images/logo_Kadosh-2.png';
  logoAlt = 'Logo';
  today = new Date();
  selectedDateISO = this.toISODate(this.today);
  notifCount = 10;

  onSearch(query: string) {
    console.log('Search triggered:', query);
    
  }

  onQueryChange(query: string) {
    console.log('Query changed:', query);
    
  }
  onBellClick() {
    console.log('Abrir panel de notificaciones');
  }

  openCalendar() {
    const el = document.querySelector<HTMLInputElement>('input.date-input-hidden');
    if (el && (el as any).showPicker) {
      (el as any).showPicker();
    } else {
      el?.click();
    }
  }

  onDateChange(ev: Event) {
    const value = (ev.target as HTMLInputElement).value;
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      this.today = new Date(y, m - 1, d);
      this.selectedDateISO = value;
    }
  }

  private toISODate(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}