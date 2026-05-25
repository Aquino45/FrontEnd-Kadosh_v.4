import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header-admin/header-admin';     
import { SidebarAdminComponent } from '../sidebar-admin/sidebar-admin';


@Component({
  selector: 'app-home-admin',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidebarAdminComponent],
  templateUrl: './home-admin.html',
  styleUrls: ['./home-admin.css']
})
export class HomeAdminComponent {
  sidebarCollapsed = false;

  toggleSidebar(collapsed?: boolean) {
    this.sidebarCollapsed = typeof collapsed === 'boolean'
      ? collapsed
      : !this.sidebarCollapsed;
  }
}