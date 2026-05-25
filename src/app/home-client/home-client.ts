import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header-client/header-client';     
import { SidebarClientComponent } from '../sidebar-client/sidebar-client';


@Component({
  selector: 'app-home-client',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, SidebarClientComponent],
  templateUrl: './home-client.html',
  styleUrls: ['./home-client.css']
})
export class HomeClientComponent {
  sidebarCollapsed = false;

  toggleSidebar(collapsed?: boolean) {
    this.sidebarCollapsed = typeof collapsed === 'boolean'
      ? collapsed
      : !this.sidebarCollapsed;
  }
}