import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe, registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { AuthService } from '../../services/auth.service';
registerLocaleData(localeEsPe);

@Component({
  selector: 'app-header-admin',
  templateUrl: './header-admin.html',
  styleUrls: ['./header-admin.css'],
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink]
})
export class HeaderComponent implements OnInit {
  logoSrc = 'assets/Images/logo_Kadosh-2.png';
  logoAlt = 'Logo';
  today = new Date();
  selectedDateISO = this.toISODate(this.today);
  notifCount = 0;

  userName = 'Admin';
  userRol = 'Administrador';
  showNotifPanel = false;

  constructor(private authService: AuthService) {}

  async ngOnInit(): Promise<void> {
    try {
      const resp = await this.authService.me().catch(() => null);
      if (resp?.success && resp.data) {
        const d = resp.data;
        this.userName = `${d.nombre ?? ''} ${d.apellido ?? ''}`.trim() || 'Admin';
        this.userRol = d.rol ?? 'Administrador';
      }
    } catch (_) {}
  }

  get userInitials(): string {
    return this.userName
      .split(' ')
      .slice(0, 2)
      .map(w => w[0] ?? '')
      .join('')
      .toUpperCase();
  }

  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
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
